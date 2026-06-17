import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const content = String(body.content || "").trim();
  if (content.length < 20) {
    return NextResponse.json({ error: "A transcrição precisa ter pelo menos 20 caracteres." }, { status: 422 });
  }
  if (!isSupabaseConfigured()) return NextResponse.json({ saved: true, mode: "demo" });

  const supabase = await createClient();
  const { data: meeting } = await supabase
    .from("meetings")
    .select("organization_id")
    .eq("id", id)
    .single();
  if (!meeting) return NextResponse.json({ error: "Reunião não encontrada." }, { status: 404 });

  const { error } = await supabase.from("meeting_transcripts").insert({
    organization_id: meeting.organization_id,
    meeting_id: id,
    content,
    mime_type: "text/plain",
    byte_size: Buffer.byteLength(content),
    created_by: session.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ saved: true });
}
