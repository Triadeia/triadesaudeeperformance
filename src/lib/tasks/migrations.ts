import { tasks as fallbackTasks } from "@/lib/data";
import {
  STORAGE_VERSION,
  type Priority,
  type StorageEnvelope,
  type Task,
  type TaskStatus,
} from "./schema";

// Mapeia datas curtas (ex.: "20 jun") para ISO no ano atual quando possível.
const PT_MONTHS: Record<string, number> = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
};

function parseDueToIso(due?: string): string | undefined {
  if (!due) return undefined;
  const normalized = due.trim().toLowerCase();
  const match = normalized.match(/^(\d{1,2})\s+([a-zç]{3,})$/);
  if (!match) return undefined;
  const day = Number(match[1]);
  const monthKey = match[2].slice(0, 3);
  const month = PT_MONTHS[monthKey];
  if (Number.isNaN(day) || month === undefined) return undefined;
  const now = new Date();
  const year = now.getFullYear();
  const candidate = new Date(year, month, day);
  // se já passou faz mais de 6 meses, joga pro ano que vem
  const halfYearAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 180);
  if (candidate < halfYearAgo) candidate.setFullYear(year + 1);
  return candidate.toISOString();
}

export function seedFromFallback(): Task[] {
  const now = new Date().toISOString();
  return fallbackTasks.map((task, index) => {
    const iso = parseDueToIso(task.due);
    const due =
      iso ??
      new Date(Date.now() + (index + 3) * 24 * 60 * 60 * 1000).toISOString();
    return {
      id: task.id,
      title: task.title,
      status: task.status as TaskStatus,
      priority: task.priority as Priority,
      assignee: task.assignee,
      area: task.area,
      project: task.project,
      due,
      score: task.score,
      createdAt: now,
      updatedAt: now,
    } satisfies Task;
  });
}

export function buildEnvelope(tasks: Task[]): StorageEnvelope {
  return { version: STORAGE_VERSION, tasks };
}

export function migrateEnvelope(raw: unknown): Task[] | null {
  if (!raw || typeof raw !== "object") return null;
  const envelope = raw as Partial<StorageEnvelope> & { tasks?: unknown };
  if (!Array.isArray(envelope.tasks)) return null;
  // Versão atual = "1". Futuras versões aplicarão transformações aqui.
  if (envelope.version !== STORAGE_VERSION) {
    // Mantém os dados, atualiza envelope.
    return envelope.tasks as Task[];
  }
  return envelope.tasks as Task[];
}
