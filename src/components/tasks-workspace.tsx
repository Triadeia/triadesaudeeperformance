"use client";

import { useMemo, useState } from "react";
import { Bot, CalendarDays, KanbanSquare, List, Plus, Send, SlidersHorizontal } from "lucide-react";
import { type TaskStatus, tasks as fallbackTasks } from "@/lib/data";
import { Badge } from "@/components/page-parts";

const statuses: TaskStatus[] = ["Backlog", "A Fazer", "Em andamento", "Em revisão", "Bloqueada", "Concluída"];

type TaskItem = (typeof fallbackTasks)[number];

export function TasksWorkspace({ initialTasks }: { initialTasks: TaskItem[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [command, setCommand] = useState("");
  const [response, setResponse] = useState("Posso criar, filtrar, resumir e reorganizar tarefas. Ações em lote sempre pedem confirmação.");
  const grouped = useMemo(() => Object.fromEntries(statuses.map((status) => [status, tasks.filter((task) => task.status === status)])), [tasks]);

  async function runCommand() {
    if (!command.trim()) return;
    const submitted = command;
    setCommand("");
    setResponse("Processando comando...");
    const response = await fetch("/api/tasks/command", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ command: submitted }),
    });
    const result = await response.json();
    setResponse(response.ok ? result.response : result.error);
    if (response.ok && result.task) {
      setTasks((current) => [{
        ...(current[0] || fallbackTasks[0]),
        id: result.task.id,
        title: result.task.title,
        status: "A Fazer",
      }, ...current]);
    }
  }

  return (
    <div>
      <section className="mb-6 overflow-hidden rounded-[1.5rem] bg-[var(--navy)] text-white shadow-xl shadow-slate-900/10">
        <div className="flex items-center gap-3 border-b border-white/10 p-5"><div className="grid size-10 place-items-center rounded-xl bg-emerald-400 text-[var(--navy)]"><Bot /></div><div><h2 className="font-heading font-semibold">Chat de Comando</h2><p className="text-xs text-slate-400">Ações locais com confirmação para mudanças em lote</p></div></div>
        <div className="p-5">
          <p className="mb-4 max-w-3xl text-sm leading-6 text-slate-300">{response}</p>
          <div className="flex gap-2"><input value={command} onChange={(event) => setCommand(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void runCommand(); }} className="h-12 flex-1 rounded-xl border border-white/10 bg-white/10 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400" placeholder="Ex.: Crie uma tarefa para João revisar o dashboard até sexta." /><button onClick={() => void runCommand()} className="grid size-12 place-items-center rounded-xl bg-emerald-400 text-[var(--navy)]"><Send className="size-4" /></button></div>
        </div>
      </section>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button onClick={() => setView("list")} className={`flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold ${view === "list" ? "bg-[var(--navy)] text-white" : "border border-[var(--border)] bg-white"}`}><List className="size-4" />Lista</button>
        <button onClick={() => setView("kanban")} className={`flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold ${view === "kanban" ? "bg-[var(--navy)] text-white" : "border border-[var(--border)] bg-white"}`}><KanbanSquare className="size-4" />Kanban</button>
        <button className="flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-bold"><CalendarDays className="size-4" />Calendário</button>
        <button className="flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-bold"><SlidersHorizontal className="size-4" />Filtros</button>
        <button className="ml-auto flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white"><Plus className="size-4" />Nova tarefa</button>
      </div>
      {view === "list" ? (
        <div className="panel overflow-hidden">
          <div className="hidden grid-cols-[1.7fr_0.7fr_0.65fr_0.65fr_0.5fr] bg-slate-50 px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-400 md:grid"><span>Tarefa</span><span>Status</span><span>Responsável</span><span>Prazo</span><span>IA</span></div>
          {tasks.map((task) => <div key={task.id} className="grid gap-3 border-t border-slate-100 px-5 py-4 first:border-0 md:grid-cols-[1.7fr_0.7fr_0.65fr_0.65fr_0.5fr] md:items-center"><div><p className="text-sm font-bold">{task.title}</p><p className="mt-1 text-xs text-slate-500">{task.project} · {task.area}</p></div><Badge tone={task.status === "Bloqueada" ? "red" : task.status === "Concluída" ? "green" : "blue"}>{task.status}</Badge><span className="text-sm font-semibold">{task.assignee}</span><span className="text-sm text-slate-500">{task.due}</span><span className="text-sm font-extrabold text-emerald-700">{task.score}</span></div>)}
        </div>
      ) : (
        <div className="grid auto-cols-[290px] grid-flow-col gap-4 overflow-x-auto pb-5">
          {statuses.map((status) => <section key={status} className="rounded-2xl bg-slate-100/80 p-3"><div className="mb-3 flex items-center justify-between px-1"><h2 className="text-sm font-extrabold">{status}</h2><Badge>{grouped[status].length}</Badge></div><div className="space-y-3">{grouped[status].map((task) => <article key={task.id} className="rounded-xl border border-white bg-white p-4 shadow-sm"><p className="text-sm font-bold leading-5">{task.title}</p><p className="mt-3 text-xs text-slate-500">{task.assignee} · {task.due}</p><div className="mt-3"><Badge tone={task.priority === "Urgente" ? "red" : "amber"}>{task.priority}</Badge></div></article>)}</div></section>)}
        </div>
      )}
    </div>
  );
}
