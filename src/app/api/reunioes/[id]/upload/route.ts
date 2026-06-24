import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const ALLOWED_MIME = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "text/plain",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/html",
]);

const MAX_BYTES = 200 * 1024 * 1024; // 200 MB

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id: meetingId } = await params;

  let source: "upload" | "google_drive" | "youtube" | "link" = "upload";
  let originUrl: string | null = null;
  let storagePath: string | null = null;
  let filename: string | null = null;
  let mimeType: string | null = null;
  let byteSize: number | null = null;

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo obrigatório." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Arquivo maior que 200 MB." }, { status: 413 });
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: `Tipo não suportado: ${file.type}` }, { status: 415 });
    }
    filename = file.name;
    mimeType = file.type;
    byteSize = file.size;

    if (isSupabaseConfigured() && process.env.SUPABASE_SECRET_KEY) {
      try {
        const supabase = createAdminClient();
        const path = `meetings/${meetingId}/${Date.now()}-${file.name}`;
        const arrayBuf = await file.arrayBuffer();
        const { error: uploadError } = await supabase.storage
          .from("meeting-uploads")
          .upload(path, arrayBuf, { contentType: file.type, upsert: false });
        if (!uploadError) storagePath = path;
      } catch {
        // Storage não obrigatório — seguimos com metadata-only.
      }
    }
  } else {
    const body = await request.json().catch(() => ({}));
    const incomingSource = String(body.source || "link");
    if (incomingSource === "google_drive") source = "google_drive";
    else if (incomingSource === "youtube") source = "youtube";
    else source = "link";

    originUrl = body.url ? String(body.url) : null;
    filename = body.filename ? String(body.filename) : null;
    mimeType = body.mimeType ? String(body.mimeType) : null;
    byteSize = typeof body.byteSize === "number" ? body.byteSize : null;

    if (!originUrl) {
      return NextResponse.json({ error: "URL obrigatória para fontes externas." }, { status: 400 });
    }
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      attachment: {
        meetingId,
        source,
        originUrl,
        storagePath,
        filename,
        mimeType,
        byteSize,
        status: "pending",
      },
      mode: "demo",
    });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("meeting_attachments")
    .insert({
      meeting_id: meetingId,
      uploaded_by: session.id,
      source,
      origin_url: originUrl,
      storage_path: storagePath,
      filename,
      mime_type: mimeType,
      byte_size: byteSize,
      status: "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ attachment: data }, { status: 201 });
}
