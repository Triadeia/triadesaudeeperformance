import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Storage indisponível em modo demo." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", session.id)
    .single();

  if (!profile?.organization_id) {
    return NextResponse.json({ error: "Organização não encontrada." }, { status: 403 });
  }

  const { data: document, error } = await supabase
    .from("documents")
    .select("id, title, storage_path, mime_type, byte_size, organization_id")
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .maybeSingle();

  if (error || !document?.storage_path) {
    return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from("organization-files")
    .createSignedUrl(document.storage_path, 60 * 10);

  if (signedError || !signed?.signedUrl) {
    return NextResponse.json(
      { error: signedError?.message ?? "Falha ao gerar link do arquivo." },
      { status: 400 },
    );
  }

  return NextResponse.redirect(signed.signedUrl, 302);
}
