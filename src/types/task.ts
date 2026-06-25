/**
 * Shared task type for Open ClickUp lightweight port.
 *
 * Backward-compatible: existing tasks lacking the new optional fields
 * (start_date, position, dependsOn, duration) continue to work in
 * List/Kanban/Calendar views without migration.
 */
import type { TaskStatus } from "@/lib/data";
import type { StoredTask, TaskPriority } from "@/lib/tasks-storage";

export type { StoredTask, TaskPriority, TaskStatus };

export type ViewMode = "list" | "kanban" | "calendar" | "table" | "gantt";

export const STATUS_LABELS: Record<TaskStatus, string> = {
  Backlog: "Backlog",
  "A Fazer": "A fazer",
  "Em andamento": "Em andamento",
  "Em revisão": "Em revisão",
  Bloqueada: "Bloqueada",
  Concluída: "Concluída",
  Cancelada: "Cancelada",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  Baixa: "Baixa",
  Média: "Média",
  Alta: "Alta",
  Urgente: "Urgente",
};

/**
 * Color tokens reused across Kanban / Table / Gantt for visual consistency.
 * Pair: { bg, border, text, bar (for Gantt) }
 */
export const STATUS_COLORS: Record<
  TaskStatus,
  { bg: string; border: string; text: string; bar: string }
> = {
  Backlog: {
    bg: "bg-slate-100",
    border: "border-slate-300",
    text: "text-slate-700",
    bar: "#64748b",
  },
  "A Fazer": {
    bg: "bg-slate-100",
    border: "border-slate-300",
    text: "text-slate-700",
    bar: "#64748b",
  },
  "Em andamento": {
    bg: "bg-amber-100",
    border: "border-amber-300",
    text: "text-amber-800",
    bar: "#f59e0b",
  },
  "Em revisão": {
    bg: "bg-sky-100",
    border: "border-sky-300",
    text: "text-sky-800",
    bar: "#0ea5e9",
  },
  Concluída: {
    bg: "bg-emerald-100",
    border: "border-emerald-300",
    text: "text-emerald-800",
    bar: "#10b981",
  },
  Bloqueada: {
    bg: "bg-rose-100",
    border: "border-rose-300",
    text: "text-rose-800",
    bar: "#f43f5e",
  },
  Cancelada: {
    bg: "bg-rose-100",
    border: "border-rose-300",
    text: "text-rose-800",
    bar: "#f43f5e",
  },
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  Baixa: "bg-slate-100 text-slate-700 border-slate-300",
  Média: "bg-blue-100 text-blue-700 border-blue-300",
  Alta: "bg-orange-100 text-orange-700 border-orange-300",
  Urgente: "bg-rose-100 text-rose-700 border-rose-300",
};
