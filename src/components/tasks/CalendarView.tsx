"use client";

import { useMemo, useState } from "react";
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
import { ChevronLeft, ChevronRight, Pencil, Trash2, X } from "lucide-react";
import { Badge } from "@/components/page-parts";
import { type Task } from "@/lib/tasks/schema";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function startOfMonth(year: number, month: number) {
  return new Date(year, month, 1);
}

function buildGrid(year: number, month: number): Date[] {
  const first = startOfMonth(year, month);
  const offset = first.getDay();
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const d = new Date(start);
    d.setDate(start.getDate() + index);
    return d;
  });
}

function isoDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function priorityTone(priority?: string): "red" | "amber" | "blue" | "slate" {
  if (priority === "Urgente") return "red";
  if (priority === "Alta") return "amber";
  if (priority === "Média") return "blue";
  return "slate";
}

export function CalendarView({
  tasks,
  onReschedule,
  onEdit,
  onDelete,
}: {
  tasks: Task[];
  onReschedule: (id: string, dueIso: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const today = new Date();
  const [cursor, setCursor] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const grid = useMemo(() => buildGrid(cursor.year, cursor.month), [cursor]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      if (!task.due) return;
      try {
        const key = isoDayKey(new Date(task.due));
        const arr = map.get(key) ?? [];
        arr.push(task);
        map.set(key, arr);
      } catch {
        // skip
      }
    });
    return map;
  }, [tasks]);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
        new Date(cursor.year, cursor.month, 1),
      ),
    [cursor],
  );

  function moveMonth(delta: number) {
    setCursor(({ year, month }) => {
      const next = new Date(year, month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    setActiveTask(tasks.find((task) => task.id === id) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const overId = event.over?.id;
    if (!overId) return;
    const id = String(event.active.id);
    const dayKey = String(overId);
    const [year, month, day] = dayKey.split("-").map(Number);
    const next = new Date(year, month - 1, day, 23, 59);
    onReschedule(id, next.toISOString());
  }

  const dayTasks = selectedDay ? tasksByDay.get(selectedDay) ?? [] : [];
  const todayKey = isoDayKey(today);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
          <h2 className="font-heading text-lg font-semibold capitalize">{monthLabel}</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              aria-label="Mês anterior"
              className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                setCursor({ year: today.getFullYear(), month: today.getMonth() })
              }
              className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              aria-label="Próximo mês"
              className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/60 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/40">
          {WEEKDAYS.map((day) => (
            <div key={day} className="px-2 py-2 text-center">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {grid.map((date) => {
            const key = isoDayKey(date);
            const inMonth = date.getMonth() === cursor.month;
            const dayTasksList = tasksByDay.get(key) ?? [];
            return (
              <DayCell
                key={key}
                dayKey={key}
                date={date}
                inMonth={inMonth}
                isToday={key === todayKey}
                tasks={dayTasksList}
                onSelect={() => setSelectedDay(key)}
              />
            );
          })}
        </div>
      </div>

      {/* Ghost preview enquanto arrasta */}
      {activeTask ? (
        <div className="pointer-events-none fixed bottom-6 right-6 z-50 rounded-xl bg-white px-4 py-2 text-sm font-bold shadow-xl shadow-emerald-500/30 ring-1 ring-emerald-400 dark:bg-slate-900">
          Movendo: {activeTask.title}
        </div>
      ) : null}

      {/* Drawer com tarefas do dia */}
      {selectedDay ? (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-slate-900/30"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedDay(null);
          }}
        >
          <aside className="flex h-full w-full max-w-sm flex-col bg-white shadow-2xl dark:bg-slate-900">
            <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
                  Tarefas do dia
                </p>
                <h2 className="font-heading text-lg font-semibold capitalize">
                  {new Intl.DateTimeFormat("pt-BR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                  }).format(new Date(selectedDay))}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                aria-label="Fechar"
                className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="size-4" />
              </button>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
              {dayTasks.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma tarefa para este dia.</p>
              ) : (
                dayTasks.map((task) => (
                  <article
                    key={task.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 text-sm font-bold leading-5">{task.title}</p>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEdit(task)}
                          aria-label={`Editar tarefa ${task.title}`}
                          className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(task)}
                          aria-label={`Apagar tarefa ${task.title}`}
                          className="grid size-8 place-items-center rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {task.assignee ?? "Sem responsável"} · {task.status}
                    </p>
                    {task.priority ? (
                      <div className="mt-2">
                        <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
                      </div>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </DndContext>
  );
}

function DayCell({
  dayKey,
  date,
  inMonth,
  isToday,
  tasks,
  onSelect,
}: {
  dayKey: string;
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  tasks: Task[];
  onSelect: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dayKey });
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onSelect}
      className={`min-h-[110px] border-b border-r border-slate-100 px-2 py-2 text-left transition dark:border-slate-800 ${
        inMonth ? "bg-white dark:bg-slate-900" : "bg-slate-50 text-slate-400 dark:bg-slate-900/40"
      } ${isOver ? "bg-emerald-50 ring-2 ring-inset ring-emerald-400 dark:bg-emerald-900/30" : ""}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span
          className={`grid size-7 place-items-center rounded-full text-xs font-bold ${
            isToday ? "bg-emerald-500 text-white" : "text-slate-600 dark:text-slate-300"
          }`}
        >
          {date.getDate()}
        </span>
        {tasks.length > 0 ? (
          <span className="text-[10px] font-extrabold text-slate-400">{tasks.length}</span>
        ) : null}
      </div>
      <div className="space-y-1">
        {tasks.slice(0, 3).map((task) => (
          <DraggableChip key={task.id} task={task} />
        ))}
        {tasks.length > 3 ? (
          <p className="text-[10px] font-bold text-slate-500">+{tasks.length - 3} mais</p>
        ) : null}
      </div>
    </button>
  );
}

function DraggableChip({ task }: { task: Task }) {
  const { setNodeRef, listeners, attributes, transform, isDragging } = useDraggable({
    id: task.id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  const tone = priorityTone(task.priority);
  const toneClasses: Record<string, string> = {
    red: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(event) => event.stopPropagation()}
      role="button"
      tabIndex={0}
      aria-label={`Arrastar ${task.title}`}
      className={`cursor-grab truncate rounded-md px-2 py-1 text-[11px] font-bold leading-tight active:cursor-grabbing ${
        toneClasses[tone]
      } ${isDragging ? "opacity-40" : ""}`}
    >
      {task.title}
    </div>
  );
}
