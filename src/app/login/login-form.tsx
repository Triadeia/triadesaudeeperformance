"use client";

import { useActionState } from "react";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { loginAction } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, { error: "" });

  return (
    <form action={action} className="space-y-5">
      <label className="block">
        <span className="mb-2 block text-sm font-semibold">E-mail corporativo</span>
        <input
          name="email"
          type="email"
          defaultValue="will@triade.local"
          required
          className="h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-emerald-100"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold">Senha</span>
        <div className="relative">
          <LockKeyhole className="absolute left-4 top-3.5 size-5 text-slate-400" />
          <input
            name="password"
            type="password"
            defaultValue="Verifica@2026"
            required
            className="h-12 w-full rounded-xl border border-[var(--border)] bg-white pl-12 pr-4 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-emerald-100"
          />
        </div>
      </label>
      {state.error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{state.error}</p> : null}
      <button
        disabled={pending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--navy)] font-bold text-white transition hover:bg-[var(--navy-soft)] disabled:opacity-60"
      >
        {pending ? "Entrando..." : "Entrar no painel"}
        <ArrowRight className="size-4" />
      </button>
      <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
        <ShieldCheck className="size-4 text-emerald-600" />
        Sessão protegida para operação, método e comunidade Tríade.
      </p>
    </form>
  );
}
