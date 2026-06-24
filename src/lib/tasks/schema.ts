import { z } from "zod";

export const TASK_STATUSES = [
  "Backlog",
  "A Fazer",
  "Em andamento",
  "Em revisão",
  "Bloqueada",
  "Concluída",
] as const;

export const TASK_PRIORITIES = ["Urgente", "Alta", "Média", "Baixa"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type Priority = (typeof TASK_PRIORITIES)[number];

export const taskSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Título obrigatório").max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(TASK_STATUSES),
  assignee: z.string().optional(),
  due: z.string().optional(), // ISO-8601
  project: z.string().optional(),
  area: z.string().optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  score: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Task = z.infer<typeof taskSchema>;

export const newTaskInputSchema = z.object({
  title: z.string().min(1, "Título obrigatório").max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  status: z.enum(TASK_STATUSES).default("A Fazer"),
  assignee: z.string().optional().or(z.literal("")),
  due: z.string().optional().or(z.literal("")),
  project: z.string().optional().or(z.literal("")),
  area: z.string().optional().or(z.literal("")),
  priority: z.enum(TASK_PRIORITIES).optional(),
});

export type NewTaskInput = z.infer<typeof newTaskInputSchema>;

export type FilterCriteria = {
  status?: TaskStatus[];
  assignee?: string[];
  project?: string[];
  priority?: Priority[];
  dueFrom?: string;
  dueTo?: string;
  search?: string;
};

export const STORAGE_KEY = "triade:tasks:v1";
export const STORAGE_VERSION = "1";

export type StorageEnvelope = {
  version: string;
  tasks: Task[];
};
