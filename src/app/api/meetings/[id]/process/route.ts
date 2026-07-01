import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { generateMeetingIntelligence } from "@/lib/ai/meeting-intelligence";
import { dispatchN8nEvent } from "@/lib/n8n";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const allowedRoles = new Set(["owner", "admin", "manager"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!allowedRoles.has(session.role)) {
    return NextResponse.json({ error: "Sem permissão para processar reuniões." }, { status: 403 });
  }

  const { id } = await params;
  if (!isSupabaseConfigured()) {
    const body = await request.json().catch(() => ({}));
    const generated = await generateMeetingIntelligence({
      title: String(body.title || "Reunião Triade TSP"),
      transcript: String(body.transcript || ""),
    });
    return NextResponse.json({ intelligence: generated.result, mode: "demo" });
  }

  const supabase = await createClient();
  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select("id, organization_id, title, meeting_transcripts(content)")
    .eq("id", id)
    .single();

  if (meetingError || !meeting) {
    return NextResponse.json({ error: "Reunião não encontrada." }, { status: 404 });
  }

  const transcripts = Array.isArray(meeting.meeting_transcripts)
    ? meeting.meeting_transcripts
    : [meeting.meeting_transcripts];
  const transcript = transcripts
    .map((item) => item?.content)
    .filter(Boolean)
    .join("\n\n");
  if (!transcript.trim()) {
    return NextResponse.json({ error: "Adicione uma transcrição antes de gerar a inteligência." }, { status: 422 });
  }

  await supabase.from("meetings").update({ status: "processing" }).eq("id", id);

  try {
    const generated = await generateMeetingIntelligence({ title: meeting.title, transcript });
    const intelligence = generated.result;

    const { error: summaryError } = await supabase.from("meeting_summaries").upsert({
      organization_id: meeting.organization_id,
      meeting_id: id,
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
    }, { onConflict: "meeting_id" });
    if (summaryError) throw summaryError;

    await Promise.all([
      supabase.from("meeting_decisions").delete().eq("meeting_id", id),
      supabase.from("meeting_insights").delete().eq("meeting_id", id),
    ]);

    const decisions = intelligence.decisions.map((item) => ({
      organization_id: meeting.organization_id,
      meeting_id: id,
      title: item.title,
      description: item.description,
    }));
    const insights = [
      ...intelligence.risks.map((item) => ({
        organization_id: meeting.organization_id,
        meeting_id: id,
        kind: "risk",
        title: item.title,
        description: item.description,
        severity: item.severity,
      })),
      ...intelligence.opportunities.map((item) => ({
        organization_id: meeting.organization_id,
        meeting_id: id,
        kind: "opportunity",
        title: item.title,
        description: item.description,
        severity: null,
      })),
    ];
    const tasks = intelligence.tasks.map((item) => ({
      organization_id: meeting.organization_id,
      meeting_id: id,
      title: item.title,
      description: item.description,
      priority: item.priority,
      area: item.area,
      status: "todo",
      creator_id: session.id,
      user_id: session.id,
      ai_score: 70,
      workspace_meta: {
        source: "meeting",
        source_kind: "action",
        meeting_title: meeting.title,
      },
    }));

    if (decisions.length) await supabase.from("meeting_decisions").insert(decisions).throwOnError();
    if (insights.length) await supabase.from("meeting_insights").insert(insights).throwOnError();
    if (tasks.length) await supabase.from("tasks").insert(tasks).throwOnError();

    await supabase.from("ai_outputs").insert({
      organization_id: meeting.organization_id,
      meeting_id: id,
      operation: "meeting_intelligence",
      provider: generated.provider,
      model: generated.model,
      prompt_version: "meeting-intelligence-v1",
      input_hash: generated.inputHash,
      output: intelligence,
      tokens_input: generated.usage.inputTokens,
      tokens_output: generated.usage.outputTokens,
      latency_ms: generated.latencyMs,
      created_by: session.id,
    }).throwOnError();
    await supabase.from("meetings").update({ status: "processed" }).eq("id", id).throwOnError();

    const automation = await dispatchN8nEvent("meeting.processed", {
      meetingId: id,
      organizationId: meeting.organization_id,
      taskCount: tasks.length,
    }).catch(() => ({ dispatched: false, reason: "request_failed" as const }));

    return NextResponse.json({ intelligence, automation });
  } catch (error) {
    await supabase.from("meetings").update({ status: "review" }).eq("id", id);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Falha ao processar reunião.",
    }, { status: 500 });
  }
}
