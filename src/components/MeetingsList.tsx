"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  FileEdit,
  Mic,
  Search,
  Sparkles,
  UploadCloud,
  Users,
} from "lucide-react";
import { Badge, PageHeader } from "@/components/page-parts";
import { NewMeetingDialog } from "@/components/new-meeting-dialog";

type Meeting = {
  id: string;
  title: string;
  starts_at: string;
  status: "draft" | "uploading" | "transcribing" | "processing" | "ready" | "error";
  tags?: string[];
  meeting_participants?: Array<{ display_name?: string; email?: string }>;
  stats?: { decisions: number; actionItems: number };
};

let storageRevision = 0;
const storageListeners = new Set<() => void>();

function notifyStorageChange() {
  storageRevision += 1;
  for (const listener of storageListeners) listener();
}

function subscribeStorage(listener: () => void) {
  storageListeners.add(listener);
  return () => storageListeners.delete(listener);
}

export function MeetingsList() {
  const revision = useSyncExternalStore(subscribeStorage, () => storageRevision, () => 0);
  const hydrated = revision > 0;

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState<"table" | "cards">("table");

  useEffect(() => {
    if (storageRevision === 0) notifyStorageChange();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    (async () => {
      try {
        const params = new URLSearchParams();
        if (statusFilter !== "all") params.append("status", statusFilter);
        if (searchTerm) params.append("search", searchTerm);
        const res = await fetch(`/api/reunioes?${params}`);
        if (!res.ok) throw new Error("Falha ao carregar");
        const data = await res.json();
        setMeetings(data.meetings || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [hydrated, statusFilter, searchTerm]);

  const statusMap = {
    draft: { badge: "slate", icon: FileEdit, label: "Rascunho" },
    uploading: { badge: "amber", icon: UploadCloud, label: "Enviando" },
    transcribing: { badge: "blue", icon: Mic, label: "Transcrevendo" },
    processing: { badge: "blue", icon: Sparkles, label: "Processando IA" },
    ready: { badge: "green", icon: CheckCircle2, label: "Processada" },
    error: { badge: "red", icon: AlertTriangle, label: "Erro" },
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  if (!hydrated) return <div className="rounded-2xl border border-[var(--border)] bg-white p-10 text-center text-sm text-slate-400">Carregando…</div>;

  if (meetings.length === 0 && !isLoading)
    return (
      <div>
        <PageHeader eyebrow="Memória da empresa" title="Reuniões" description="Centralize transcrições, decisões e planos de ação." />
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 py-16 text-center">
          <div className="mb-4 text-4xl">🎙️</div>
          <h3 className="mb-2 text-lg font-bold text-slate-700">Nenhuma reunião registrada.</h3>
          <p className="mb-6 text-slate-600">Capture a primeira para que a Triade comece a aprender com seu time.</p>
        </div>
        <div className="mt-6 flex justify-center">
          <NewMeetingDialog />
        </div>
      </div>
    );

  return (
    <div>
      <PageHeader eyebrow="Memória da empresa" title="Reuniões" description="Centralize transcrições, decisões e planos de ação." />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-3 size-4 text-slate-400" />
          <input type="text" placeholder="Buscar reunião..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--border)] bg-white pl-10 pr-4 text-sm outline-none focus:border-emerald-500" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-lg border border-[var(--border)] bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500">
          <option value="all">Status: Todos</option>
          <option value="ready">Processada</option>
          <option value="processing">Processando</option>
          <option value="error">Erro</option>
        </select>
        <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-white p-1">
          <button onClick={() => setView("table")} className={`rounded px-3 py-2 text-xs font-bold ${view === "table" ? "bg-slate-100" : "text-slate-600 hover:bg-slate-50"}`}>Tabela</button>
          <button onClick={() => setView("cards")} className={`rounded px-3 py-2 text-xs font-bold ${view === "cards" ? "bg-slate-100" : "text-slate-600 hover:bg-slate-50"}`}>Cards</button>
        </div>
      </div>
      {isLoading ? (
        <div className="panel space-y-3 p-6">{[...Array(5)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded bg-slate-100" />)}</div>
      ) : view === "table" ? (
        <div className="panel overflow-hidden">
          <div className="hidden grid-cols-[2fr_1fr_1fr_auto] gap-4 border-b border-[var(--border)] bg-slate-50 px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-400 md:grid">
            <span>Reunião</span>
            <span>Participantes</span>
            <span>Data</span>
            <span>Status</span>
          </div>
          {meetings.map((m) => {
            const cfg = statusMap[m.status as keyof typeof statusMap];
            const Icon = cfg.icon;
            return (
              <Link key={m.id} href={`/app/reunioes/${m.id}`} className="grid gap-3 border-b border-slate-100 px-5 py-4 first:border-0 hover:bg-emerald-50/30 md:grid-cols-[2fr_1fr_1fr_auto] md:items-center">
                <div>
                  <p className="font-bold">{m.title}</p>
                  <div className="mt-1 flex gap-2">{(m.tags || []).slice(0, 2).map((t) => <Badge key={t}>{t}</Badge>)}</div>
                </div>
                <span className="hidden text-sm text-slate-500 md:block">{m.meeting_participants?.length || 0} pessoas</span>
                <span className="text-sm text-slate-500">{formatDate(m.starts_at)}</span>
                <Badge tone={cfg.badge as any}><Icon className="size-3" /> {cfg.label}</Badge>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {meetings.map((m) => {
            const cfg = statusMap[m.status as keyof typeof statusMap];
            const Icon = cfg.icon;
            return (
              <Link key={m.id} href={`/app/reunioes/${m.id}`} className="panel group rounded-xl p-5 transition hover:shadow-md">
                <div className="mb-3 flex items-start justify-between">
                  <Badge tone={cfg.badge as any}><Icon className="size-3" /> {cfg.label}</Badge>
                </div>
                <h3 className="font-heading font-semibold text-slate-900 group-hover:text-emerald-700">{m.title}</h3>
                <div className="mt-2 flex items-center gap-3 text-sm text-slate-500">
                  <div className="flex items-center gap-1"><Users className="size-4" /> {m.meeting_participants?.length || 0}</div>
                  <div className="flex items-center gap-1"><CalendarDays className="size-4" /> {formatDate(m.starts_at)}</div>
                </div>
                <div className="mt-3 flex gap-2">{(m.tags || []).slice(0, 2).map((t) => <span key={t} className="text-xs"><Badge tone="slate">{t}</Badge></span>)}</div>
              </Link>
            );
          })}
        </div>
      )}
      <NewMeetingDialog />
    </div>
  );
}
