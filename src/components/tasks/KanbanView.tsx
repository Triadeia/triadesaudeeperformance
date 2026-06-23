"use client";

import { useMemo, useState } from "react";
import {
  Pencil,
  Trash2,
} from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Badge } from "@/components/page-parts";
import {
  TASK_STATUSES,
  type Task,
  type TaskStatus,
} from "@/lib/tasks/schema";

export function KanbanView({
  tasks,
  onMove,
  onEdit,
  onDelete,
}: {
  tasks: Task[];
  onMove: (id: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const grouped = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      Backlog: [],
      "A Fazer": [],
      "Em andamento": [],
      "Em revisão": [],
      Bloqueada: [],
      Concluída: [],
    };
    tasks.forEach((task) => {
      if (map[task.status]) map[task.status].push(task);
    });
    return map;
  }, [tasks]);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const overId = event.over?.id;
    if (!overId) return;
    const status = String(overId) as TaskStatus;
    if (!TASK_STATUSES.includes(status)) return;
    onMove(String(event.active.id), status);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid auto-cols-[280px] grid-flow-col gap-4 overflow-x-auto pb-5">
        {TASK_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={grouped[status]}
            activeId={activeId}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </DndContext>
  );
}

function Column({
  status,
  tasks,
  activeId,
  onEdit,
  onDelete,
}: {
  status: TaskStatus;
  tasks: Task[];
  activeId: string | null;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      className={`rounded-2xl p-3 transition ${
        isOver
          ? "bg-emerald-100/70 ring-2 ring-emerald-400 dark:bg-emerald-900/30"
          : "bg-slate-100/80 dark:bg-slate-900/40"
      }`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-extrabold">{status}</h2>
        <Badge>{tasks.length}</Badge>
      </div>
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-xs text-slate-400 dark:border-slate-700">
            Sem tarefas
          </p>
        ) : (
          tasks.map((task) => (
            <DraggableCard
              key={task.id}
              task={task}
              dragging={activeId === task.id}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </section>
  );
}

function DraggableCard({
  task,
  dragging,
  onEdit,
  onDelete,
}: {
  task: Task;
  dragging: boolean;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const { setNodeRef, listeners, attributes, transform } = useDraggable({ id: task.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <article
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab rounded-xl border border-white bg-white p-4 shadow-sm transition active:cursor-grabbing dark:border-slate-800 dark:bg-slate-900 ${
        dragging ? "opacity-50" : ""
      }`}
      role="button"
      aria-label={`Tarefa ${task.title}`}
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-sm font-bold leading-5">{task.title}</p>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onEdit(task);
            }}
            aria-label={`Editar tarefa ${task.title}`}
            className="grid size-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(task);
            }}
            aria-label={`Apagar tarefa ${task.title}`}
            className="grid size-7 place-items-center rounded-md text-red-400 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        {task.assignee ?? "Sem responsável"} · {task.due ? formatDueShort(task.due) : "Sem prazo"}
      </p>
      {task.priority ? (
        <div className="mt-3">
          <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
        </div>
      ) : null}
    </article>
  );
}

function formatDueShort(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function priorityTone(priority: string): "red" | "amber" | "blue" | "slate" {
  if (priority === "Urgente") return "red";
  if (priority === "Alta") return "amber";
  if (priority === "Média") return "blue";
  return "slate";
}
