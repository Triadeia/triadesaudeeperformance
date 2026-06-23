"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  newTaskInputSchema,
  type NewTaskInput,
  type Priority,
  type Task,
  type TaskStatus,
} from "@/lib/tasks/schema";
import { employees, projects } from "@/lib/data";

type FieldErrors = Partial<Record<keyof NewTaskInput, string>>;

const INITIAL: NewTaskInput = {
  title: "",
  description: "",
  status: "A Fazer",
  assignee: "",
  due: "",
  project: "",
  area: "",
  priority: undefined,
};

export function NewTaskDialog({
  open,
  onClose,
  onSubmit,
  initialTask,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: NewTaskInput) => void;
  initialTask?: Task | null;
}) {
  const [draft, setDraft] = useState<NewTaskInput>(() => taskToInput(initialTask));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Foco inicial após abrir
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => firstFieldRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Fechar com Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Focus trap simples
  useEffect(() => {
    if (!open) return;
    const node = dialogRef.current;
    if (!node) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = node.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    node.addEventListener("keydown", handler);
    return () => node.removeEventListener("keydown", handler);
  }, [open]);

  const employeeNames = useMemo(() => employees.map((e) => e.name), []);
  const projectNames = useMemo(() => projects.map((p) => p.name), []);

  if (!open) return null;

  function setField<K extends keyof NewTaskInput>(field: K, value: NewTaskInput[K]) {
    setDraft((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    const parsed = newTaskInputSchema.safeParse({
      ...draft,
      due: draft.due ? new Date(draft.due).toISOString() : "",
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof NewTaskInput;
        next[key] = issue.message;
      }
      setErrors(next);
      setSubmitting(false);
      return;
    }
    try {
      onSubmit(parsed.data);
      onClose();
    } catch (error) {
      setErrors({ title: error instanceof Error ? error.message : "Erro ao salvar" });
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-task-title"
        className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl shadow-slate-900/20 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 id="new-task-title" className="font-heading text-lg font-semibold">
            {initialTask ? "Editar tarefa" : "Nova tarefa"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5" noValidate>
          <Field label="Título" error={errors.title} required>
            <input
              ref={firstFieldRef}
              type="text"
              value={draft.title}
              onChange={(e) => setField("title", e.target.value)}
              aria-invalid={Boolean(errors.title)}
              aria-required="true"
              maxLength={200}
              className={inputClass(Boolean(errors.title))}
              placeholder="Ex.: Revisar dashboard"
            />
          </Field>

          <Field label="Descrição" error={errors.description}>
            <textarea
              value={draft.description ?? ""}
              onChange={(e) => setField("description", e.target.value)}
              maxLength={2000}
              rows={3}
              className={`${inputClass(Boolean(errors.description))} resize-y`}
              placeholder="Contexto, links, critérios de aceitação..."
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Responsável" error={errors.assignee}>
              <input
                type="text"
                list="task-assignees"
                value={draft.assignee ?? ""}
                onChange={(e) => setField("assignee", e.target.value)}
                className={inputClass(Boolean(errors.assignee))}
                placeholder="Nome do responsável"
              />
              <datalist id="task-assignees">
                {employeeNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </Field>

            <Field label="Prazo" error={errors.due}>
              <input
                type="date"
                value={draft.due ? draft.due.slice(0, 10) : ""}
                onChange={(e) => setField("due", e.target.value)}
                className={inputClass(Boolean(errors.due))}
              />
            </Field>

            <Field label="Projeto" error={errors.project}>
              <input
                type="text"
                list="task-projects"
                value={draft.project ?? ""}
                onChange={(e) => setField("project", e.target.value)}
                className={inputClass(Boolean(errors.project))}
                placeholder="Ex.: Painel TSP"
              />
              <datalist id="task-projects">
                {projectNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </Field>

            <Field label="Área" error={errors.area}>
              <input
                type="text"
                value={draft.area ?? ""}
                onChange={(e) => setField("area", e.target.value)}
                className={inputClass(Boolean(errors.area))}
                placeholder="Ex.: Produto Digital"
              />
            </Field>

            <Field label="Status" error={errors.status}>
              <select
                value={draft.status}
                onChange={(e) => setField("status", e.target.value as TaskStatus)}
                className={inputClass(false)}
              >
                {TASK_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Prioridade" error={errors.priority}>
              <select
                value={draft.priority ?? ""}
                onChange={(e) =>
                  setField("priority", (e.target.value || undefined) as Priority | undefined)
                }
                className={inputClass(false)}
              >
                <option value="">Sem prioridade</option>
                {TASK_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? "Salvando..." : initialTask ? "Salvar alterações" : "Criar tarefa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function taskToInput(task?: Task | null): NewTaskInput {
  if (!task) return INITIAL;
  return {
    title: task.title,
    description: task.description ?? "",
    status: task.status,
    assignee: task.assignee ?? "",
    due: task.due ? task.due.slice(0, 10) : "",
    project: task.project ?? "",
    area: task.area ?? "",
    priority: task.priority,
  };
}

function Field({
  label,
  children,
  error,
  required,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-extrabold uppercase tracking-wider text-slate-500">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      {children}
      {error ? <p className="mt-1 text-xs font-semibold text-red-600">{error}</p> : null}
    </label>
  );
}

function inputClass(invalid: boolean): string {
  const base =
    "block w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:bg-slate-950 dark:text-slate-100";
  const border = invalid
    ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
    : "border-slate-200 dark:border-slate-700";
  return `${base} ${border}`;
}
