"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot,
  CalendarDays,
  KanbanSquare,
  List,
  Plus,
  Send,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Badge } from "@/components/page-parts";
import { useTasksStore } from "@/hooks/useTasksStore";
import { type FilterCriteria, type NewTaskInput, type Task, type TaskStatus } from "@/lib/tasks/schema";
import { applyParseResult, parseCommand } from "@/lib/tasks/parser";
import { NewTaskDialog } from "@/components/tasks/NewTaskDialog";
import { FilterPanel, criteriaToParams, paramsToCriteria } from "@/components/tasks/FilterPanel";
import { KanbanView } from "@/components/tasks/KanbanView";
import { TaskList } from "@/components/tasks/TaskList";
import { CalendarView } from "@/components/tasks/CalendarView";

type ViewMode = "list" | "kanban" | "calendar";

function TasksWorkspaceInner() {
  const { tasks, hydrated, addTask, updateTask, deleteTask, filterTasks } = useTasksStore();
  const [view, setView] = useState<ViewMode>("list");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [criteria, setCriteria] = useState<FilterCriteria>({});
  const [command, setCommand] = useState("");
  const [response, setResponse] = useState(
    "Posso criar, filtrar, resumir e mudar status de tarefas. Tudo local, sem chamadas de API.",
  );

  // Sincroniza filtros com URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const parsed = paramsToCriteria(params);
    if (Object.keys(parsed).length > 0) setCriteria(parsed);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = criteriaToParams(criteria);
    const search = params.toString();
    const newUrl = `${window.location.pathname}${search ? `?${search}` : ""}`;
    window.history.replaceState(null, "", newUrl);
  }, [criteria]);

  // Atalho global "N" para abrir nova tarefa
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (dialogOpen || filterPanelOpen) return;
      const target = event.target as HTMLElement | null;
      const isEditing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (isEditing) return;
      if (event.key.toLowerCase() === "n" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        setDialogKey((n) => n + 1);
        setDialogOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [dialogOpen, filterPanelOpen]);

  const filteredTasks = useMemo(() => filterTasks(criteria), [filterTasks, criteria]);

  const handleMoveStatus = useCallback(
    (id: string, status: TaskStatus) => {
      const updated = updateTask(id, { status });
      if (updated) setResponse(`Status atualizado: "${updated.title}" agora está em ${status}.`);
    },
    [updateTask],
  );

  const handleReschedule = useCallback(
    (id: string, dueIso: string) => {
      const updated = updateTask(id, { due: dueIso });
      if (updated) {
        setResponse(`Prazo atualizado: "${updated.title}" para ${new Date(dueIso).toLocaleDateString("pt-BR")}.`);
      }
    },
    [updateTask],
  );

  const openCreateDialog = useCallback(() => {
    setEditingTask(null);
    setDialogKey((n) => n + 1);
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((task: Task) => {
    setEditingTask(task);
    setDialogKey((n) => n + 1);
    setDialogOpen(true);
  }, []);

  const handleDeleteTask = useCallback(
    (task: Task) => {
      const confirmed = window.confirm(`Apagar a tarefa "${task.title}"? Esta ação não pode ser desfeita.`);
      if (!confirmed) return;
      if (deleteTask(task.id)) {
        setResponse(`Tarefa apagada: "${task.title}".`);
      } else {
        setResponse("Não consegui encontrar essa tarefa para apagar.");
      }
    },
    [deleteTask],
  );

  const handleSubmitTask = useCallback(
    (input: NewTaskInput) => {
      if (editingTask) {
        const updated = updateTask(editingTask.id, {
          title: input.title,
          description: input.description || undefined,
          status: input.status,
          assignee: input.assignee || undefined,
          due: input.due || undefined,
          project: input.project || undefined,
          area: input.area || undefined,
          priority: input.priority,
        });
        if (updated) setResponse(`Tarefa atualizada: "${updated.title}".`);
        return;
      }
      const created = addTask(input);
      setResponse(`Tarefa criada: "${created.title}".`);
    },
    [addTask, editingTask, updateTask],
  );

  function runCommand() {
    const submitted = command.trim();
    if (!submitted) return;
    setCommand("");
    const parsed = parseCommand(submitted);
    if (parsed.intent === "create") {
      const created = addTask({
        title: parsed.data.title,
        status: parsed.data.status ?? "A Fazer",
        assignee: parsed.data.assignee,
        due: parsed.data.due,
        priority: parsed.data.priority,
      });
      setResponse(`${parsed.response} (id ${created.id.slice(0, 8)})`);
      return;
    }
    if (parsed.intent === "filter") {
      setCriteria(parsed.data);
      setResponse(parsed.response);
      return;
    }
    if (parsed.intent === "status-change") {
      const applied = applyParseResult(parsed, tasks);
      if (applied.affected) {
        updateTask(applied.affected.id, { status: parsed.data.status });
        setResponse(`${parsed.response} → "${applied.affected.title}".`);
      } else {
        setResponse(applied.response);
      }
      return;
    }
    if (parsed.intent === "delete") {
      const applied = applyParseResult(parsed, tasks);
      if (applied.affected) {
        if (window.confirm(`Apagar a tarefa "${applied.affected.title}"?`)) {
          deleteTask(applied.affected.id);
          setResponse(`Tarefa apagada: "${applied.affected.title}".`);
        } else {
          setResponse("Exclusão cancelada.");
        }
      } else {
        setResponse(applied.response);
      }
      return;
    }
    if (parsed.intent === "summarize") {
      const applied = applyParseResult(parsed, tasks);
      setResponse(applied.response);
      return;
    }
    setResponse(parsed.response);
  }

  const activeFilters = useMemo(() => buildFilterBadges(criteria), [criteria]);

  function removeFilter(field: keyof FilterCriteria, value?: string) {
    const next: FilterCriteria = { ...criteria };
    if (field === "dueFrom" || field === "dueTo" || field === "search") {
      delete next[field];
    } else if (value && Array.isArray(next[field])) {
      const arr = (next[field] as string[]).filter((entry) => entry !== value);
      if (arr.length === 0) delete next[field];
      else (next[field] as string[]) = arr;
    }
    setCriteria(next);
  }

  if (!hydrated) {
    return (
      <div className="panel grid place-items-center p-10 text-sm text-slate-500">
        Carregando tarefas…
      </div>
    );
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
            <p className="text-xs text-slate-400">
              Local, determinístico. Atalho: pressione <kbd className="rounded bg-white/10 px-1.5 text-[10px]">N</kbd> para nova tarefa.
            </p>
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
              placeholder='Ex.: "Crie tarefa para João revisar até sexta" · "Mostre tarefas bloqueadas"'
            />
            <button
              onClick={runCommand}
              aria-label="Executar comando"
              className="grid size-12 place-items-center rounded-xl bg-emerald-400 text-[var(--navy)]"
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>
      </section>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <ViewButton active={view === "list"} onClick={() => setView("list")} icon={<List className="size-4" />} label="Lista" />
        <ViewButton active={view === "kanban"} onClick={() => setView("kanban")} icon={<KanbanSquare className="size-4" />} label="Kanban" />
        <ViewButton active={view === "calendar"} onClick={() => setView("calendar")} icon={<CalendarDays className="size-4" />} label="Calendário" />
        <label className="min-w-[220px] flex-1 sm:max-w-xs">
          <span className="sr-only">Buscar tarefas</span>
          <input
            value={criteria.search ?? ""}
            onChange={(event) =>
              setCriteria((current) => ({ ...current, search: event.target.value || undefined }))
            }
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-semibold outline-none placeholder:text-slate-400 focus:border-emerald-500 dark:bg-slate-900"
            placeholder="Buscar tarefa, pessoa ou projeto"
          />
        </label>
        <button
          type="button"
          onClick={() => setFilterPanelOpen(true)}
          className="flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-bold dark:bg-slate-900"
        >
          <SlidersHorizontal className="size-4" />
          Filtros {activeFilters.length > 0 ? <span className="rounded-full bg-emerald-600 px-1.5 text-[10px] text-white">{activeFilters.length}</span> : null}
        </button>
        <button
          type="button"
          onClick={openCreateDialog}
          className="flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 sm:ml-auto"
        >
          <Plus className="size-4" />
          Nova tarefa
        </button>
      </div>

      {activeFilters.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {activeFilters.map((badge) => (
            <button
              key={`${badge.field}:${badge.value ?? ""}`}
              type="button"
              onClick={() => removeFilter(badge.field, badge.value)}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-200"
            >
              {badge.label}
              <X className="size-3" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCriteria({})}
            className="text-xs font-bold text-slate-500 underline-offset-2 hover:underline"
          >
            limpar todos
          </button>
        </div>
      ) : null}

      <div className="mb-4 flex items-center gap-3 text-xs text-slate-500">
        <span>
          Exibindo <strong>{filteredTasks.length}</strong> de {tasks.length} tarefas
        </span>
        {criteria.search ? <Badge tone="blue">busca: {criteria.search}</Badge> : null}
      </div>

      {view === "list" ? (
        <TaskList
          tasks={filteredTasks}
          onEdit={openEditDialog}
          onDelete={handleDeleteTask}
          onStatusChange={handleMoveStatus}
        />
      ) : view === "kanban" ? (
        <KanbanView
          tasks={filteredTasks}
          onMove={handleMoveStatus}
          onEdit={openEditDialog}
          onDelete={handleDeleteTask}
        />
      ) : (
        <CalendarView
          tasks={filteredTasks}
          onReschedule={handleReschedule}
          onEdit={openEditDialog}
          onDelete={handleDeleteTask}
        />
      )}

      <NewTaskDialog
        key={dialogKey}
        open={dialogOpen}
        initialTask={editingTask}
        onClose={() => {
          setDialogOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleSubmitTask}
      />

      <FilterPanel
        open={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        tasks={tasks}
        criteria={criteria}
        onChange={setCriteria}
      />
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold ${
        active
          ? "bg-[var(--navy)] text-white"
          : "border border-[var(--border)] bg-white dark:bg-slate-900"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

type FilterBadge = {
  field: keyof FilterCriteria;
  value?: string;
  label: string;
};

function buildFilterBadges(criteria: FilterCriteria): FilterBadge[] {
  const badges: FilterBadge[] = [];
  (criteria.status ?? []).forEach((value) =>
    badges.push({ field: "status", value, label: `Status: ${value}` }),
  );
  (criteria.priority ?? []).forEach((value) =>
    badges.push({ field: "priority", value, label: `Prioridade: ${value}` }),
  );
  (criteria.assignee ?? []).forEach((value) =>
    badges.push({ field: "assignee", value, label: `Responsável: ${value}` }),
  );
  (criteria.project ?? []).forEach((value) =>
    badges.push({ field: "project", value, label: `Projeto: ${value}` }),
  );
  if (criteria.dueFrom) {
    badges.push({
      field: "dueFrom",
      label: `De: ${new Date(criteria.dueFrom).toLocaleDateString("pt-BR")}`,
    });
  }
  if (criteria.dueTo) {
    badges.push({
      field: "dueTo",
      label: `Até: ${new Date(criteria.dueTo).toLocaleDateString("pt-BR")}`,
    });
  }
  if (criteria.search) {
    badges.push({ field: "search", label: `Busca: ${criteria.search}` });
  }
  return badges;
}

export default TasksWorkspaceInner;
// Backward-compat: outras páginas podem importar `{ TasksWorkspace }`
export { TasksWorkspaceInner as TasksWorkspace };
