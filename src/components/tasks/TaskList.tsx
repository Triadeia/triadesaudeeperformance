"use client";

import { Pencil, Trash2 } from "lucide-react";
import { TASK_STATUSES, type Task, type TaskStatus } from "@/lib/tasks/schema";

export function TaskList({
  tasks,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}) {
  if (tasks.length === 0) {
    return (
      <div className="panel grid place-items-center p-10 text-sm text-slate-500">
        Nenhuma tarefa corresponde aos filtros atuais.
      </div>
    );
  }
  return (
    <div className="panel overflow-hidden">
      <div className="hidden grid-cols-[1.6fr_0.8fr_0.7fr_0.7fr_0.4fr_0.5fr] bg-slate-50 px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-400 md:grid dark:bg-slate-900/40">
        <span>Tarefa</span>
        <span>Status</span>
        <span>Responsável</span>
        <span>Prazo</span>
        <span>IA</span>
        <span className="text-right">Ações</span>
      </div>
      {tasks.map((task) => (
        <div
          key={task.id}
          className="grid gap-3 border-t border-slate-100 px-5 py-4 first:border-0 md:grid-cols-[1.6fr_0.8fr_0.7fr_0.7fr_0.4fr_0.5fr] md:items-center dark:border-slate-800"
        >
          <div>
            <p className="text-sm font-bold">{task.title}</p>
            <p className="mt-1 text-xs text-slate-500">
              {task.project ?? "Sem projeto"} · {task.area ?? "Sem área"}
            </p>
          </div>
          <label className="block">
            <span className="sr-only">Status de {task.title}</span>
            <select
              value={task.status}
              onChange={(event) => onStatusChange(task.id, event.target.value as TaskStatus)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <span className="text-sm font-semibold">{task.assignee ?? "—"}</span>
          <span className="text-sm text-slate-500">{task.due ? formatDate(task.due) : "Sem prazo"}</span>
          <span className="text-sm font-extrabold text-emerald-700">{task.score ?? "—"}</span>
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => onEdit(task)}
              aria-label={`Editar tarefa ${task.title}`}
              className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(task)}
              aria-label={`Apagar tarefa ${task.title}`}
              className="grid size-9 place-items-center rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}
