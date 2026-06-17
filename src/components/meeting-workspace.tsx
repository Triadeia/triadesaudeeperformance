"use client";

import { useState } from "react";
import { Bot, CheckCircle2, FileUp, ListChecks, Send, Sparkles } from "lucide-react";
import { Badge } from "@/components/page-parts";

type Meeting = {
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

const tabs = ["Visão Geral", "Transcrição", "Resumo Estratégico", "Decisões", "Tarefas", "Riscos", "Oportunidades", "Anexos", "Chat da Reunião"];

export function MeetingWorkspace({ meeting }: { meeting: Meeting }) {
  const [tab, setTab] = useState("Visão Geral");
  const [transcript, setTranscript] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function saveTranscript() {
    setLoading(true);
    setNotice("");
    const response = await fetch(`/api/meetings/${meeting.id}/transcript`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: transcript }),
    });
    const result = await response.json();
    setNotice(response.ok ? "Transcrição salva com segurança." : result.error);
    setLoading(false);
  }

  async function processMeeting() {
    setLoading(true);
    setNotice("");
    const response = await fetch(`/api/meetings/${meeting.id}/process`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: meeting.title, transcript }),
    });
    const result = await response.json();
    setNotice(response.ok
      ? "Inteligência gerada, decisões registradas e tarefas propostas."
      : result.error);
    setLoading(false);
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex gap-2">{meeting.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div>
          <h1 className="font-heading text-3xl font-semibold">{meeting.title}</h1>
          <p className="mt-2 text-sm text-slate-500">{meeting.date} às {meeting.time} · {meeting.participants.join(", ")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button disabled={loading} onClick={processMeeting} className="flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-60"><Sparkles className="size-4" />{loading ? "Processando..." : "Gerar inteligência"}</button>
          <button className="flex h-10 items-center gap-2 rounded-xl bg-[var(--navy)] px-4 text-sm font-bold text-white"><ListChecks className="size-4" />Gerar tarefas</button>
        </div>
      </div>
      {notice ? <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"><CheckCircle2 className="size-5" />{notice}</div> : null}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold ${tab === item ? "bg-[var(--navy)] text-white" : "border border-[var(--border)] bg-white text-slate-600"}`}>{item}</button>)}
      </div>

      {tab === "Visão Geral" ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <article className="panel p-6"><p className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">Resumo executivo</p><p className="mt-4 leading-7 text-slate-700">{meeting.summary}</p></article>
            <article className="panel p-6"><p className="text-xs font-extrabold uppercase tracking-wider text-blue-700">Leitura estratégica</p><p className="mt-4 leading-7 text-slate-700">{meeting.strategic}</p></article>
          </div>
          <div className="space-y-6">
            <ListPanel title="Decisões tomadas" items={meeting.decisions} tone="green" />
            <ListPanel title="Riscos identificados" items={meeting.risks} tone="red" />
            <ListPanel title="Oportunidades" items={meeting.opportunities} tone="blue" />
          </div>
        </div>
      ) : null}

      {tab === "Transcrição" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="panel p-6"><h2 className="font-heading text-xl font-semibold">Adicionar transcrição</h2><p className="mt-2 text-sm text-slate-500">Cole o conteúdo ou envie um arquivo de até 20 MB.</p><textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} className="mt-5 min-h-72 w-full rounded-2xl border border-[var(--border)] p-4 text-sm outline-none focus:border-emerald-400" placeholder="Cole a transcrição completa aqui..." /><button disabled={loading} onClick={saveTranscript} className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--navy)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"><FileUp className="size-4" />Salvar transcrição</button></div>
          <div className="panel p-6"><h2 className="font-heading text-xl font-semibold">Importar por link</h2><p className="mt-2 text-sm text-slate-500">Google Docs, Drive ou arquivo público. Links privados exigem OAuth.</p><input className="mt-5 h-12 w-full rounded-xl border border-[var(--border)] px-4 text-sm outline-none focus:border-emerald-400" placeholder="https://docs.google.com/..." /><button className="mt-4 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white">Tentar importar</button></div>
        </div>
      ) : null}

      {tab === "Chat da Reunião" ? (
        <div className="panel mx-auto max-w-4xl overflow-hidden">
          <div className="border-b border-[var(--border)] p-5"><h2 className="flex items-center gap-2 font-heading font-semibold"><Bot className="text-emerald-600" />Chat da Reunião</h2></div>
          <div className="min-h-80 p-6"><div className="max-w-xl rounded-2xl bg-slate-100 p-4 text-sm leading-6">Posso responder sobre decisões, riscos e próximos passos usando apenas o contexto desta reunião.</div></div>
          <div className="flex gap-2 border-t border-[var(--border)] p-4"><input className="h-11 flex-1 rounded-xl border border-[var(--border)] px-4 text-sm" placeholder="Pergunte sobre a reunião..." /><button className="grid size-11 place-items-center rounded-xl bg-[var(--navy)] text-white"><Send className="size-4" /></button></div>
        </div>
      ) : null}

      {!["Visão Geral", "Transcrição", "Chat da Reunião"].includes(tab) ? <ListPanel title={tab} items={tab === "Decisões" ? meeting.decisions : tab === "Riscos" ? meeting.risks : tab === "Oportunidades" ? meeting.opportunities : ["Conteúdo relacionado pronto para ser conectado ao banco de dados."]} tone={tab === "Riscos" ? "red" : "green"} /> : null}
    </div>
  );
}

function ListPanel({ title, items, tone }: { title: string; items: string[]; tone: "green" | "red" | "blue" }) {
  const colors = { green: "bg-emerald-500", red: "bg-red-500", blue: "bg-blue-500" };
  return <section className="panel p-5"><h2 className="font-heading font-semibold">{title}</h2><ul className="mt-4 space-y-3">{items.map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-slate-600"><span className={`mt-2 size-2 shrink-0 rounded-full ${colors[tone]}`} />{item}</li>)}</ul></section>;
}
