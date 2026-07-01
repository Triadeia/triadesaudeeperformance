import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const maxSize = 20 * 1024 * 1024;
const allowedTypes = new Set([
  "text/plain",
  "text/html",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
]);
const PRODUCTION_BLOCKED_MESSAGE =
  "O upload foi bloqueado porque as variáveis obrigatórias do Supabase não estão configuradas neste ambiente.";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo obrigatório." }, { status: 422 });
  }
  if (!allowedTypes.has(file.type) || file.size > maxSize) {
    return NextResponse.json({ error: "Tipo não permitido ou arquivo acima de 20 MB." }, { status: 422 });
  }
  if (!isSupabaseConfigured()) return NextResponse.json({ error: PRODUCTION_BLOCKED_MESSAGE }, { status: 503 });

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", session.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Perfil não encontrado." }, { status: 403 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.normalize("NFKD").replace(/[^\w.-]+/g, "-").toLowerCase();
  const storagePath = `${profile.organization_id}/documents/${randomUUID()}-${safeName}`;
  const { error: storageError } = await supabase.storage
    .from("organization-files")
    .upload(storagePath, bytes, { contentType: file.type, upsert: false });
  if (storageError) return NextResponse.json({ error: storageError.message }, { status: 400 });

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .insert({
      organization_id: profile.organization_id,
      title: String(form.get("title") || file.name),
      document_type: String(form.get("documentType") || "document"),
      storage_path: storagePath,
      mime_type: file.type,
      byte_size: file.size,
      checksum: createHash("sha256").update(bytes).digest("hex"),
      created_by: session.id,
    })
    .select("id, title, mime_type, byte_size")
    .single();

  if (documentError) {
    await supabase.storage.from("organization-files").remove([storagePath]);
    return NextResponse.json({ error: documentError.message }, { status: 400 });
  }
  return NextResponse.json({
    uploaded: true,
    documentId: document.id,
    title: document.title,
    mime_type: document.mime_type,
    byte_size: document.byte_size,
  });
}
