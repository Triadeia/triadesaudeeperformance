import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { downloadDriveFile, getValidAccessToken } from "@/lib/google/integration";

export const runtime = "nodejs";

const MAX_SIZE = 200 * 1024 * 1024; // 200 MB

const ALLOWED_MIME_PREFIXES = ["audio/", "video/"];
const ALLOWED_MIME_EXACT = new Set<string>([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/html",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function isAllowedMime(mime: string) {
  if (ALLOWED_MIME_EXACT.has(mime)) return true;
  return ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params;

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data") && !contentType.includes("application/json")) {
    return NextResponse.json(
      { error: "Envie multipart/form-data (file) ou application/json (googleDriveFileId)." },
      { status: 415 },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ uploaded: true, mode: "demo" });
  }

  const supabase = await createClient();
  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select("id, organization_id, status")
    .eq("id", id)
    .single();
  if (meetingError || !meeting) {
    return NextResponse.json({ error: "Reunião não encontrada." }, { status: 404 });
  }

  let filename: string;
  let mimeType: string;
  let buffer: Buffer;
  let source: "upload" | "google_drive" = "upload";
  let sourceRef: string | null = null;

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as {
      googleDriveFileId?: string;
      filename?: string;
    };
    if (!body.googleDriveFileId) {
      return NextResponse.json({ error: "googleDriveFileId obrigatório." }, { status: 422 });
    }
    let accessToken: string;
    try {
      accessToken = await getValidAccessToken(session.id);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Google não conectado." },
        { status: 412 },
      );
    }
    try {
      const drive = await downloadDriveFile(accessToken, body.googleDriveFileId);
      buffer = drive.buffer;
      mimeType = drive.mime;
      filename = body.filename || `drive-${body.googleDriveFileId}`;
      source = "google_drive";
      sourceRef = body.googleDriveFileId;
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Falha ao baixar do Drive." },
        { status: 502 },
      );
    }
  } else {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo obrigatório (campo 'file')." }, { status: 422 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Arquivo acima de 200 MB." }, { status: 413 });
    }
    if (!isAllowedMime(file.type || "")) {
      return NextResponse.json(
        { error: `Tipo MIME não permitido: ${file.type || "desconhecido"}.` },
        { status: 415 },
      );
    }
    buffer = Buffer.from(await file.arrayBuffer());
    filename = file.name;
    mimeType = file.type;
  }

  if (buffer.length > MAX_SIZE) {
    return NextResponse.json({ error: "Conteúdo acima de 200 MB." }, { status: 413 });
  }

  const safeName = filename.normalize("NFKD").replace(/[^\w.-]+/g, "-").toLowerCase();
  const storagePath = `${meeting.organization_id}/meetings/${meeting.id}/${randomUUID()}-${safeName}`;

  const { error: storageError } = await supabase.storage
    .from("organization-files")
    .upload(storagePath, buffer, { contentType: mimeType, upsert: false });
  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 400 });
  }

  const { data: attachment, error: attachmentError } = await supabase
    .from("meeting_attachments")
    .insert({
      meeting_id: meeting.id,
      organization_id: meeting.organization_id,
      filename,
      mime_type: mimeType,
      size: buffer.length,
      storage_path: storagePath,
      source,
      source_ref: sourceRef,
      processing_status: "pending",
      uploaded_by: session.id,
    })
    .select("id, filename, mime_type, size, processing_status, source")
    .single();

  if (attachmentError) {
    await supabase.storage.from("organization-files").remove([storagePath]);
    return NextResponse.json({ error: attachmentError.message }, { status: 400 });
  }

  // Bump the meeting to "recorded" as soon as we have a real attachment.
  if (meeting.status === "draft") {
    await supabase.from("meetings").update({ status: "recorded" }).eq("id", meeting.id);
  }

  return NextResponse.json({
    id: attachment.id,
    filename: attachment.filename,
    size: attachment.size,
    mime_type: attachment.mime_type,
    status: attachment.processing_status,
    checksum: createHash("sha256").update(buffer).digest("hex"),
  });
}
