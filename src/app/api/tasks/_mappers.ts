/**
 * Mapeamento PT-BR (UI) ↔ slugs do banco.
 *
 * A UI já trabalha com os rótulos legíveis (ex.: "A Fazer", "Média"). O Supabase
 * armazena slugs em inglês (ex.: "todo", "medium"). Centralizamos a conversão
 * aqui para evitar drift entre rotas e o repositório de leitura.
 */

export const TASK_STATUS_LABELS = [
  "Backlog",
  "A Fazer",
  "Em andamento",
  "Em revisão",
  "Bloqueada",
  "Concluída",
  "Cancelada",
] as const;
export type TaskStatusLabel = (typeof TASK_STATUS_LABELS)[number];

export const TASK_PRIORITY_LABELS = ["Urgente", "Alta", "Média", "Baixa"] as const;
export type TaskPriorityLabel = (typeof TASK_PRIORITY_LABELS)[number];

const STATUS_TO_SLUG: Record<TaskStatusLabel, string> = {
  Backlog: "backlog",
  "A Fazer": "todo",
  "Em andamento": "in_progress",
  "Em revisão": "review",
  Bloqueada: "blocked",
  Concluída: "done",
  Cancelada: "cancelled",
};

const PRIORITY_TO_SLUG: Record<TaskPriorityLabel, string> = {
  Urgente: "urgent",
  Alta: "high",
  Média: "medium",
  Baixa: "low",
};

export function fromStatusLabel(label: TaskStatusLabel): string {
  return STATUS_TO_SLUG[label];
}

export function fromPriorityLabel(label: TaskPriorityLabel): string {
  return PRIORITY_TO_SLUG[label];
}
