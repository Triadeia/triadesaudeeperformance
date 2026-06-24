"use client";

import { useEffect, useMemo, useRef } from "react";
import { X } from "lucide-react";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type FilterCriteria,
  type Priority,
  type Task,
  type TaskStatus,
} from "@/lib/tasks/schema";

export function FilterPanel({
  open,
  onClose,
  tasks,
  criteria,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  criteria: FilterCriteria;
  onChange: (next: FilterCriteria) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Atalho de fechar com Esc
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const assignees = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((task) => task.assignee && set.add(task.assignee));
    return Array.from(set).sort();
  }, [tasks]);

  const projectsList = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((task) => task.project && set.add(task.project));
    return Array.from(set).sort();
  }, [tasks]);

  function toggleMulti<K extends "status" | "assignee" | "project" | "priority">(
    field: K,
    value: string,
  ) {
    const current = (criteria[field] as string[] | undefined) ?? [];
    const next = current.includes(value)
      ? current.filter((entry) => entry !== value)
      : [...current, value];
    onChange({ ...criteria, [field]: next.length ? next : undefined });
  }

  function setDate(field: "dueFrom" | "dueTo", value: string) {
    if (!value) {
      const next = { ...criteria };
      delete next[field];
      onChange(next);
      return;
    }
    const iso = new Date(value).toISOString();
    onChange({ ...criteria, [field]: iso });
  }

  function countFor(predicate: (task: Task) => boolean) {
    return tasks.filter(predicate).length;
  }

  function clearAll() {
    onChange({});
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-slate-900/30"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-label="Filtros de tarefas"
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl shadow-slate-900/20 dark:bg-slate-900"
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="font-heading text-lg font-semibold">Filtros</h2>
            <p className="text-xs text-slate-500">Aplicados em tempo real</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={clearAll}
              className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <Group title="Status">
            {TASK_STATUSES.map((status) => {
              const count = countFor((task) => task.status === status);
              const selected = criteria.status?.includes(status) ?? false;
              return (
                <CheckRow
                  key={status}
                  label={status}
                  count={count}
                  selected={selected}
                  onToggle={() => toggleMulti("status", status)}
                />
              );
            })}
          </Group>

          <Group title="Prioridade">
            {TASK_PRIORITIES.map((priority) => {
              const count = countFor((task) => task.priority === priority);
              const selected = criteria.priority?.includes(priority) ?? false;
              return (
                <CheckRow
                  key={priority}
                  label={priority}
                  count={count}
                  selected={selected}
                  onToggle={() => toggleMulti("priority", priority)}
                />
              );
            })}
          </Group>

          <Group title="Responsável">
            {assignees.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhum responsável atribuído.</p>
            ) : (
              assignees.map((assignee) => {
                const count = countFor((task) => task.assignee === assignee);
                const selected = criteria.assignee?.includes(assignee) ?? false;
                return (
                  <CheckRow
                    key={assignee}
                    label={assignee}
                    count={count}
                    selected={selected}
                    onToggle={() => toggleMulti("assignee", assignee)}
                  />
                );
              })
            )}
          </Group>

          <Group title="Projeto">
            {projectsList.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhum projeto atribuído.</p>
            ) : (
              projectsList.map((project) => {
                const count = countFor((task) => task.project === project);
                const selected = criteria.project?.includes(project) ?? false;
                return (
                  <CheckRow
                    key={project}
                    label={project}
                    count={count}
                    selected={selected}
                    onToggle={() => toggleMulti("project", project)}
                  />
                );
              })
            )}
          </Group>

          <Group title="Prazo">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  De
                </span>
                <input
                  type="date"
                  value={criteria.dueFrom ? criteria.dueFrom.slice(0, 10) : ""}
                  onChange={(event) => setDate("dueFrom", event.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Até
                </span>
                <input
                  type="date"
                  value={criteria.dueTo ? criteria.dueTo.slice(0, 10) : ""}
                  onChange={(event) => setDate("dueTo", event.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
            </div>
          </Group>
        </div>
      </aside>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-500">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function CheckRow({
  label,
  count,
  selected,
  onToggle,
}: {
  label: string;
  count: number;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60">
      <span className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
        />
        <span>{label}</span>
      </span>
      <span className="text-xs font-semibold text-slate-400">{count}</span>
    </label>
  );
}

// Helpers para URL sync (status=A%20Fazer,Backlog & assignee=...)
export function criteriaToParams(criteria: FilterCriteria): URLSearchParams {
  const params = new URLSearchParams();
  if (criteria.status?.length) params.set("status", criteria.status.join(","));
  if (criteria.assignee?.length) params.set("assignee", criteria.assignee.join(","));
  if (criteria.project?.length) params.set("project", criteria.project.join(","));
  if (criteria.priority?.length) params.set("priority", criteria.priority.join(","));
  if (criteria.dueFrom) params.set("dueFrom", criteria.dueFrom.slice(0, 10));
  if (criteria.dueTo) params.set("dueTo", criteria.dueTo.slice(0, 10));
  if (criteria.search) params.set("q", criteria.search);
  return params;
}

export function paramsToCriteria(params: URLSearchParams): FilterCriteria {
  const out: FilterCriteria = {};
  const status = params.get("status");
  if (status) out.status = status.split(",") as TaskStatus[];
  const assignee = params.get("assignee");
  if (assignee) out.assignee = assignee.split(",");
  const project = params.get("project");
  if (project) out.project = project.split(",");
  const priority = params.get("priority");
  if (priority) out.priority = priority.split(",") as Priority[];
  const dueFrom = params.get("dueFrom");
  if (dueFrom) out.dueFrom = new Date(dueFrom).toISOString();
  const dueTo = params.get("dueTo");
  if (dueTo) out.dueTo = new Date(dueTo).toISOString();
  const q = params.get("q");
  if (q) out.search = q;
  return out;
}
