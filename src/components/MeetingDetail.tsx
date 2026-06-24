"use client";

import { useState, useTransition } from "react";
import { FileUp, Loader2, MessageSquare, Save } from "lucide-react";
import { Badge } from "@/components/page-parts";
import { AIAnalysisPanel, type AIAnalysisData } from "@/components/AIAnalysisPanel";

type MeetingViewModel = {
  id: string;
  title: string;
  date: string;
  time: string;
  participants: string[];
  status: string;
  tags: string[];
  summary: string;
  strategic: string;
  decisions: string[];
  risks: string[];
  opportunities: string[];
};

const TABS = ["Visão geral", "Transcrição", "Análise IA", "Anexos"] as const;
type Tab = (typeof TABS)[number];

export function MeetingDetail({ meeting }: { meeting: MeetingViewModel }) {
  const [tab, setTab] = useState<Tab>("Visão geral");
  const [transcript, setTranscript] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [analysis] = useState<AIAnalysisData | undefined>(() => ({
    executiveSummary: meeting.summary,
    strategicSummary: meeting.strategic,
    decisions: meeting.decisions.map((title) => ({ title })),
    risks: meeting.risks.map((title) => ({ title, severity: "medium" })),
    opportunities: meeting.opportunities.map((title) => ({ title })),
  }));

  function saveTranscript() {
    setNotice(null);
    startTransition(async () => {
      const resp = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ meetingId: meeting.id, source: "manual", content: transcript }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        setNotice(json.error || "Falha ao salvar transcrição.");
        return;
      }
      setNotice("Transcrição salva com sucesso.");
    });
  }

  return (
    <div>
      <header className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex gap-2">
            {meeting.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
          <h1 className="font-heading text-3xl font-semibold">{meeting.title}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {meeting.date} às {meeting.time} · {meeting.participants.join(", ") || "Sem participantes registrados"}
          </p>
        </div>
        <Badge tone={meeting.status === "Processada" ? "green" : "amber"}>{meeting.status}</Badge>
      </header>

      <nav className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {TABS.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold ${
              tab === item ? "bg-[var(--navy)] text-white" : "border border-[var(--border)] bg-white text-slate-600"
            }`}
          >
            {item}
          </button>
        ))}
      </nav>

      {notice ? (
        <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {notice}
        </div>
      ) : null}

      {tab === "Visão geral" ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <article className="panel p-6">
              <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">Resumo executivo</p>
              <p className="mt-4 leading-7 text-slate-700">{meeting.summary}</p>
            </article>
            <article className="panel p-6">
              <p className="text-xs font-extrabold uppercase tracking-wider text-blue-700">Leitura estratégica</p>
              <p className="mt-4 leading-7 text-slate-700">{meeting.strategic}</p>
            </article>
          </div>
          <div className="space-y-6">
            <ListPanel title="Decisões tomadas" items={meeting.decisions} tone="green" />
            <ListPanel title="Riscos identificados" items={meeting.risks} tone="red" />
            <ListPanel title="Oportunidades" items={meeting.opportunities} tone="blue" />
          </div>
        </div>
      ) : null}

      {tab === "Transcrição" ? (
        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="panel p-6">
            <h2 className="font-heading text-xl font-semibold">Adicionar transcrição</h2>
            <p className="mt-2 text-sm text-slate-500">Cole o conteúdo capturado pela equipe ou anexado a esta reunião.</p>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="mt-5 min-h-80 w-full rounded-2xl border border-[var(--border)] p-4 text-sm outline-none focus:border-emerald-400"
              placeholder="Cole a transcrição completa..."
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={saveTranscript}
                disabled={pending}
                className="flex items-center gap-2 rounded-xl bg-[var(--navy)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Salvar transcrição
              </button>
            </div>
          </div>
          <aside className="panel space-y-3 p-6 text-sm text-slate-600">
            <h3 className="font-heading text-base font-semibold text-slate-800">Dicas</h3>
            <p>1. Salve a transcrição antes de pedir a análise.</p>
            <p>2. Quanto mais limpa a transcrição, melhores as decisões e action items extraídos.</p>
            <p>3. Anexos com áudio/vídeo serão processados automaticamente quando os jobs de transcrição estiverem ativos.</p>
          </aside>
        </section>
      ) : null}

      {tab === "Análise IA" ? <AIAnalysisPanel meetingId={meeting.id} initial={analysis} /> : null}

      {tab === "Anexos" ? <AttachmentsPanel meetingId={meeting.id} /> : null}
    </div>
  );
}

function ListPanel({ title, items, tone }: { title: string; items: string[]; tone: "green" | "red" | "blue" }) {
  const colors = { green: "bg-emerald-500", red: "bg-red-500", blue: "bg-blue-500" };
  return (
    <section className="panel p-5">
      <h2 className="font-heading font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">Sem registros.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-6 text-slate-600">
              <span className={`mt-2 size-2 shrink-0 rounded-full ${colors[tone]}`} />
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AttachmentsPanel({ meetingId }: { meetingId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function upload() {
    if (!file) {
      setMessage("Selecione um arquivo.");
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const form = new FormData();
      form.append("file", file);
      const resp = await fetch(`/api/reunioes/${meetingId}/upload`, { method: "POST", body: form });
      const json = await resp.json();
      if (!resp.ok) {
        setMessage(json.error || "Falha no upload.");
        return;
      }
      setMessage("Arquivo enviado. Processamento iniciado.");
      setFile(null);
    });
  }

  return (
    <section className="panel p-6">
      <h2 className="flex items-center gap-2 font-heading text-xl font-semibold">
        <MessageSquare className="size-5 text-emerald-600" /> Anexar conteúdo
      </h2>
      <p className="mt-2 text-sm text-slate-500">Áudio, vídeo, transcrição ou documento (até 200 MB).</p>
      <label className="mt-5 flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--border)] bg-slate-50 px-4 py-8 text-sm font-semibold text-slate-600 hover:border-emerald-400 hover:text-emerald-700">
        <FileUp className="size-5" />
        {file ? file.name : "Selecionar arquivo"}
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
      </label>
      <button
        onClick={upload}
        disabled={pending}
        className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
        Enviar
      </button>
      {message ? <p className="mt-3 text-sm font-semibold text-slate-600">{message}</p> : null}
    </section>
  );
}
