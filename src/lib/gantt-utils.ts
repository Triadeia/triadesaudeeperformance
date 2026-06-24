/**
 * Gantt utility helpers — date math, range, position calculation and grouping.
 *
 * Implemented WITHOUT date-fns to keep the bundle lean.
 * If date-fns is already present in the host project, callers can swap
 * these helpers for the equivalent date-fns ones — signatures are compatible.
 */
import type { StoredTask, TaskStatus, TaskPriority } from "../types/task";

// ----------------------------------------------------------------------------
// Day / week / month math (UTC-safe, week starts Monday)
// ----------------------------------------------------------------------------

export const MS_PER_DAY = 86_400_000;

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

export function diffInDays(a: Date, b: Date): number {
  const start = startOfDay(a).getTime();
  const end = startOfDay(b).getTime();
  return Math.round((end - start) / MS_PER_DAY);
}

/** Returns week range, Monday → Sunday inclusive. */
export function getWeekRange(date: Date): { start: Date; end: Date } {
  const start = startOfDay(date);
  // JS: 0=Sun..6=Sat. We want Monday as start of week.
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  const end = endOfDay(addDays(start, 6));
  return { start, end };
}

export function getMonthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function getYearRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
  return { start, end };
}

export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  const t = date.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

// ----------------------------------------------------------------------------
// Formatting
// ----------------------------------------------------------------------------

const WEEKDAYS_PT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MONTHS_PT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export function formatDayLabel(d: Date): string {
  return `${WEEKDAYS_PT[d.getDay()]} ${d.getDate()}`;
}

export function formatMonthLabel(d: Date): string {
  return `${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** ISO 8601 week number. */
export function getWeekNumber(d: Date): number {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target.getTime() - yearStart.getTime()) / MS_PER_DAY) + 1) / 7);
}

// ----------------------------------------------------------------------------
// Position calculation for Gantt bars
// ----------------------------------------------------------------------------

export function calculateTaskPosition(
  task: StoredTask,
  rangeStart: Date,
  rangeEnd: Date,
  pixelsPerDay: number
): { left: number; width: number } | null {
  const start = parseISODate(task.start_date) ?? parseISODate(task.due_date);
  const end = parseISODate(task.due_date) ?? parseISODate(task.start_date);
  if (!start || !end) return null;

  // Clamp to visible range so bars at edges remain visible.
  const visibleStart = start < rangeStart ? rangeStart : start;
  const visibleEnd = end > rangeEnd ? rangeEnd : end;
  if (visibleEnd < rangeStart || visibleStart > rangeEnd) return null;

  const leftDays = diffInDays(rangeStart, visibleStart);
  const widthDays = Math.max(1, diffInDays(visibleStart, visibleEnd) + 1);

  return {
    left: leftDays * pixelsPerDay,
    width: widthDays * pixelsPerDay,
  };
}

/**
 * Inverse of calculateTaskPosition — converts a horizontal pixel offset
 * into a date relative to a range start. Used while drag-to-reschedule.
 */
export function pixelsToDate(
  pixels: number,
  rangeStart: Date,
  pixelsPerDay: number
): Date {
  const days = Math.round(pixels / pixelsPerDay);
  return addDays(rangeStart, days);
}

// ----------------------------------------------------------------------------
// Grouping
// ----------------------------------------------------------------------------

export function getTasksByStatus(
  tasks: StoredTask[]
): Record<TaskStatus, StoredTask[]> {
  const out: Record<TaskStatus, StoredTask[]> = {
    todo: [],
    in_progress: [],
    review: [],
    done: [],
    blocked: [],
  };
  for (const t of tasks) out[t.status].push(t);
  return out;
}

export function getTasksByGroup(
  tasks: StoredTask[],
  groupBy: "status" | "priority" | "assignee" | "project"
): Record<string, StoredTask[]> {
  const out: Record<string, StoredTask[]> = {};
  for (const t of tasks) {
    let key: string;
    switch (groupBy) {
      case "status":
        key = t.status;
        break;
      case "priority":
        key = t.priority;
        break;
      case "assignee":
        key = t.assignee ?? "Sem responsável";
        break;
      case "project":
        key = t.project ?? "Sem projeto";
        break;
    }
    (out[key] ??= []).push(t);
  }
  return out;
}

// ----------------------------------------------------------------------------
// Visible range builder
// ----------------------------------------------------------------------------

export type Zoom = "week" | "month" | "year";

export function buildRange(
  anchor: Date,
  zoom: Zoom
): { start: Date; end: Date; days: number; pixelsPerDay: number } {
  let r: { start: Date; end: Date };
  let pixelsPerDay: number;
  switch (zoom) {
    case "week":
      r = getWeekRange(anchor);
      pixelsPerDay = 96; // wider when zoomed in
      break;
    case "month":
      r = getMonthRange(anchor);
      pixelsPerDay = 36;
      break;
    case "year":
      r = getYearRange(anchor);
      pixelsPerDay = 6;
      break;
  }
  const days = diffInDays(r.start, r.end) + 1;
  return { ...r, days, pixelsPerDay };
}

/** Returns each day in a range (inclusive). */
export function eachDayInRange(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  let cur = startOfDay(start);
  const last = startOfDay(end);
  while (cur.getTime() <= last.getTime()) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

// ----------------------------------------------------------------------------
// Priority helpers
// ----------------------------------------------------------------------------

export const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function sortByPriority(tasks: StoredTask[]): StoredTask[] {
  return [...tasks].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}
