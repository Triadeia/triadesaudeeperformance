"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/page-parts";
import { AlertTriangle, FileText, Lightbulb, Users, CalendarDays } from "lucide-react";

type Meeting = {
  id: string;
  title: string;
  starts_at: string;
  description?: string;
  status: string;
  meeting_participants?: Array<{ display_name?: string; email?: string }>;
  meeting_attachments?: Array<{ filename: string }>;
};

type Decision = { title: string; description?: string };

export function MeetingDetail({ meetingId }: { meetingId: string }) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [transcript] = useState("");
  const [decisions] = useState<Decision[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/reunioes?id=${meetingId}`);
        if (!res.ok) throw new Error("Falha");
        const data = await res.json();
        const m = data.meetings?.[0];
        if (m) setMeeting(m);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [meetingId]);

  if (isLoading) return <div className="p-10 text-center text-slate-400">Carregando reunião…</div>;
  if (!meeting) return <div className="p-10 text-center text-red-600">Reunião não encontrada</div>;

  const tabs = ["overview", "transcript", "decisions", "insights", "attachments"];
  const tabLabels = { overview: "Visão Geral", transcript: "Transcrição", decisions: "Decisões", insights: "Insights", attachments: "Anexos" };

  return (
    <div className="space-y-6">
      <div className="panel p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{meeting.title}</h1>
            <p className="mt-1 text-sm text-slate-500">{meeting.description}</p>
          </div>
          <Badge tone="green">{meeting.status}</Badge>
        </div>
        <div className="mt-4 flex gap-6 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4" />
            {new Date(meeting.starts_at).toLocaleDateString("pt-BR")}
          </div>
          <div className="flex items-center gap-2">
            <Users className="size-4" />
            {meeting.meeting_participants?.length || 0} participantes
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-[var(--border)]">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${activeTab === tab ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-600 hover:text-slate-900"}`}>
            {tabLabels[tab as keyof typeof tabLabels]}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="panel p-6">
          <h2 className="font-bold mb-3">Participantes</h2>
          <div className="space-y-2">
            {meeting.meeting_participants?.map((p, i) => (
              <div key={i} className="text-sm text-slate-700">
                {p.display_name || p.email}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "transcript" && (
        <div className="panel p-6">
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{transcript || "Transcrição não disponível"}</p>
        </div>
      )}

      {activeTab === "decisions" && (
        <div className="panel p-6 space-y-3">
          {decisions.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma decisão extraída</p>
          ) : (
            decisions.map((d, i) => (
              <div key={i} className="border-l-4 border-emerald-500 pl-4 py-2">
                <p className="font-semibold text-slate-900">{d.title}</p>
                <p className="text-sm text-slate-600 mt-1">{d.description}</p>
                <div className="mt-2"><Badge tone="green">Aberta</Badge></div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "insights" && (
        <div className="panel p-6 space-y-3">
          <div className="flex gap-3 border-l-4 border-red-500 pl-4 py-2">
            <AlertTriangle className="size-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-slate-900">Riscos</p>
              <p className="text-sm text-slate-600 mt-1">Nenhum risco identificado</p>
            </div>
          </div>
          <div className="flex gap-3 border-l-4 border-blue-500 pl-4 py-2">
            <Lightbulb className="size-5 text-blue-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-slate-900">Oportunidades</p>
              <p className="text-sm text-slate-600 mt-1">Nenhuma oportunidade identificada</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "attachments" && (
        <div className="panel p-6">
          {meeting.meeting_attachments?.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum anexo</p>
          ) : (
            <div className="space-y-2">
              {meeting.meeting_attachments?.map((a, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded border border-[var(--border)]">
                  <FileText className="size-4 text-slate-500" />
                  <span className="text-sm">{a.filename}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
