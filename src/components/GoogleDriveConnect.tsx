"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, FileText, Loader2, LogOut, RefreshCw, Search } from "lucide-react";

type Status = {
  connected: boolean;
  email?: string | null;
  expiresAt?: string | null;
};

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
  iconLink?: string;
};

export function GoogleDriveConnect({ defaultQuery = "" }: { defaultQuery?: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(defaultQuery);

  async function refreshStatus() {
    try {
      const resp = await fetch("/api/google/status");
      const json = (await resp.json()) as Status;
      setStatus(json);
      if (json.connected) await fetchFiles(query);
    } catch {
      setStatus({ connected: false });
    }
  }

  async function fetchFiles(q: string) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", `name contains '${q.replace(/'/g, "")}' and trashed = false`);
      else params.set("q", "trashed = false");
      params.set("pageSize", "15");
      const resp = await fetch(`/api/google/files?${params.toString()}`);
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Falha ao listar arquivos.");
      setFiles(json.files || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  async function disconnect() {
    setLoading(true);
    try {
      await fetch("/api/google/status", { method: "DELETE" });
      setStatus({ connected: false });
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="panel p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">Integração</p>
          <h2 className="font-heading text-2xl font-semibold">Google Drive</h2>
          <p className="mt-1 text-sm text-slate-500">
            Conecte sua conta para importar gravações e transcrições diretamente do Drive.
          </p>
        </div>
        {status?.connected ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="size-4" />
              Conectado{status.email ? ` · ${status.email}` : ""}
            </span>
            <button
              onClick={disconnect}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <LogOut className="size-4" /> Desconectar
            </button>
          </div>
        ) : (
          <a
            href="/api/google/oauth/start"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--navy)] px-4 py-2.5 text-sm font-bold text-white"
          >
            Conectar Google
          </a>
        )}
      </header>

      {status?.connected ? (
        <div className="mt-6 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") fetchFiles(query);
                }}
                placeholder="Buscar arquivos..."
                className="h-10 w-full rounded-xl border border-[var(--border)] pl-9 pr-3 text-sm outline-none focus:border-emerald-400"
              />
            </div>
            <button
              onClick={() => fetchFiles(query)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Atualizar
            </button>
          </div>

          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>
          ) : null}

          <ul className="divide-y divide-slate-100 rounded-2xl border border-[var(--border)] bg-white">
            {files.length === 0 && !loading ? (
              <li className="px-4 py-6 text-center text-sm text-slate-500">Nenhum arquivo encontrado.</li>
            ) : null}
            {files.map((file) => (
              <li key={file.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <FileText className="size-4 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <a
                    href={file.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate font-semibold text-slate-800 hover:text-emerald-700"
                  >
                    {file.name}
                  </a>
                  <p className="truncate text-xs text-slate-500">
                    {file.mimeType} · {file.modifiedTime ? new Date(file.modifiedTime).toLocaleString("pt-BR") : "—"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-slate-50 px-4 py-6 text-sm text-slate-500">
          Conecte sua conta Google para listar e importar conteúdo do Drive sem sair do painel.
        </p>
      )}
    </section>
  );
}
