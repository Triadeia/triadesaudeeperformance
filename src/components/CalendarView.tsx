"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { StoredTask } from "@/lib/tasks-storage";

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MONTHS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

interface CalendarViewProps {
  tasks: StoredTask[];
  /** Atualiza o due date (formato YYYY-MM-DD) quando o usuário arrasta uma tarefa para outra data. */
  onDueDateChange: (taskId: string, dueDate: string) => void;
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

interface DayCell {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
}

function buildMonthGrid(year: number, month: number): DayCell[] {
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const todayIso = new Date().toISOString().slice(0, 10);

  const cells: DayCell[] = [];

  // Dias do mês anterior para preencher a primeira semana
  for (let i = startWeekday - 1; i >= 0; i -= 1) {
    const day = daysInPrevMonth - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const iso = toIso(prevYear, prevMonth, day);
    cells.push({ iso, day, inMonth: false, isToday: iso === todayIso });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = toIso(year, month, day);
    cells.push({ iso, day, inMonth: true, isToday: iso === todayIso });
  }

  // Preencher resto da grid até múltiplo de 7
  while (cells.length % 7 !== 0) {
    const dayIndex = cells.length - (startWeekday + daysInMonth) + 1;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const iso = toIso(nextYear, nextMonth, dayIndex);
    cells.push({ iso, day: dayIndex, inMonth: false, isToday: iso === todayIso });
  }
  return cells;
}

export function CalendarView({ tasks, onDueDateChange }: CalendarViewProps) {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [hoverIso, setHoverIso] = useState<string | null>(null);

  const cells = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);
  const tasksByDate = useMemo(() => {
    const map = new Map<string, StoredTask[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const list = map.get(task.dueDate) || [];
      list.push(task);
      map.set(task.dueDate, list);
    }
    return map;
  }, [tasks]);

  const undatedTasks = useMemo(() => tasks.filter((task) => !task.dueDate), [tasks]);

  function prevMonth() {
    setCursor((current) => {
      const month = current.month === 0 ? 11 : current.month - 1;
      const year = current.month === 0 ? current.year - 1 : current.year;
      return { year, month };
    });
  }

  function nextMonth() {
    setCursor((current) => {
      const month = current.month === 11 ? 0 : current.month + 1;
      const year = current.month === 11 ? current.year + 1 : current.year;
      return { year, month };
    });
  }

  function goToday() {
    const now = new Date();
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
  }

  function onTaskDragStart(event: React.DragEvent<HTMLElement>, task: StoredTask) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", task.id);
  }

  function onDayDragOver(event: React.DragEvent<HTMLElement>, iso: string) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (hoverIso !== iso) setHoverIso(iso);
  }

  function onDayDrop(event: React.DragEvent<HTMLElement>, iso: string) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain");
    if (taskId) onDueDateChange(taskId, iso);
    setHoverIso(null);
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            aria-label="Mês anterior"
            type="button"
            className="grid size-9 place-items-center rounded-xl border border-[var(--border)] bg-white hover:bg-slate-50"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={nextMonth}
            aria-label="Próximo mês"
            type="button"
            className="grid size-9 place-items-center rounded-xl border border-[var(--border)] bg-white hover:bg-slate-50"
          >
            <ChevronRight className="size-4" />
          </button>
          <button
            onClick={goToday}
            type="button"
            className="h-9 rounded-xl border border-[var(--border)] bg-white px-3 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Hoje
          </button>
        </div>
        <h3 className="font-heading text-lg font-semibold">
          {MONTHS_PT[cursor.month]} {cursor.year}
        </h3>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {WEEKDAYS.map((label) => (
          <div key={label} className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            {label}
          </div>
        ))}
        {cells.map((cell) => {
          const dayTasks = tasksByDate.get(cell.iso) || [];
          const isHover = hoverIso === cell.iso;
          return (
            <div
              key={cell.iso}
              onDragOver={(event) => onDayDragOver(event, cell.iso)}
              onDragLeave={() => setHoverIso((current) => (current === cell.iso ? null : current))}
              onDrop={(event) => onDayDrop(event, cell.iso)}
              className={`min-h-[96px] rounded-xl border p-2 text-xs transition ${
                isHover
                  ? "border-emerald-400 bg-emerald-50"
                  : cell.inMonth
                    ? "border-slate-100 bg-white"
                    : "border-slate-100 bg-slate-50 text-slate-400"
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={`grid size-6 place-items-center rounded-full text-[11px] font-bold ${
                    cell.isToday ? "bg-emerald-600 text-white" : ""
                  }`}
                >
                  {cell.day}
                </span>
                {dayTasks.length > 0 ? <span className="text-[10px] text-slate-400">{dayTasks.length}</span> : null}
              </div>
              <div className="space-y-1">
                {dayTasks.slice(0, 3).map((task) => (
                  <article
                    key={task.id}
                    draggable
                    onDragStart={(event) => onTaskDragStart(event, task)}
                    title={`${task.title} · ${task.assignee}`}
                    className="cursor-grab truncate rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-800 active:cursor-grabbing"
                  >
                    {task.title}
                  </article>
                ))}
                {dayTasks.length > 3 ? (
                  <p className="text-[10px] text-slate-400">+{dayTasks.length - 3} mais</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {undatedTasks.length > 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            Sem prazo definido ({undatedTasks.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {undatedTasks.map((task) => (
              <article
                key={task.id}
                draggable
                onDragStart={(event) => onTaskDragStart(event, task)}
                title="Arraste para uma data"
                className="cursor-grab rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm active:cursor-grabbing"
              >
                {task.title}
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
