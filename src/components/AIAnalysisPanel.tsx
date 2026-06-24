"use client";

import { useState } from "react";
import { AlertTriangle, CheckSquare, Lightbulb, ListChecks, Loader2, Sparkles } from "lucide-react";

export type AIAnalysisData = {
  executiveSummary?: string;
  strategicSummary?: string;
  decisions?: { title: string; description?: string }[];
  tasks?: { title: string; description?: string; priority?: string; area?: string }[];
  risks?: { title: string; description?: string; severity?: string }[];
  opportunities?: { title: string; description?: string }[];
  nextSteps?: string[];
};

const SEVERITY_TONE: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const PRIORITY_TONE: Record<string, string> = {
  urgent: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-slate-100 text-slate-700",
};

export function AIAnalysisPanel({
  meetingId,
  initial,
  showRunButton = true,
}: {
  meetingId: string;
  initial?: AIAnalysisData;
  showRunButton?: boolean;
}) {
  const [data, setData] = useState<AIAnalysisData | undefined>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ meetingId }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Falha na análise.");
      setData(json.intelligence);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar análise.");
    } finally {
      setLoading(false);
    }
  }

  const hasData = Boolean(data && (data.decisions?.length || data.tasks?.length || data.executiveSummary));

  return (
    <section className="panel space-y-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">Inteligência da reunião</p>
          <h2 className="font-heading text-2xl font-semibold">Decisões, tarefas e riscos</h2>
          <p className="mt-1 text-sm text-slate-500">
            Análise gerada a partir da transcrição. Os dados são salvos automaticamente para auditoria.
          </p>
        </div>
        {showRunButton ? (
          <button
            onClick={run}
            disabled={loading}
            className="flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {loading ? "Analisando..." : hasData ? "Reanalisar" : "Analisar agora"}
          </button>
        ) : null}
      </header>

      {error ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
      ) : null}

      {!hasData ? (
        <p className="rounded-2xl border border-dashed border-[var(--border)] bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Ainda não há análise. Adicione uma transcrição e clique em <strong>Analisar agora</strong>.
        </p>
      ) : null}

      {data?.executiveSummary ? (
        <article>
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Resumo executivo</p>
          <p className="mt-2 text-sm leading-7 text-slate-700">{data.executiveSummary}</p>
        </article>
      ) : null}

      {data?.decisions?.length ? (
        <article>
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-700">
            <CheckSquare className="size-4" /> Decisões
          </p>
          <ul className="mt-3 space-y-2">
            {data.decisions.map((decision, idx) => (
              <li key={idx} className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 text-sm">
                <p className="font-semibold text-slate-800">{decision.title}</p>
                {decision.description ? <p className="mt-1 text-slate-600">{decision.description}</p> : null}
              </li>
            ))}
          </ul>
        </article>
      ) : null}

      {data?.tasks?.length ? (
        <article>
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-blue-700">
            <ListChecks className="size-4" /> Action items
          </p>
          <ul className="mt-3 space-y-2">
            {data.tasks.map((task, idx) => (
              <li key={idx} className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-slate-800">{task.title}</p>
                  {task.priority ? (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${PRIORITY_TONE[task.priority] || "bg-slate-100 text-slate-700"}`}>
                      {task.priority}
                    </span>
                  ) : null}
                </div>
                {task.description ? <p className="mt-1 text-slate-600">{task.description}</p> : null}
                {task.area ? <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{task.area}</p> : null}
              </li>
            ))}
          </ul>
        </article>
      ) : null}

      {data?.risks?.length ? (
        <article>
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-red-700">
            <AlertTriangle className="size-4" /> Riscos
          </p>
          <ul className="mt-3 space-y-2">
            {data.risks.map((risk, idx) => (
              <li key={idx} className="rounded-xl border border-red-100 bg-red-50/40 p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-slate-800">{risk.title}</p>
                  {risk.severity ? (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${SEVERITY_TONE[risk.severity] || "bg-slate-100"}`}>
                      {risk.severity}
                    </span>
                  ) : null}
                </div>
                {risk.description ? <p className="mt-1 text-slate-600">{risk.description}</p> : null}
              </li>
            ))}
          </ul>
        </article>
      ) : null}

      {data?.opportunities?.length ? (
        <article>
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-700">
            <Lightbulb className="size-4" /> Oportunidades
          </p>
          <ul className="mt-3 space-y-2">
            {data.opportunities.map((op, idx) => (
              <li key={idx} className="rounded-xl border border-amber-100 bg-amber-50/40 p-3 text-sm">
                <p className="font-semibold text-slate-800">{op.title}</p>
                {op.description ? <p className="mt-1 text-slate-600">{op.description}</p> : null}
              </li>
            ))}
          </ul>
        </article>
      ) : null}
    </section>
  );
}
