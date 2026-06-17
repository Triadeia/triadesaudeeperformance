"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BookOpenText,
  BrainCircuit,
  CalendarDays,
  CircleUserRound,
  Component,
  Dumbbell,
  FolderKanban,
  Gauge,
  ListTodo,
  LogOut,
  Menu,
  PlugZap,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import type { SessionUser } from "@/lib/auth";
import { logoutAction } from "@/app/app/actions";
import { ThemeSwitcher } from "@/components/theme-switcher";

const navigation = [
  {
    label: "Operação",
    items: [
      { href: "/app/dashboard", label: "Visão geral", icon: Gauge },
      { href: "/app/reunioes", label: "Reuniões", icon: CalendarDays },
      { href: "/app/tarefas", label: "Tarefas", icon: ListTodo },
      { href: "/app/projetos", label: "Ciclos & Programas", icon: FolderKanban },
    ],
  },
  {
    label: "Inteligência",
    items: [
      { href: "/app/base-inteligencia", label: "Base de conhecimento", icon: BrainCircuit },
      { href: "/app/marca", label: "Brandbook TSP", icon: BookOpenText },
      { href: "/app/marca/diretorio", label: "Diretório do sistema", icon: Component },
    ],
  },
  {
    label: "Comunidade",
    items: [
      { href: "/app/funcionarios", label: "Equipe & Professores", icon: Users },
      { href: "/app/tarefas", label: "Gamificação interna", icon: Dumbbell },
      { href: "/app/integracoes", label: "Integrações", icon: PlugZap },
      { href: "/app/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="app-frame min-h-screen">
      <aside className={`app-sidebar fixed inset-y-0 left-0 z-50 flex w-72 flex-col p-5 transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-7 flex items-center justify-between">
          <Link href="/app/dashboard" className="flex items-center gap-3">
            <Image className="size-11 object-contain" src="/brand/selo-triade-branco.png" width={44} height={44} alt="" />
            <div>
              <p className="font-heading font-bold">Triade TSP</p>
              <p className="sidebar-muted text-[11px]">Saúde & Performance</p>
            </div>
          </Link>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Fechar menu"><X /></button>
        </div>
        <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1" aria-label="Navegação principal">
          {navigation.map((group) => (
            <div key={group.label}>
              <p className="sidebar-label mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[0.18em]">{group.label}</p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`sidebar-link flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${active ? "is-active" : ""}`}
                    >
                      <item.icon className="size-[18px]" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="sidebar-account mt-5 rounded-2xl p-4">
          <div className="mb-3 flex items-center gap-3">
            <CircleUserRound className="size-9 text-emerald-300" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{user.name}</p>
              <p className="sidebar-muted text-xs capitalize">{user.role}</p>
            </div>
          </div>
          <form action={logoutAction}>
            <button className="sidebar-muted flex w-full items-center gap-2 text-xs font-semibold hover:text-white">
              <LogOut className="size-4" /> Sair
            </button>
          </form>
        </div>
      </aside>
      {open ? <button className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden" onClick={() => setOpen(false)} aria-label="Fechar navegação" /> : null}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6">
          <div className="topbar mx-auto flex h-16 max-w-[1500px] items-center gap-3 rounded-2xl px-4">
            <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu /></button>
            <div className="relative hidden max-w-lg flex-1 sm:block">
              <Search className="muted absolute left-3 top-2.5 size-4" />
              <input className="topbar-search h-9 w-full rounded-xl border border-transparent pl-9 pr-3 text-sm outline-none" placeholder="Buscar alunos, método, documentos..." />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="system-status hidden sm:inline-flex"><span />Método ativo</span>
              <ThemeSwitcher compact />
              <span className="hidden text-sm font-semibold md:block">{user.name}</span>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
