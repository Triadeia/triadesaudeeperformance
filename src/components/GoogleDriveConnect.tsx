"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, LogOut, Search } from "lucide-react";
import { Badge } from "@/components/page-parts";

type GoogleFile = { id: string; name: string; mime_type: string; created_time: string; size?: number };

export function GoogleDriveConnect() {
  const [connected, setConnected] = useState(false);
  const [email, setEmail] = useState("");
  const [files, setFiles] = useState<GoogleFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    try {
      const res = await fetch("/api/google/status");
      if (res.ok) {
        const data = await res.json();
        setConnected(true);
        setEmail(data.email || "");
      }
    } catch (e) {
      setConnected(false);
    }
  }

  async function handleConnect() {
    const res = await fetch("/api/google/oauth/start");
    if (res.ok) {
      const data = await res.json();
      window.location.href = data.authUrl;
    } else {
      setError("Falha ao iniciar autenticação");
    }
  }

  async function handleDisconnect() {
    try {
      await fetch("/api/google/status", { method: "DELETE" });
      setConnected(false);
      setEmail("");
      setFiles([]);
    } catch (e) {
      setError("Falha ao desconectar");
    }
  }

  async function loadFiles() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/google/files");
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (e) {
      setError("Falha ao carregar arquivos");
    } finally {
      setIsLoading(false);
    }
  }

  const filteredFiles = files.filter((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="panel p-6 space-y-6">
      {error && (
        <div className="flex gap-3 rounded-lg bg-red-50 p-4 text-red-900">
          <AlertCircle className="size-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <h2 className="text-lg font-bold">Google Drive</h2>
        {connected && <Badge tone="green"><CheckCircle2 className="size-3" /> Conectado</Badge>}
      </div>

      {!connected ? (
        <div className="space-y-4 text-center">
          <p className="text-slate-600">Conecte sua conta Google para importar reuniões do Drive</p>
          <button onClick={handleConnect} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700">
            Conectar Google
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">Conectado como: {email}</p>
            <button onClick={handleDisconnect} className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700">
              <LogOut className="size-4" /> Desconectar
            </button>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 size-4 text-slate-400" />
              <input type="text" placeholder="Buscar arquivos…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--border)] bg-white pl-10 pr-4 text-sm outline-none focus:border-emerald-500" />
            </div>

            <button onClick={loadFiles} disabled={isLoading} className="w-full rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 disabled:opacity-50">
              {isLoading ? "Carregando…" : "Carregar arquivos"}
            </button>
          </div>

          {filteredFiles.length > 0 && (
            <div className="space-y-2">
              {filteredFiles.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3 hover:bg-slate-50">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">{f.name}</p>
                    <p className="text-xs text-slate-500">{new Date(f.created_time).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <button className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700">Selecionar</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
