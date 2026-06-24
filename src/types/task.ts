/**
 * Shared task type for Open ClickUp lightweight port.
 *
 * Backward-compatible: existing tasks lacking the new optional fields
 * (start_date, position, dependsOn, duration) continue to work in
 * List/Kanban/Calendar views without migration.
 */
export type TaskStatus = "todo" | "in_progress" | "review" | "done" | "blocked";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type StoredTask = {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: string;
  project?: string;
  due_date?: string;        // ISO date
  created_at: string;       // ISO date
  updated_at: string;       // ISO date

  // --- New optional fields (Open ClickUp port) ---
  start_date?: string;      // ISO date (when work begins)
  position?: number;        // ordering in list / table
  dependsOn?: string[];     // task IDs this task depends on
  duration?: number;        // days
};

export type ViewMode = "list" | "kanban" | "calendar" | "table" | "gantt";

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "A fazer",
  in_progress: "Em andamento",
  review: "Em revisão",
  done: "Concluída",
  blocked: "Bloqueada",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

/**
 * Color tokens reused across Kanban / Table / Gantt for visual consistency.
 * Pair: { bg, border, text, bar (for Gantt) }
 */
export const STATUS_COLORS: Record<
  TaskStatus,
  { bg: string; border: string; text: string; bar: string }
> = {
  todo: {
    bg: "bg-slate-100",
    border: "border-slate-300",
    text: "text-slate-700",
    bar: "#64748b",
  },
  in_progress: {
    bg: "bg-amber-100",
    border: "border-amber-300",
    text: "text-amber-800",
    bar: "#f59e0b",
  },
  review: {
    bg: "bg-sky-100",
    border: "border-sky-300",
    text: "text-sky-800",
    bar: "#0ea5e9",
  },
  done: {
    bg: "bg-emerald-100",
    border: "border-emerald-300",
    text: "text-emerald-800",
    bar: "#10b981",
  },
  blocked: {
    bg: "bg-rose-100",
    border: "border-rose-300",
    text: "text-rose-800",
    bar: "#f43f5e",
  },
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "bg-slate-100 text-slate-700 border-slate-300",
  medium: "bg-blue-100 text-blue-700 border-blue-300",
  high: "bg-orange-100 text-orange-700 border-orange-300",
  urgent: "bg-rose-100 text-rose-700 border-rose-300",
};
