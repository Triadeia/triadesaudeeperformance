"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/page-parts";
import { NewMeetingDialog } from "@/components/NewMeetingDialog";
import { CalendarPlus, FileAudio, Sparkles, Users } from "lucide-react";

type MeetingItem = {
  id: string;
  title: string;
  date: string;
  participants: string[];
  status: string;
  tags?: string[];
};

const STATUS_TONE: Record<string, "green" | "amber" | "red" | "blue" | "slate"> = {
  Processada: "green",
  Revisar: "amber",
  processing: "blue",
  pending: "amber",
  failed: "red",
};

export function MeetingsList({ meetings }: { meetings: MeetingItem[] }) {
  const router = useRouter();

  return (
    <div>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {[
          [FileAudio, "Importe a transcrição", "Cole o texto ou envie áudio/vídeo até 200 MB."],
          [Sparkles, "Gere inteligência", "Resumo, decisões, tarefas, riscos e oportunidades."],
          [Users, "Conecte a execução", "Relacione responsáveis, projetos e documentos."],
        ].map(([Icon, title, description]) => {
          const ItemIcon = Icon as typeof FileAudio;
          return (
            <div key={String(title)} className="panel p-5">
              <ItemIcon className="mb-4 size-6 text-emerald-600" />
              <h2 className="font-heading font-semibold">{String(title)}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{String(description)}</p>
            </div>
          );
        })}
      </div>

      <div className="mb-4 flex items-center justify-end">
        <NewMeetingDialog
          trigger={
            <button className="flex h-11 items-center gap-2 rounded-xl bg-[var(--navy)] px-4 text-sm font-bold text-white">
              <CalendarPlus className="size-4" /> Nova reunião
            </button>
          }
          onCreated={(meeting) =>
            router.push(`/app/reunioes/${meeting.id}?title=${encodeURIComponent(meeting.title)}`)
          }
        />
      </div>

      <div className="panel overflow-hidden">
        <div className="grid grid-cols-[1fr_auto] border-b border-[var(--border)] bg-slate-50 px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-400 sm:grid-cols-[1.5fr_0.7fr_0.7fr_auto]">
          <span>Reunião</span>
          <span className="hidden sm:block">Participantes</span>
          <span className="hidden sm:block">Data</span>
          <span>Status</span>
        </div>

        {meetings.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">
            Nenhuma reunião registrada ainda. Clique em <strong>Nova reunião</strong> para começar.
          </div>
        ) : null}

        {meetings.map((meeting) => (
          <Link
            key={meeting.id}
            href={`/app/reunioes/${meeting.id}`}
            className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-slate-100 px-5 py-5 last:border-0 hover:bg-emerald-50/30 sm:grid-cols-[1.5fr_0.7fr_0.7fr_auto]"
          >
            <div>
              <p className="font-bold">{meeting.title}</p>
              <div className="mt-2 flex gap-2">
                {(meeting.tags || []).slice(0, 2).map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
            </div>
            <span className="hidden text-sm text-slate-500 sm:block">
              {meeting.participants.length} pessoas
            </span>
            <span className="hidden text-sm text-slate-500 sm:block">{meeting.date}</span>
            <Badge tone={STATUS_TONE[meeting.status] || "slate"}>{meeting.status}</Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
