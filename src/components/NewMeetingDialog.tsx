"use client";

import { useState, useTransition } from "react";
import { CalendarPlus, FileAudio, Link2, Loader2, MonitorPlay, Sparkles, Upload, X } from "lucide-react";

type Mode = "upload" | "link" | "youtube";

export type NewMeetingResult = {
  id: string;
  title: string;
};

export function NewMeetingDialog({
  trigger,
  onCreated,
}: {
  trigger?: React.ReactNode;
  onCreated?: (meeting: NewMeetingResult) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("upload");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingDate, setMeetingDate] = useState(() =>
    new Date().toISOString().slice(0, 16),
  );
  const [participantsRaw, setParticipantsRaw] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setTitle("");
    setDescription("");
    setParticipantsRaw("");
    setExternalUrl("");
    setFile(null);
    setError(null);
    setSuccess(null);
  }

  function close() {
    if (pending) return;
    reset();
    setOpen(false);
  }

  async function submit() {
    setError(null);
    setSuccess(null);
    if (!title.trim()) {
      setError("Informe um título para a reunião.");
      return;
    }
    if (mode !== "upload" && !externalUrl.trim()) {
      setError("Cole o link da reunião antes de continuar.");
      return;
    }
    if (mode === "upload" && !file) {
      setError("Selecione um arquivo para upload.");
      return;
    }

    startTransition(async () => {
      try {
        const createResp = await fetch("/api/reunioes", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || undefined,
            meeting_date: new Date(meetingDate).toISOString(),
            participants: participantsRaw
              .split(/[,;\n]/)
              .map((item) => item.trim())
              .filter(Boolean),
          }),
        });
        const created = await createResp.json();
        if (!createResp.ok) throw new Error(created.error || "Falha ao criar reunião.");
        const meetingId: string = created.id;

        if (mode === "upload" && file) {
          const form = new FormData();
          form.append("file", file);
          const upResp = await fetch(`/api/reunioes/${meetingId}/upload`, {
            method: "POST",
            body: form,
          });
          if (!upResp.ok) {
            const data = await upResp.json().catch(() => ({}));
            throw new Error(data.error || "Upload falhou.");
          }
        } else if (mode === "link" || mode === "youtube") {
          const upResp = await fetch(`/api/reunioes/${meetingId}/upload`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              source: mode === "youtube" ? "youtube" : "link",
              url: externalUrl.trim(),
            }),
          });
          if (!upResp.ok) {
            const data = await upResp.json().catch(() => ({}));
            throw new Error(data.error || "Falha ao registrar link.");
          }
        }

        setSuccess("Reunião criada com sucesso.");
        onCreated?.({ id: meetingId, title: created.title });
        setTimeout(() => {
          close();
        }, 600);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro inesperado.");
      }
    });
  }

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)} className="contents">
          {trigger}
        </span>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex h-11 items-center gap-2 rounded-xl bg-[var(--navy)] px-4 text-sm font-bold text-white"
        >
          <CalendarPlus className="size-4" />
          Nova reunião
        </button>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <div className="panel relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-xl">
            <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
                  Memória da empresa
                </p>
                <h2 className="font-heading text-2xl font-semibold">Nova reunião</h2>
              </div>
              <button
                aria-label="Fechar"
                onClick={close}
                className="grid size-10 place-items-center rounded-xl hover:bg-slate-100"
              >
                <X className="size-5" />
              </button>
            </header>

            <div className="space-y-5 px-6 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Título
                  </span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex.: Sprint review · Movimento Triade"
                    className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] px-3 text-sm outline-none focus:border-emerald-400"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Data
                  </span>
                  <input
                    type="datetime-local"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] px-3 text-sm outline-none focus:border-emerald-400"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Descrição (opcional)
                </span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="mt-2 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-emerald-400"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Participantes (vírgulas ou linhas)
                </span>
                <textarea
                  value={participantsRaw}
                  onChange={(e) => setParticipantsRaw(e.target.value)}
                  rows={2}
                  placeholder="Will, Nilton, Carol"
                  className="mt-2 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-emerald-400"
                />
              </label>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Como você quer trazer o conteúdo?
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <ModeChip active={mode === "upload"} onClick={() => setMode("upload")} icon={Upload} label="Upload" />
                  <ModeChip active={mode === "link"} onClick={() => setMode("link")} icon={Link2} label="Link / Drive" />
                  <ModeChip active={mode === "youtube"} onClick={() => setMode("youtube")} icon={MonitorPlay} label="YouTube" />
                </div>
              </div>

              {mode === "upload" ? (
                <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--border)] bg-slate-50 px-4 py-8 text-sm font-semibold text-slate-600 hover:border-emerald-400 hover:text-emerald-700">
                  <FileAudio className="size-5" />
                  {file ? file.name : "Selecione áudio, vídeo ou transcrição"}
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                    accept="audio/*,video/*,text/plain,application/pdf,.docx,text/html"
                  />
                </label>
              ) : (
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {mode === "youtube" ? "URL do YouTube" : "Link Google Drive / arquivo público"}
                  </span>
                  <input
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder={mode === "youtube" ? "https://youtu.be/..." : "https://drive.google.com/..."}
                    className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] px-3 text-sm outline-none focus:border-emerald-400"
                  />
                </label>
              )}

              {error ? (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>
              ) : null}
              {success ? (
                <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{success}</p>
              ) : null}
            </div>

            <footer className="flex items-center justify-end gap-2 border-t border-[var(--border)] bg-slate-50 px-6 py-4">
              <button
                onClick={close}
                disabled={pending}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={pending}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-60"
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {pending ? "Criando..." : "Criar reunião"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ModeChip({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Upload;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-bold transition ${
        active
          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
          : "border-[var(--border)] bg-white text-slate-600 hover:border-emerald-300"
      }`}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
