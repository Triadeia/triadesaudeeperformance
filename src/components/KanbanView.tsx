"use client";

import { useMemo, useState } from "react";
import type { TaskStatus } from "@/lib/data";
import type { StoredTask } from "@/lib/tasks-storage";
import { Badge } from "@/components/page-parts";

const COLUMNS: TaskStatus[] = ["Backlog", "A Fazer", "Em andamento", "Em revisão", "Bloqueada", "Concluída"];

interface KanbanViewProps {
  tasks: StoredTask[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}

export function KanbanView({ tasks, onStatusChange }: KanbanViewProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverColumn, setHoverColumn] = useState<TaskStatus | null>(null);

  const grouped = useMemo(
    () => Object.fromEntries(COLUMNS.map((status) => [status, tasks.filter((task) => task.status === status)])) as Record<TaskStatus, StoredTask[]>,
    [tasks],
  );

  function onDragStart(event: React.DragEvent<HTMLElement>, task: StoredTask) {
    setDragId(task.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", task.id);
  }

  function onDragEnd() {
    setDragId(null);
    setHoverColumn(null);
  }

  function onColumnDragOver(event: React.DragEvent<HTMLElement>, status: TaskStatus) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (hoverColumn !== status) setHoverColumn(status);
  }

  function onColumnDrop(event: React.DragEvent<HTMLElement>, status: TaskStatus) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain") || dragId;
    if (taskId) onStatusChange(taskId, status);
    setDragId(null);
    setHoverColumn(null);
  }

  return (
    <div className="grid auto-cols-[290px] grid-flow-col gap-4 overflow-x-auto pb-5">
      {COLUMNS.map((status) => {
        const items = grouped[status] || [];
        const isHover = hoverColumn === status;
        return (
          <section
            key={status}
            onDragOver={(event) => onColumnDragOver(event, status)}
            onDrop={(event) => onColumnDrop(event, status)}
            onDragLeave={() => setHoverColumn((current) => (current === status ? null : current))}
            className={`rounded-2xl p-3 transition ${isHover ? "bg-emerald-50 outline outline-2 outline-emerald-400" : "bg-slate-100/80"}`}
            aria-label={`Coluna ${status}`}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-sm font-extrabold">{status}</h2>
              <Badge>{items.length}</Badge>
            </div>
            <div className="space-y-3 min-h-[40px]">
              {items.map((task) => (
                <article
                  key={task.id}
                  draggable
                  onDragStart={(event) => onDragStart(event, task)}
                  onDragEnd={onDragEnd}
                  className={`cursor-grab rounded-xl border border-white bg-white p-4 shadow-sm active:cursor-grabbing ${
                    dragId === task.id ? "opacity-50" : ""
                  }`}
                >
                  <p className="text-sm font-bold leading-5">{task.title}</p>
                  <p className="mt-3 text-xs text-slate-500">
                    {task.assignee} · {task.due}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge tone={task.priority === "Urgente" ? "red" : task.priority === "Alta" ? "amber" : "slate"}>
                      {String(task.priority)}
                    </Badge>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400">{task.project}</span>
                  </div>
                </article>
              ))}
              {items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-400">
                  Solte tarefas aqui
                </p>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
