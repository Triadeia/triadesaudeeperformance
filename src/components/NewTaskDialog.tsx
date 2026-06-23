"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { TaskStatus } from "@/lib/data";
import { createTask, type StoredTask } from "@/lib/tasks-storage";

const STATUSES: TaskStatus[] = ["Backlog", "A Fazer", "Em andamento", "Em revisão", "Bloqueada", "Concluída"];
const PRIORITIES = ["Urgente", "Alta", "Média", "Baixa"] as const;

interface NewTaskDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (task: StoredTask) => void;
  assignees: string[];
  projects: string[];
  areas: string[];
}

export function NewTaskDialog(props: NewTaskDialogProps) {
  if (!props.open) return null;
  return <NewTaskDialogInner {...props} />;
}

function NewTaskDialogInner({ onClose, onCreate, assignees, projects, areas }: NewTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>("A Fazer");
  const [priority, setPriority] = useState<string>("Média");
  const [assignee, setAssignee] = useState("");
  const [project, setProject] = useState("");
  const [area, setArea] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit() {
    if (title.trim().length < 3) {
      setError("Informe um título com pelo menos 3 caracteres.");
      return;
    }
    const task = createTask({
      title,
      status,
      priority,
      assignee: assignee || undefined,
      project: project || undefined,
      area: area || undefined,
      dueDate: dueDate || undefined,
    });
    onCreate(task);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-task-title"
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
      >
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
          type="button"
        >
          <X className="size-4" />
        </button>
        <h3 id="new-task-title" className="font-heading text-xl font-semibold">
          Nova tarefa
        </h3>
        <p className="muted mt-1 text-xs">Adiciona ao backlog local. Os dados ficam no navegador.</p>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Título</span>
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-emerald-500"
              placeholder="Ex.: Revisar checklist do brandbook"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as TaskStatus)}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-emerald-500"
              >
                {STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Prioridade</span>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-emerald-500"
              >
                {PRIORITIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Responsável</span>
              <input
                list="assignees-list"
                value={assignee}
                onChange={(event) => setAssignee(event.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-emerald-500"
                placeholder="Quem executa"
              />
              <datalist id="assignees-list">
                {assignees.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Prazo</span>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-emerald-500"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Projeto</span>
              <input
                list="projects-list"
                value={project}
                onChange={(event) => setProject(event.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-emerald-500"
                placeholder="Ex.: Painel TSP"
              />
              <datalist id="projects-list">
                {projects.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Área</span>
              <input
                list="areas-list"
                value={area}
                onChange={(event) => setArea(event.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-emerald-500"
                placeholder="Ex.: Branding"
              />
              <datalist id="areas-list">
                {areas.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>
          </div>

          {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            className="h-10 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700"
          >
            Criar tarefa
          </button>
        </div>
      </div>
    </div>
  );
}
