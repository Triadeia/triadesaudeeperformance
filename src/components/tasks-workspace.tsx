"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Bot, CalendarDays, KanbanSquare, List, Plus, Send, SlidersHorizontal } from "lucide-react";
import type { TaskStatus } from "@/lib/data";
import { Badge } from "@/components/page-parts";
import {
  applyFilters,
  deleteTask,
  EMPTY_FILTERS,
  formatDueLabel,
  loadFilters,
  loadTasks,
  parseCommand,
  saveFilters,
  saveTasks,
  updateTask,
  type StoredTask,
  type TaskFiltersState,
} from "@/lib/tasks-storage";
import { NewTaskDialog } from "@/components/NewTaskDialog";
import { FilterPanel } from "@/components/FilterPanel";
import { KanbanView } from "@/components/KanbanView";
import { CalendarView } from "@/components/CalendarView";
import TableView from "@/components/TableView";
import GanttView from "@/components/GanttView";

type ViewMode = "list" | "kanban" | "calendar" | "table" | "gantt";

// Sinal global para `useSyncExternalStore` — incrementa a cada gravação local.
let storageRevision = 0;
const storageListeners = new Set<() => void>();

function notifyStorageChange() {
  storageRevision += 1;
  for (const listener of storageListeners) listener();
}

function subscribeStorage(listener: () => void) {
  storageListeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === "triade_tasks" || event.key === "triade_tasks_filters") listener();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    storageListeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

function getStorageSnapshot() {
  return storageRevision;
}

function getServerSnapshot() {
  return 0;
}

export function TasksWorkspace() {
  // Subscrição idiomática: re-renderiza quando o storage muda (sem setState-em-effect).
  const revision = useSyncExternalStore(subscribeStorage, getStorageSnapshot, getServerSnapshot);

  // Importante: enquanto revision === 0 (snapshot do servidor), devolvemos o estado neutro
  // para que o primeiro render no cliente bata com o HTML do SSR. Só depois do `useEffect`
  // de bootstrap chamar `notifyStorageChange()` é que lemos o localStorage de verdade.
  const tasks = useMemo<StoredTask[]>(() => (revision === 0 ? [] : loadTasks()), [revision]);
  const filters = useMemo<TaskFiltersState>(() => (revision === 0 ? EMPTY_FILTERS : loadFilters()), [revision]);

  function setTasks(updater: StoredTask[] | ((prev: StoredTask[]) => StoredTask[])) {
    const next = typeof updater === "function" ? (updater as (prev: StoredTask[]) => StoredTask[])(tasks) : updater;
    saveTasks(next);
    notifyStorageChange();
  }

  function setFilters(updater: TaskFiltersState | ((prev: TaskFiltersState) => TaskFiltersState)) {
    const next = typeof updater === "function" ? (updater as (prev: TaskFiltersState) => TaskFiltersState)(filters) : updater;
    saveFilters(next);
    notifyStorageChange();
  }

  const hydrated = revision > 0;

  const [view, setView] = useState<ViewMode>("list");
  const [command, setCommand] = useState("");
  const [response, setResponse] = useState(
    "Posso criar, filtrar, resumir e reorganizar tarefas localmente. Tudo fica salvo no seu navegador.",
  );
  const [showFilters, setShowFilters] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);

  // Garante uma revisão inicial no cliente após mount (consolida estado para componentes filhos).
  useEffect(() => {
    if (storageRevision === 0) notifyStorageChange();
  }, []);

  const filteredTasks = useMemo(() => applyFilters(tasks, filters), [tasks, filters]);

  const assignees = useMemo(() => Array.from(new Set(tasks.map((task) => task.assignee))).sort(), [tasks]);
  const projects = useMemo(() => Array.from(new Set(tasks.map((task) => task.project))).sort(), [tasks]);
  const areas = useMemo(() => Array.from(new Set(tasks.map((task) => task.area))).sort(), [tasks]);

  // Handlers — sem `useCallback` para que cada render veja a versão fresca de `setTasks`.
  function addTask(task: StoredTask) {
    setTasks((current) => [task, ...current]);
  }
  function changeStatus(taskId: string, status: TaskStatus) {
    setTasks((current) => updateTask(current, taskId, { status }));
  }
  function changeDueDate(taskId: string, dueDate: string) {
    setTasks((current) => updateTask(current, taskId, { dueDate, due: formatDueLabel(dueDate) }));
  }
  function removeTask(taskId: string) {
    setTasks((current) => deleteTask(current, taskId));
  }

  function runCommand() {
    const submitted = command.trim();
    if (!submitted) return;
    setCommand("");
    const result = parseCommand(submitted, tasks);
    switch (result.kind) {
      case "create":
        addTask(result.task);
        setResponse(result.message);
        break;
      case "filter":
        setFilters((current) => ({ ...current, ...result.filters }));
        setResponse(result.message);
        break;
      case "status-change": {
        const titleHint = submitted.match(/"([^"]+)"|'([^']+)'/);
        const needle = (titleHint?.[1] || titleHint?.[2] || "").toLocaleLowerCase("pt-BR");
        if (needle) {
          setTasks((current) =>
            current.map((task) =>
              task.title.toLocaleLowerCase("pt-BR").includes(needle)
                ? { ...task, status: result.status, updatedAt: new Date().toISOString() }
                : task,
            ),
          );
        }
        setResponse(result.message);
        break;
      }
      case "info":
      case "error":
        setResponse(result.message);
        break;
    }
  }

  return (
    <div>
      <section className="mb-6 overflow-hidden rounded-[1.5rem] bg-[var(--navy)] text-white shadow-xl shadow-slate-900/10">
        <div className="flex items-center gap-3 border-b border-white/10 p-5">
          <div className="grid size-10 place-items-center rounded-xl bg-emerald-400 text-[var(--navy)]">
            <Bot />
          </div>
          <div>
            <h2 className="font-heading font-semibold">Chat de Comando</h2>
            <p className="text-xs text-slate-400">Ações locais — nada vai para o servidor.</p>
          </div>
        </div>
        <div className="p-5">
          <p className="mb-4 max-w-3xl text-sm leading-6 text-slate-300">{response}</p>
          <div className="flex gap-2">
            <input
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") runCommand();
              }}
              className="h-12 flex-1 rounded-xl border border-white/10 bg-white/10 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400"
              placeholder="Ex.: Crie tarefa para João revisar o dashboard até sexta."
            />
            <button
              onClick={runCommand}
              type="button"
              aria-label="Enviar comando"
              className="grid size-12 place-items-center rounded-xl bg-emerald-400 text-[var(--navy)]"
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>
      </section>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setView("list")}
          type="button"
          className={`flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold ${
            view === "list" ? "bg-[var(--navy)] text-white" : "border border-[var(--border)] bg-white"
          }`}
        >
          <List className="size-4" />
          Lista
        </button>
        <button
          onClick={() => setView("kanban")}
          type="button"
          className={`flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold ${
            view === "kanban" ? "bg-[var(--navy)] text-white" : "border border-[var(--border)] bg-white"
          }`}
        >
          <KanbanSquare className="size-4" />
          Kanban
        </button>
        <button
          onClick={() => setView("calendar")}
          type="button"
          className={`flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold ${
            view === "calendar" ? "bg-[var(--navy)] text-white" : "border border-[var(--border)] bg-white"
          }`}
        >
          <CalendarDays className="size-4" />
          Calendário
        </button>
        <button
          onClick={() => setView("table")}
          type="button"
          className={`flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold ${
            view === "table" ? "bg-[var(--navy)] text-white" : "border border-[var(--border)] bg-white"
          }`}
        >
          Tabela
        </button>
        <button
          onClick={() => setView("gantt")}
          type="button"
          className={`flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold ${
            view === "gantt" ? "bg-[var(--navy)] text-white" : "border border-[var(--border)] bg-white"
          }`}
        >
          Gantt
        </button>
        <button
          onClick={() => setShowFilters((open) => !open)}
          type="button"
          className={`flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold ${
            showFilters ? "bg-[var(--navy)] text-white" : "border border-[var(--border)] bg-white"
          }`}
          aria-expanded={showFilters}
        >
          <SlidersHorizontal className="size-4" />
          Filtros
        </button>
        <button
          onClick={() => setShowNewTask(true)}
          type="button"
          className="ml-auto flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700"
        >
          <Plus className="size-4" />
          Nova tarefa
        </button>
      </div>

      <FilterPanel
        open={showFilters}
        filters={filters}
        tasks={tasks}
        onChange={setFilters}
        onClose={() => setShowFilters(false)}
      />

      {!hydrated ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white p-10 text-center">
          <p className="text-sm font-semibold text-slate-400">Carregando tarefas locais…</p>
        </div>
      ) : view === "list" ? (
        <ListView tasks={filteredTasks} onDelete={removeTask} onStatusChange={changeStatus} />
      ) : view === "kanban" ? (
        <KanbanView tasks={filteredTasks} onStatusChange={changeStatus} />
      ) : view === "calendar" ? (
        <CalendarView tasks={filteredTasks} onDueDateChange={changeDueDate} />
      ) : view === "table" ? (
        <TableView
          tasks={filteredTasks as any}
          onTaskUpdate={(id, updates) => setTasks((current) => updateTask(current, id, updates as any))}
          onTaskDelete={removeTask}
          onBulkUpdate={(ids, updates) => setTasks((current) => current.map((t) => (ids.includes(t.id) ? { ...t, ...updates } as any : t)) as any)}
          onTaskReorder={(orderedIds) => setTasks((current) => {
            const map = new Map(current.map((t) => [t.id, t]));
            return orderedIds.map((id, idx) => {
              const t = map.get(id);
              return t ? { ...t, position: idx } : null;
            }).filter(Boolean) as StoredTask[];
          })}
        />
      ) : view === "gantt" ? (
        <GanttView
          tasks={filteredTasks as any}
          onTaskUpdate={(id, updates) => setTasks((current) => updateTask(current, id, updates as any))}
          zoom="week"
          groupBy="none"
        />
      ) : null}

      <NewTaskDialog
        open={showNewTask}
        onClose={() => setShowNewTask(false)}
        onCreate={addTask}
        assignees={assignees}
        projects={projects}
        areas={areas}
      />
    </div>
  );
}

const STATUSES: TaskStatus[] = ["Backlog", "A Fazer", "Em andamento", "Em revisão", "Bloqueada", "Concluída", "Cancelada"];

function ListView({
  tasks,
  onDelete,
  onStatusChange,
}: {
  tasks: StoredTask[];
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-sm font-semibold text-slate-500">Nenhuma tarefa encontrada com os filtros atuais.</p>
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden">
      <div className="hidden grid-cols-[1.7fr_0.8fr_0.65fr_0.65fr_0.4fr_0.2fr] bg-slate-50 px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-400 md:grid">
        <span>Tarefa</span>
        <span>Status</span>
        <span>Responsável</span>
        <span>Prazo</span>
        <span>IA</span>
        <span></span>
      </div>
      {tasks.map((task) => (
        <div
          key={task.id}
          className="grid gap-3 border-t border-slate-100 px-5 py-4 first:border-0 md:grid-cols-[1.7fr_0.8fr_0.65fr_0.65fr_0.4fr_0.2fr] md:items-center"
        >
          <div>
            <p className="text-sm font-bold">{task.title}</p>
            <p className="mt-1 text-xs text-slate-500">
              {task.project} · {task.area}
            </p>
          </div>
          <select
            value={task.status}
            onChange={(event) => onStatusChange(task.id, event.target.value as TaskStatus)}
            className="h-9 rounded-lg border border-[var(--border)] bg-white px-2 text-xs font-bold outline-none focus:border-emerald-500"
            aria-label={`Status da tarefa ${task.title}`}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <span className="text-sm font-semibold">{task.assignee}</span>
          <span className="text-sm text-slate-500">{task.due}</span>
          <span className="text-sm font-extrabold text-emerald-700">{task.score}</span>
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            className="text-xs font-semibold text-slate-400 hover:text-red-600"
            aria-label={`Remover ${task.title}`}
          >
            Remover
          </button>
        </div>
      ))}
      <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
        <Badge>
          {tasks.length} tarefa{tasks.length === 1 ? "" : "s"}
        </Badge>
      </div>
    </div>
  );
}
