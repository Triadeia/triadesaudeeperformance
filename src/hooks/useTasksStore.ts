"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { tasksRepository } from "@/lib/tasks/storage";
import {
  type FilterCriteria,
  type NewTaskInput,
  type Task,
} from "@/lib/tasks/schema";

// Single in-memory snapshot do estado das tasks. O `useSyncExternalStore` lê daqui
// e notifica via listeners quando uma operação muda o conteúdo.
let snapshot: Task[] = [];
let initialized = false;
const listeners = new Set<() => void>();

function ensureInitialized() {
  if (initialized) return;
  initialized = true;
  // Só lemos do localStorage no client. No server, snapshot fica vazio.
  if (typeof window !== "undefined") {
    snapshot = tasksRepository.getTasks();
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  ensureInitialized();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Task[] {
  ensureInitialized();
  return snapshot;
}

function getServerSnapshot(): Task[] {
  return [];
}

function setSnapshot(next: Task[]) {
  snapshot = next;
  emit();
}

export function useTasksStore() {
  const tasks = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // Hidratado quando temos window e já passamos por ensureInitialized
  const hydrated = typeof window !== "undefined";

  const addTask = useCallback((input: NewTaskInput) => {
    const created = tasksRepository.addTask({
      title: input.title,
      description: input.description || undefined,
      status: input.status,
      assignee: input.assignee || undefined,
      due: input.due || undefined,
      project: input.project || undefined,
      area: input.area || undefined,
      priority: input.priority,
    });
    setSnapshot([created, ...snapshot]);
    return created;
  }, []);

  const updateTask = useCallback((id: string, changes: Partial<Task>) => {
    const updated = tasksRepository.updateTask(id, changes);
    if (!updated) return null;
    setSnapshot(snapshot.map((task) => (task.id === id ? updated : task)));
    return updated;
  }, []);

  const deleteTask = useCallback((id: string) => {
    const ok = tasksRepository.deleteTask(id);
    if (!ok) return false;
    setSnapshot(snapshot.filter((task) => task.id !== id));
    return true;
  }, []);

  const filterTasks = useCallback(
    (criteria: FilterCriteria) => {
      return tasks.filter((task) => {
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
        if (criteria.dueFrom && (!task.due || task.due < criteria.dueFrom)) return false;
        if (criteria.dueTo && (!task.due || task.due > criteria.dueTo)) return false;
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
      });
    },
    [tasks],
  );

  const reset = useCallback(() => {
    tasksRepository.clear();
    setSnapshot(tasksRepository.getTasks());
  }, []);

  return useMemo(
    () => ({
      tasks,
      hydrated,
      addTask,
      updateTask,
      deleteTask,
      filterTasks,
      reset,
    }),
    [tasks, hydrated, addTask, updateTask, deleteTask, filterTasks, reset],
  );
}
