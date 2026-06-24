"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, FileUp, Link2, Loader2, X, Cloud } from "lucide-react";
import { z } from "zod";

type Mode = "upload" | "link" | "drive";

const titleSchema = z.string().min(3, "Informe um título com pelo menos 3 caracteres.").max(220);

type DriveFile = {
  id: string;
  name: string;
  mime_type: string;
  modified_time: string | null;
  size: number | null;
};

export function NewMeetingDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("upload");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [driveFiles, setDriveFiles] = useState<DriveFile[] | null>(null);
  const [driveFileId, setDriveFileId] = useState<string | null>(null);
  const [driveSearch, setDriveSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    if (busy) return;
    setOpen(false);
    setMode("upload");
    setTitle("");
    setDescription("");
    setFile(null);
    setLink("");
    setDriveFiles(null);
    setDriveFileId(null);
    setError(null);
  }, [busy]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    closeButtonRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  async function loadDriveFiles(search?: string) {
    setError(null);
    setDriveFiles(null);
    try {
      const url = new URL("/api/google/files", window.location.origin);
      if (search) url.searchParams.set("q", search);
      const response = await fetch(url, { headers: { accept: "application/json" } });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Falha ao listar Drive.");
      setDriveFiles(json.files ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao listar Drive.");
    }
  }

  async function submit() {
    setError(null);
    const titleResult = titleSchema.safeParse(title.trim());
    if (!titleResult.success) {
      setError(titleResult.error.issues[0]?.message ?? "Título inválido.");
      return;
    }

    if (mode === "upload" && !file) {
      setError("Selecione um arquivo para enviar.");
      return;
    }
    if (mode === "link" && !link.trim()) {
      setError("Cole um link válido (YouTube, Drive, etc.).");
      return;
    }
    if (mode === "drive" && !driveFileId) {
      setError("Escolha um arquivo do Google Drive.");
      return;
    }

    setBusy(true);
    try {
      const createPayload: Record<string, unknown> = {
        title: titleResult.data,
        description: description || null,
      };
      if (mode === "link") {
        createPayload.source = link.includes("youtube") ? "youtube" : "link";
        createPayload.source_ref = link.trim();
      }

      const createResponse = await fetch("/api/reunioes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(createPayload),
      });
      const created = await createResponse.json();
      if (!createResponse.ok) {
        throw new Error(created.error || "Falha ao criar reunião.");
      }
      const meetingId: string = created.meeting?.id ?? created.id;
      if (!meetingId) throw new Error("Reunião criada sem id.");

      if (mode === "upload" && file) {
        const form = new FormData();
        form.set("file", file);
        const uploadResponse = await fetch(`/api/reunioes/${meetingId}/upload`, {
          method: "POST",
          body: form,
        });
        const uploaded = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploaded.error || "Upload falhou.");
      } else if (mode === "drive" && driveFileId) {
        const uploadResponse = await fetch(`/api/reunioes/${meetingId}/upload`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ googleDriveFileId: driveFileId }),
        });
        const uploaded = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploaded.error || "Importação do Drive falhou.");
      }

      router.push(`/app/reunioes/${meetingId}`);
      router.refresh();
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar reunião.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 items-center gap-2 rounded-xl bg-[var(--navy)] px-4 text-sm font-bold text-white"
      >
        <CalendarPlus className="size-4" />
        Nova reunião
      </button>
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-meeting-title"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4"
        >
          <div className="relative max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">
                  Nova captura
                </p>
                <h2 id="new-meeting-title" className="font-heading text-xl font-semibold">
                  Criar reunião
                </h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={close}
                aria-label="Fechar"
                className="grid size-10 place-items-center rounded-full hover:bg-slate-100"
                disabled={busy}
              >
                <X className="size-5" />
              </button>
            </header>

            <div className="max-h-[72vh] space-y-5 overflow-y-auto px-6 py-5">
              <div>
                <label htmlFor="meeting-title" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Título
                </label>
                <input
                  id="meeting-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-400"
                  placeholder="Ex: Diretoria 23/06"
                />
              </div>
              <div>
                <label htmlFor="meeting-description" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Descrição (opcional)
                </label>
                <textarea
                  id="meeting-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-400"
                />
              </div>

              <div className="flex gap-2">
                <ModeButton active={mode === "upload"} icon={FileUp} label="Upload" onClick={() => setMode("upload")} />
                <ModeButton active={mode === "link"} icon={Link2} label="Link / YouTube" onClick={() => setMode("link")} />
                <ModeButton
                  active={mode === "drive"}
                  icon={Cloud}
                  label="Google Drive"
                  onClick={() => {
                    setMode("drive");
                    if (driveFiles === null) void loadDriveFiles();
                  }}
                />
              </div>

              {mode === "upload" ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center">
                  <input
                    id="meeting-file"
                    type="file"
                    accept="audio/*,video/*,application/pdf,text/plain,.docx"
                    className="hidden"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  />
                  <label
                    htmlFor="meeting-file"
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--navy)] px-4 text-sm font-bold text-white"
                  >
                    <FileUp className="size-4" />
                    {file ? "Trocar arquivo" : "Selecionar arquivo"}
                  </label>
                  <p className="mt-3 text-xs text-slate-500">
                    {file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB` : "Áudio, vídeo, PDF, DOCX ou TXT até 200 MB."}
                  </p>
                </div>
              ) : null}

              {mode === "link" ? (
                <div>
                  <label htmlFor="meeting-link" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    URL do conteúdo
                  </label>
                  <input
                    id="meeting-link"
                    value={link}
                    onChange={(event) => setLink(event.target.value)}
                    placeholder="https://youtu.be/... ou https://drive.google.com/..."
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-400"
                  />
                </div>
              ) : null}

              {mode === "drive" ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      value={driveSearch}
                      onChange={(event) => setDriveSearch(event.target.value)}
                      placeholder="Buscar no Drive..."
                      className="h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-400"
                    />
                    <button
                      type="button"
                      onClick={() => void loadDriveFiles(driveSearch.trim() || undefined)}
                      className="h-11 rounded-xl bg-[var(--navy)] px-4 text-sm font-bold text-white"
                    >
                      Buscar
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-100">
                    {driveFiles === null ? (
                      <p className="p-4 text-sm text-slate-500">Carregando arquivos do Drive...</p>
                    ) : driveFiles.length === 0 ? (
                      <p className="p-4 text-sm text-slate-500">Nenhum arquivo encontrado.</p>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {driveFiles.map((driveFile) => (
                          <li key={driveFile.id}>
                            <button
                              type="button"
                              onClick={() => setDriveFileId(driveFile.id)}
                              className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition hover:bg-emerald-50/40 ${
                                driveFileId === driveFile.id ? "bg-emerald-50" : ""
                              }`}
                            >
                              <span className="min-w-0">
                                <span className="block truncate font-semibold">{driveFile.name}</span>
                                <span className="block text-xs text-slate-500">{driveFile.mime_type}</span>
                              </span>
                              <span className="text-xs text-slate-400">
                                {driveFile.size ? `${(driveFile.size / 1024).toFixed(0)} KB` : "—"}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ) : null}

              {error ? (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              ) : null}
            </div>

            <footer className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={busy}
                className="flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <CalendarPlus className="size-4" />}
                {busy ? "Criando..." : "Criar reunião"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ModeButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border text-sm font-bold ${
        active
          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
