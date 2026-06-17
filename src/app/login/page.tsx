import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { ThemeSwitcher } from "@/components/theme-switcher";

export default async function LoginPage() {
  if (await getSession()) redirect("/app/dashboard");

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden overflow-hidden bg-[var(--navy)] p-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 top-12 size-96 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <img className="size-11 object-contain" src="/brand/tsp-branco-transparente.png" alt="" />
          <div>
            <p className="font-heading text-xl font-bold">Triade TSP</p>
            <p className="text-xs text-slate-300">Saúde & Performance</p>
          </div>
        </div>
        <div className="relative max-w-xl">
          <p className="mb-5 text-sm font-bold uppercase tracking-[0.18em] text-emerald-300">Código TSP</p>
          <h1 className="font-heading text-5xl font-semibold leading-[1.08]">
            Identidade, movimento e método em uma operação só.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
            Uma base viva para organizar alunos, professores, documentos, campanhas, ritos e checkpoints da Triade.
          </p>
        </div>
        <p className="relative text-sm text-slate-400">Você não busca resultado. Você se torna o resultado.</p>
      </section>
      <section className="relative flex items-center justify-center p-6">
        <div className="absolute right-6 top-6"><ThemeSwitcher /></div>
        <div className="glass w-full max-w-md rounded-[2rem] p-8 sm:p-10">
          <p className="text-sm font-bold text-emerald-700">Acesso interno</p>
          <h2 className="mt-2 font-heading text-3xl font-semibold">Bem-vindo de volta</h2>
          <p className="mb-8 mt-3 text-sm leading-6 text-slate-500">Entre com seu perfil para acessar método, operação, acervo e comunidade.</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
