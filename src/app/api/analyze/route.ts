import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateMeetingIntelligence } from "@/lib/ai/meeting-intelligence";

/**
 * POST /api/analyze
 * body: { meetingId: string }
 *
 * Atalho que carrega a reunião + transcrição e dispara o pipeline existente
 * de inteligência (já implementado em /api/meetings/[id]/process).
 * Mantém compatibilidade com o blueprint da Fase 2 (POST /api/analyze).
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const meetingId = String(body.meetingId || "").trim();
  if (!meetingId) return NextResponse.json({ error: "meetingId obrigatório." }, { status: 400 });

  if (!isSupabaseConfigured()) {
    const generated = await generateMeetingIntelligence({
      title: String(body.title || "Reunião"),
      transcript: String(body.transcript || ""),
    });
    return NextResponse.json({ intelligence: generated.result, mode: "demo" });
  }

  const supabase = createAdminClient();
  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select("id, organization_id, title, meeting_transcripts(content)")
    .eq("id", meetingId)
    .single();
  if (meetingError || !meeting) {
    return NextResponse.json({ error: "Reunião não encontrada." }, { status: 404 });
  }

  const transcripts = Array.isArray(meeting.meeting_transcripts)
    ? meeting.meeting_transcripts
    : [meeting.meeting_transcripts];
  const transcript = transcripts
    .map((item: { content?: string } | null | undefined) => item?.content)
    .filter(Boolean)
    .join("\n\n");

  if (!transcript.trim()) {
    return NextResponse.json(
      { error: "Adicione uma transcrição antes de analisar." },
      { status: 422 },
    );
  }

  const generated = await generateMeetingIntelligence({
    title: meeting.title,
    transcript,
  });

  // Persist resumo + decisões (mesmo padrão da rota existente, simplificado).
  try {
    await supabase
      .from("meeting_summaries")
      .upsert(
        {
          organization_id: meeting.organization_id,
          meeting_id: meetingId,
          executive_summary: generated.result.executiveSummary,
          strategic_summary: generated.result.strategicSummary,
          next_steps: generated.result.nextSteps,
          next_agenda: generated.result.nextAgenda,
          product_insights: generated.result.productInsights,
          marketing_insights: generated.result.marketingInsights,
          operations_insights: generated.result.operationsInsights,
          pending_questions: generated.result.pendingQuestions,
          model: generated.model,
          prompt_version: "meeting-intelligence-v1",
        },
        { onConflict: "meeting_id" },
      );
  } catch {
    // não bloqueia a resposta — o cliente exibe a análise mesmo se a persistência falhar.
  }

  return NextResponse.json({
    intelligence: generated.result,
    provider: generated.provider,
    model: generated.model,
    latencyMs: generated.latencyMs,
  });
}
