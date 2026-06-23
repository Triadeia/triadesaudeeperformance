"use client";

import { Badge } from "@/components/page-parts";
import { type Task } from "@/lib/tasks/schema";

export function TaskList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <div className="panel grid place-items-center p-10 text-sm text-slate-500">
        Nenhuma tarefa corresponde aos filtros atuais.
      </div>
    );
  }
  return (
    <div className="panel overflow-hidden">
      <div className="hidden grid-cols-[1.7fr_0.7fr_0.7fr_0.7fr_0.5fr] bg-slate-50 px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-400 md:grid dark:bg-slate-900/40">
        <span>Tarefa</span>
        <span>Status</span>
        <span>Responsável</span>
        <span>Prazo</span>
        <span>IA</span>
      </div>
      {tasks.map((task) => (
        <div
          key={task.id}
          className="grid gap-3 border-t border-slate-100 px-5 py-4 first:border-0 md:grid-cols-[1.7fr_0.7fr_0.7fr_0.7fr_0.5fr] md:items-center dark:border-slate-800"
        >
          <div>
            <p className="text-sm font-bold">{task.title}</p>
            <p className="mt-1 text-xs text-slate-500">
              {task.project ?? "Sem projeto"} · {task.area ?? "Sem área"}
            </p>
          </div>
          <Badge tone={statusTone(task.status)}>{task.status}</Badge>
          <span className="text-sm font-semibold">{task.assignee ?? "—"}</span>
          <span className="text-sm text-slate-500">{task.due ? formatDate(task.due) : "Sem prazo"}</span>
          <span className="text-sm font-extrabold text-emerald-700">{task.score ?? "—"}</span>
        </div>
      ))}
    </div>
  );
}

function statusTone(status: string): "green" | "amber" | "red" | "blue" | "slate" {
  if (status === "Concluída") return "green";
  if (status === "Bloqueada") return "red";
  if (status === "Em andamento" || status === "Em revisão") return "blue";
  if (status === "A Fazer") return "amber";
  return "slate";
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}
