import {
  STORAGE_KEY,
  taskSchema,
  type FilterCriteria,
  type Task,
} from "./schema";
import { buildEnvelope, migrateEnvelope, seedFromFallback } from "./migrations";

function hasWindow() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function readRaw(): Task[] | null {
  if (!hasWindow()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return migrateEnvelope(parsed);
  } catch {
    return null;
  }
}

function writeRaw(tasks: Task[]) {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(buildEnvelope(tasks)));
  } catch {
    // localStorage cheio ou indisponível: silenciosamente ignora
  }
}

function ensureSeed(): Task[] {
  const existing = readRaw();
  if (existing && existing.length > 0) return existing;
  const seeded = seedFromFallback();
  writeRaw(seeded);
  return seeded;
}

function matches(task: Task, criteria: FilterCriteria): boolean {
  if (criteria.status && criteria.status.length > 0 && !criteria.status.includes(task.status)) {
    return false;
  }
  if (criteria.assignee && criteria.assignee.length > 0) {
    if (!task.assignee || !criteria.assignee.includes(task.assignee)) return false;
  }
  if (criteria.project && criteria.project.length > 0) {
    if (!task.project || !criteria.project.includes(task.project)) return false;
  }
  if (criteria.priority && criteria.priority.length > 0) {
    if (!task.priority || !criteria.priority.includes(task.priority)) return false;
  }
  if (criteria.dueFrom) {
    if (!task.due || task.due < criteria.dueFrom) return false;
  }
  if (criteria.dueTo) {
    if (!task.due || task.due > criteria.dueTo) return false;
  }
  if (criteria.search) {
    const needle = criteria.search.trim().toLowerCase();
    if (needle) {
      const haystack = [task.title, task.description, task.project, task.area, task.assignee]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
  }
  return true;
}

export const tasksRepository = {
  getTasks(): Task[] {
    return ensureSeed();
  },

  getTask(id: string): Task | null {
    return ensureSeed().find((task) => task.id === id) ?? null;
  },

  addTask(input: Omit<Task, "id" | "createdAt" | "updatedAt">): Task {
    const now = new Date().toISOString();
    const candidate: Task = {
      ...input,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    const validated = taskSchema.parse(candidate);
    const next = [validated, ...ensureSeed()];
    writeRaw(next);
    return validated;
  },

  updateTask(id: string, changes: Partial<Task>): Task | null {
    const list = ensureSeed();
    const index = list.findIndex((task) => task.id === id);
    if (index === -1) return null;
    const merged: Task = {
      ...list[index],
      ...changes,
      id: list[index].id,
      createdAt: list[index].createdAt,
      updatedAt: new Date().toISOString(),
    };
    const validated = taskSchema.parse(merged);
    const next = [...list];
    next[index] = validated;
    writeRaw(next);
    return validated;
  },

  deleteTask(id: string): boolean {
    const list = ensureSeed();
    const next = list.filter((task) => task.id !== id);
    if (next.length === list.length) return false;
    writeRaw(next);
    return true;
  },

  filterTasks(criteria: FilterCriteria): Task[] {
    return ensureSeed().filter((task) => matches(task, criteria));
  },

  replaceAll(tasks: Task[]): void {
    writeRaw(tasks);
  },

  clear(): void {
    if (!hasWindow()) return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },
};
