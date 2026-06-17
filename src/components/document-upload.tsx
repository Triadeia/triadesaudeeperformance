"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";

export function DocumentUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");

  async function upload(file: File) {
    setStatus("Enviando...");
    const form = new FormData();
    form.set("file", file);
    form.set("title", file.name);
    const response = await fetch("/api/documents/upload", { method: "POST", body: form });
    const result = await response.json();
    setStatus(response.ok ? "Documento enviado." : result.error);
  }

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".txt,.html,.pdf,.docx,.png,.jpg,.jpeg"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      {status ? <span className="text-xs font-semibold text-slate-500">{status}</span> : null}
      <button onClick={() => inputRef.current?.click()} className="flex h-11 items-center gap-2 rounded-xl bg-[var(--navy)] px-4 text-sm font-bold text-white">
        <Upload className="size-4" />Enviar documento
      </button>
    </div>
  );
}
