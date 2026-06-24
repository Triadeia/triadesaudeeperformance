import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { generateMeetingIntelligence } from "@/lib/ai/meeting-intelligence";
import { dispatchN8nEvent } from "@/lib/n8n";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const allowedRoles = new Set(["owner", "admin", "manager"]);

const inputSchema = z.object({
  meeting_id: z.string().uuid(),
  transcription_id: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!allowedRoles.has(session.role)) {
    return NextResponse.json({ error: "Sem permissão para analisar reuniões." }, { status: 403 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido.", issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const { meeting_id, transcription_id } = parsed.data;

  if (!isSupabaseConfigured()) {
    const intelligence = await generateMeetingIntelligence({
      title: "Reunião demo",
      transcript: "Conteúdo simulado para ambiente sem Supabase.",
    });
    return NextResponse.json({
      status: "analyzed",
      mode: "demo",
      summary: intelligence.result.executiveSummary,
      decisions: intelligence.result.decisions,
      insights: intelligence.result,
    });
  }

  const supabase = await createClient();
  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select(
      `id, organization_id, title,
       meeting_transcriptions(id, text, created_at)`,
    )
    .eq("id", meeting_id)
    .single();
  if (meetingError || !meeting) {
    return NextResponse.json({ error: "Reunião não encontrada." }, { status: 404 });
  }

  const transcriptionRows = Array.isArray(meeting.meeting_transcriptions)
    ? meeting.meeting_transcriptions
    : meeting.meeting_transcriptions
    ? [meeting.meeting_transcriptions]
    : [];

  const selected = transcription_id
    ? transcriptionRows.find((row) => row.id === transcription_id)
    : transcriptionRows.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0];

  const transcript = (selected?.text || "").trim();
  if (!transcript) {
    return NextResponse.json(
      { error: "Nenhuma transcrição disponível. Rode /api/transcribe primeiro." },
      { status: 422 },
    );
  }

  await supabase.from("meetings").update({ status: "analyzing" }).eq("id", meeting.id);

  try {
    const generated = await generateMeetingIntelligence({
      title: meeting.title,
      transcript,
    });
    const intelligence = generated.result;

    const { error: summaryError } = await supabase
      .from("meeting_summaries")
      .upsert(
        {
          meeting_id: meeting.id,
          organization_id: meeting.organization_id,
          executive_summary: intelligence.executiveSummary,
          strategic_summary: intelligence.strategicSummary,
          next_steps: intelligence.nextSteps,
          next_agenda: intelligence.nextAgenda,
          product_insights: intelligence.productInsights,
          marketing_insights: intelligence.marketingInsights,
          operations_insights: intelligence.operationsInsights,
          pending_questions: intelligence.pendingQuestions,
          model: generated.model,
          prompt_version: "meeting-intelligence-v1",
        },
        { onConflict: "meeting_id" },
      );
    if (summaryError) throw summaryError;

    await Promise.all([
      supabase.from("meeting_decisions").delete().eq("meeting_id", meeting.id),
      supabase.from("meeting_insights").delete().eq("meeting_id", meeting.id),
    ]);

    const decisions = intelligence.decisions.map((decision) => ({
      meeting_id: meeting.id,
      organization_id: meeting.organization_id,
      title: decision.title,
      description: decision.description,
      status: "open",
    }));

    const insights = [
      ...intelligence.risks.map((risk) => ({
        meeting_id: meeting.id,
        organization_id: meeting.organization_id,
        kind: "risk" as const,
        title: risk.title,
        description: risk.description,
        severity: risk.severity,
        priority:
          risk.severity === "critical" || risk.severity === "high"
            ? "high"
            : risk.severity === "medium"
            ? "medium"
            : "low",
      })),
      ...intelligence.opportunities.map((opp) => ({
        meeting_id: meeting.id,
        organization_id: meeting.organization_id,
        kind: "opportunity" as const,
        title: opp.title,
        description: opp.description,
        severity: null,
        priority: "medium" as const,
      })),
      ...intelligence.nextSteps.map((step) => ({
        meeting_id: meeting.id,
        organization_id: meeting.organization_id,
        kind: "action" as const,
        title: step,
        description: "",
        severity: null,
        priority: "medium" as const,
      })),
    ];

    if (decisions.length) await supabase.from("meeting_decisions").insert(decisions).throwOnError();
    if (insights.length) await supabase.from("meeting_insights").insert(insights).throwOnError();

    await supabase.from("meetings").update({ status: "analyzed" }).eq("id", meeting.id);

    const automation = await dispatchN8nEvent("meeting.analyzed", {
      meetingId: meeting.id,
      organizationId: meeting.organization_id,
      decisionCount: decisions.length,
      insightCount: insights.length,
    }).catch(() => ({ dispatched: false, reason: "request_failed" as const }));

    return NextResponse.json({
      status: "analyzed",
      summary: {
        executive: intelligence.executiveSummary,
        strategic: intelligence.strategicSummary,
        next_steps: intelligence.nextSteps,
      },
      decisions,
      insights,
      automation,
    });
  } catch (error) {
    await supabase.from("meetings").update({ status: "error" }).eq("id", meeting.id);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao analisar reunião." },
      { status: 500 },
    );
  }
}
