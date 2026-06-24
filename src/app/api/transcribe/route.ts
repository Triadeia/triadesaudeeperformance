import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/transcribe
 * body: { meetingId: string, source?: 'manual' | 'attachment', content?: string, attachmentId?: string }
 *
 * Inicia uma transcrição. Implementação atual:
 *  - Se vier `content` (manual), grava direto em `meeting_transcripts` e marca status completed.
 *  - Se vier `attachmentId`, marca o attachment como `processing` e cria placeholder na fila.
 *  - Sem provider configurado (NEXT WHISPER/Gemini), retorna pending para job externo.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const meetingId = String(body.meetingId || "").trim();
  if (!meetingId) {
    return NextResponse.json({ error: "meetingId obrigatório." }, { status: 400 });
  }

  const source = (body.source as "manual" | "attachment") || "manual";

  if (source === "manual") {
    const content = String(body.content || "").trim();
    if (content.length < 20) {
      return NextResponse.json(
        { error: "Transcrição precisa ter pelo menos 20 caracteres." },
        { status: 422 },
      );
    }
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        status: "completed",
        mode: "demo",
        transcript: { meetingId, content, model: "manual" },
      });
    }
    const supabase = createAdminClient();
    const { data: meeting } = await supabase
      .from("meetings")
      .select("organization_id")
      .eq("id", meetingId)
      .single();
    if (!meeting) return NextResponse.json({ error: "Reunião não encontrada." }, { status: 404 });

    const { error } = await supabase.from("meeting_transcripts").insert({
      organization_id: meeting.organization_id,
      meeting_id: meetingId,
      content,
      mime_type: "text/plain",
      byte_size: Buffer.byteLength(content),
      created_by: session.id,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ status: "completed", source: "manual" });
  }

  const attachmentId = String(body.attachmentId || "").trim();
  if (!attachmentId) {
    return NextResponse.json({ error: "attachmentId obrigatório para fonte attachment." }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ status: "pending", mode: "demo", attachmentId });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("meeting_attachments")
    .update({ status: "processing" })
    .eq("id", attachmentId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Hook para job externo (n8n / worker). Sem provider, devolvemos pending.
  return NextResponse.json({
    status: "pending",
    queued: true,
    attachment: data,
    note: "Configure WHISPER_API_KEY ou GEMINI_API_KEY para transcrição automática.",
  });
}
