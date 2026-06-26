"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/page-parts";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  FileText,
  Lightbulb,
  ListChecks,
  Loader2,
  Save,
  Sparkles,
  Users,
} from "lucide-react";

type Participant = { display_name?: string | null; email?: string | null };
type Attachment = { filename: string; processing_status?: string | null; source?: string | null };
type Transcript = { id: string; content: string; created_at?: string | null };
type Summary = {
  executive_summary?: string | null;
  strategic_summary?: string | null;
  next_steps?: string[] | null;
};
type Decision = { id?: string; title: string; description?: string | null; status?: string | null };
type Insight = {
  id?: string;
  kind: "risk" | "opportunity" | "action" | "insight" | string;
  title: string;
  description?: string | null;
  severity?: string | null;
  priority?: string | null;
};
type MeetingTask = {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  area?: string | null;
};
type Meeting = {
  id: string;
  title: string;
  starts_at?: string | null;
  description?: string | null;
  status: string;
  meeting_participants?: Participant[];
  meeting_attachments?: Attachment[];
  meeting_transcripts?: Transcript[];
  meeting_summaries?: Summary[];
  meeting_decisions?: Decision[];
  meeting_insights?: Insight[];
  tasks?: MeetingTask[];
};
type GeneratedIntelligence = {
  executiveSummary: string;
  strategicSummary: string;
  decisions: Decision[];
  tasks: Array<{ title: string; description?: string; priority?: string; area?: string }>;
  risks: Array<{ title: string; description?: string; severity?: string }>;
  opportunities: Array<{ title: string; description?: string }>;
  nextSteps: string[];
};

const tabs = ["overview", "transcript", "summary", "decisions", "tasks", "insights", "attachments"] as const;
const tabLabels: Record<(typeof tabs)[number], string> = {
  overview: "Visão Geral",
  transcript: "Transcrição",
  summary: "Resumo Estratégico",
  decisions: "Decisões",
  tasks: "Tarefas",
  insights: "Riscos e Oportunidades",
  attachments: "Anexos",
};

export function MeetingDetail({ meetingId }: { meetingId: string }) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [generated, setGenerated] = useState<GeneratedIntelligence | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("overview");
  const [transcriptDraft, setTranscriptDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/reunioes?id=${meetingId}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Falha ao carregar a reunião.");
    const data = await res.json();
    const loaded = data.meetings?.[0] as Meeting | undefined;
    if (!loaded) throw new Error("Reunião não encontrada.");
    setMeeting(loaded);
    setTranscriptDraft(loaded.meeting_transcripts?.[0]?.content ?? "");
  }, [meetingId]);

  useEffect(() => {
    refresh()
      .catch((error) => setMessage(error instanceof Error ? error.message : "Erro inesperado."))
      .finally(() => setIsLoading(false));
  }, [refresh]);

  const latestSummary = meeting?.meeting_summaries?.[0];
  const decisions = useMemo(
    () => (meeting?.meeting_decisions?.length ? meeting.meeting_decisions : (generated?.decisions ?? [])),
    [generated?.decisions, meeting?.meeting_decisions],
  );
  const tasks = useMemo(
    () =>
      meeting?.tasks?.length
        ? meeting.tasks
        : (generated?.tasks ?? []).map((task, index) => ({
            id: `generated-${index}`,
            title: task.title,
            description: task.description,
            priority: task.priority,
            area: task.area,
          })),
    [generated?.tasks, meeting?.tasks],
  );
  const risks = useMemo(
    () =>
      meeting?.meeting_insights?.filter((item) => item.kind === "risk").length
        ? meeting.meeting_insights.filter((item) => item.kind === "risk")
        : (generated?.risks ?? []).map((risk, index) => ({ id: `risk-${index}`, kind: "risk", ...risk })),
    [generated?.risks, meeting?.meeting_insights],
  );
  const opportunities = useMemo(
    () =>
      meeting?.meeting_insights?.filter((item) => item.kind === "opportunity").length
        ? meeting.meeting_insights.filter((item) => item.kind === "opportunity")
        : (generated?.opportunities ?? []).map((opportunity, index) => ({
            id: `opp-${index}`,
            kind: "opportunity",
            ...opportunity,
          })),
    [generated?.opportunities, meeting?.meeting_insights],
  );

  async function saveTranscript() {
    setMessage(null);
    setIsSaving(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/transcript`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: transcriptDraft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Não foi possível salvar a transcrição.");
      setMessage("Transcrição salva.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro inesperado.");
    } finally {
      setIsSaving(false);
    }
  }

  async function processMeeting(nextTab: (typeof tabs)[number] = "summary") {
    setMessage(null);
    setIsProcessing(true);
    try {
      if (transcriptDraft.trim().length >= 20) {
        await saveTranscript();
      }
      const res = await fetch(`/api/meetings/${meetingId}/process`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: meeting?.title, transcript: transcriptDraft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Não foi possível gerar inteligência.");
      setGenerated(data.intelligence ?? null);
      setMessage("Inteligência gerada e tarefas conectadas.");
      await refresh().catch(() => undefined);
      setActiveTab(nextTab);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro inesperado.");
    } finally {
      setIsProcessing(false);
    }
  }

  if (isLoading) return <div className="p-10 text-center text-slate-400">Carregando reunião...</div>;
  if (!meeting) return <div className="p-10 text-center text-red-600">{message ?? "Reunião não encontrada"}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            {(meeting.meeting_participants ?? []).slice(0, 4).map((participant, index) => (
              <span key={`${participant.email ?? participant.display_name}-${index}`} className="text-xs font-bold text-slate-500">
                {participant.display_name ?? participant.email}
              </span>
            ))}
          </div>
          <h1 className="font-heading text-3xl font-semibold">{meeting.title}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
            <CalendarDays className="size-4" />
            {meeting.starts_at
              ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(meeting.starts_at))
              : "Sem data definida"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={meeting.status === "processed" ? "green" : "amber"}>{meeting.status}</Badge>
          <button
            onClick={() => processMeeting("summary")}
            disabled={isProcessing}
            className="flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-60"
          >
            {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Gerar inteligência
          </button>
          <button
            onClick={() => processMeeting("tasks")}
            disabled={isProcessing}
            className="flex h-10 items-center gap-2 rounded-xl bg-[var(--navy)] px-4 text-sm font-bold text-white disabled:opacity-60"
          >
            <ListChecks className="size-4" />
            Gerar tarefas
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab
                ? "border-[var(--navy)] bg-[var(--navy)] text-white"
                : "border-[var(--border)] bg-white text-slate-600 hover:text-slate-900"
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {message ? <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">{message}</p> : null}

      {activeTab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <InfoPanel title="Resumo executivo">
            {latestSummary?.executive_summary ?? generated?.executiveSummary ?? meeting.description ?? "Adicione transcrição e gere inteligência."}
          </InfoPanel>
          <InfoPanel title="Participantes">
            {(meeting.meeting_participants ?? []).length ? (
              <ul className="space-y-2">
                {meeting.meeting_participants?.map((participant, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Users className="size-4 text-emerald-600" />
                    {participant.display_name ?? participant.email}
                  </li>
                ))}
              </ul>
            ) : (
              "Nenhum participante registrado."
            )}
          </InfoPanel>
        </div>
      ) : null}

      {activeTab === "transcript" ? (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="panel p-6">
            <h2 className="mb-2 text-xl font-bold">Adicionar transcrição</h2>
            <p className="mb-4 text-sm text-slate-500">Cole a transcrição ou conteúdo extraído de PDF, DOCX, TXT ou HTML.</p>
            <textarea
              value={transcriptDraft}
              onChange={(event) => setTranscriptDraft(event.target.value)}
              rows={14}
              placeholder="Cole a transcrição completa aqui..."
              className="w-full rounded-2xl border border-[var(--border)] bg-white p-4 text-sm outline-none focus:border-emerald-400"
            />
            <button
              onClick={saveTranscript}
              disabled={isSaving}
              className="mt-4 flex h-11 items-center gap-2 rounded-xl bg-[var(--navy)] px-4 text-sm font-bold text-white disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Salvar transcrição
            </button>
          </section>
          <InfoPanel title="Fluxo conectado">
            Salve a transcrição, gere inteligência e as tarefas serão criadas no banco para aparecerem em `/app/tarefas`.
          </InfoPanel>
        </div>
      ) : null}

      {activeTab === "summary" ? (
        <div className="space-y-4">
          <InfoPanel title="Resumo estratégico">
            {latestSummary?.strategic_summary ?? generated?.strategicSummary ?? "Gere inteligência para consolidar a leitura estratégica."}
          </InfoPanel>
          <InfoPanel title="Próximos passos">
            <Bullets items={latestSummary?.next_steps ?? generated?.nextSteps ?? []} empty="Nenhum próximo passo gerado." />
          </InfoPanel>
        </div>
      ) : null}

      {activeTab === "decisions" ? (
        <ListPanel
          title="Decisões tomadas"
          items={decisions}
          empty="Nenhuma decisão extraída."
          icon={<CheckCircle2 className="size-4 text-emerald-600" />}
        />
      ) : null}

      {activeTab === "tasks" ? (
        <ListPanel
          title="Tarefas geradas"
          items={tasks}
          empty="Nenhuma tarefa conectada. Gere tarefas a partir da transcrição."
          icon={<ListChecks className="size-4 text-blue-600" />}
        />
      ) : null}

      {activeTab === "insights" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <ListPanel title="Riscos identificados" items={risks} empty="Nenhum risco identificado." icon={<AlertTriangle className="size-4 text-red-500" />} />
          <ListPanel title="Oportunidades" items={opportunities} empty="Nenhuma oportunidade identificada." icon={<Lightbulb className="size-4 text-blue-500" />} />
        </div>
      ) : null}

      {activeTab === "attachments" ? (
        <section className="panel p-6">
          <h2 className="mb-4 text-xl font-bold">Anexos</h2>
          {(meeting.meeting_attachments ?? []).length ? (
            <div className="space-y-2">
              {meeting.meeting_attachments?.map((attachment, index) => (
                <div key={`${attachment.filename}-${index}`} className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3">
                  <span className="flex items-center gap-3 text-sm font-semibold">
                    <FileText className="size-4 text-slate-500" />
                    {attachment.filename}
                  </span>
                  <Badge tone="blue">{attachment.processing_status ?? attachment.source ?? "anexo"}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Nenhum anexo registrado.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}

function InfoPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel p-6">
      <p className="mb-4 text-xs font-extrabold uppercase tracking-wider text-emerald-700">{title}</p>
      <div className="text-sm leading-7 text-slate-700">{children}</div>
    </section>
  );
}

function Bullets({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <p>{empty}</p>;
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-2">
          <span className="mt-2 size-2 rounded-full bg-emerald-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ListPanel({
  title,
  items,
  empty,
  icon,
}: {
  title: string;
  items: Array<{ id?: string; title: string; description?: string | null; priority?: string | null; area?: string | null; status?: string | null }>;
  empty: string;
  icon: React.ReactNode;
}) {
  return (
    <section className="panel p-6">
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      {items.length ? (
        <div className="space-y-2">
          {items.map((item, index) => (
            <article key={item.id ?? `${item.title}-${index}`} className="rounded-xl border border-[var(--border)] bg-white p-4">
              <div className="flex items-start gap-3">
                <span className="mt-1">{icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  {item.description ? <p className="mt-1 text-sm text-slate-500">{item.description}</p> : null}
                </div>
                {item.priority || item.status || item.area ? (
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase text-slate-500">
                    {item.priority ?? item.status ?? item.area}
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">{empty}</p>
      )}
    </section>
  );
}
