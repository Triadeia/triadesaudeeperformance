"use client";

/**
 * GanttView — Open ClickUp lightweight port.
 *
 * Features:
 *  - Horizontal timeline (week | month | year zoom)
 *  - Y-axis: scrollable task list, sticky on the left
 *  - X-axis: date grid with weekday + week number labels
 *  - Bars colored by status (matches Kanban/Table tokens)
 *  - Drag-to-reschedule (translates bar, snaps to day grid,
 *    commits new start_date/due_date on drop)
 *  - Hover tooltip: "Título · N dias · status"
 *  - Dependency lines: gray connectors between dependsOn tasks
 *  - Group by: none | status | priority | assignee | project
 *  - Status legend in the corner
 */

import {
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { StoredTask, TaskStatus } from "../types/task";
import {
  STATUS_LABELS,
  STATUS_COLORS,
} from "../types/task";
import {
  buildRange,
  eachDayInRange,
  formatDayLabel,
  formatMonthLabel,
  formatISODate,
  getWeekNumber,
  calculateTaskPosition,
  pixelsToDate,
  parseISODate,
  diffInDays,
  addDays,
  getTasksByGroup,
  type Zoom,
} from "../lib/gantt-utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type GanttGroupBy = "none" | "status" | "priority" | "assignee" | "project";

export type GanttViewProps = {
  tasks: StoredTask[];
  onTaskUpdate: (id: string, updates: Partial<StoredTask>) => void;
  zoom?: Zoom;
  groupBy?: GanttGroupBy;
};

const ROW_HEIGHT = 40;
const ROW_GAP = 8;
const SIDEBAR_WIDTH = 240;
const HEADER_HEIGHT = 56;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GanttView({
  tasks,
  onTaskUpdate,
  zoom: zoomProp = "week",
  groupBy: groupByProp = "none",
}: GanttViewProps) {
  const [zoom, setZoom] = useState<Zoom>(zoomProp);
  const [groupBy, setGroupBy] = useState<GanttGroupBy>(groupByProp);
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [hover, setHover] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [drag, setDrag] = useState<{
    id: string;
    startX: number;
    originalStart: Date;
    originalEnd: Date;
    deltaDays: number;
  } | null>(null);

  const chartRef = useRef<HTMLDivElement | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);

  // ---------------------------------------------------------------------------
  // Range
  // ---------------------------------------------------------------------------
  const { start, end, days, pixelsPerDay } = useMemo(
    () => buildRange(anchor, zoom),
    [anchor, zoom]
  );
  const chartWidth = days * pixelsPerDay;
  const dayCells = useMemo(() => eachDayInRange(start, end), [start, end]);

  // ---------------------------------------------------------------------------
  // Grouping (preserves stable order per group)
  // ---------------------------------------------------------------------------
  const grouped = useMemo<{ label: string; tasks: StoredTask[] }[]>(() => {
    if (groupBy === "none") return [{ label: "", tasks }];
    const map = getTasksByGroup(tasks, groupBy);
    return Object.entries(map).map(([label, list]) => ({ label, tasks: list }));
  }, [tasks, groupBy]);

  // Flat ordered list (used for row-index lookups when drawing dependency lines)
  const flatTasks = useMemo(
    () => grouped.flatMap((g) => g.tasks),
    [grouped]
  );
  const taskRow = useMemo(() => {
    const m = new Map<string, number>();
    flatTasks.forEach((t, i) => m.set(t.id, i));
    return m;
  }, [flatTasks]);

  // ---------------------------------------------------------------------------
  // Scroll sync
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const chart = chartRef.current;
    const sidebar = sidebarRef.current;
    if (!chart || !sidebar) return;

    const onChartScroll = () => {
      if (sidebar.scrollTop !== chart.scrollTop) {
        sidebar.scrollTop = chart.scrollTop;
      }
    };
    const onSidebarScroll = () => {
      if (chart.scrollTop !== sidebar.scrollTop) {
        chart.scrollTop = sidebar.scrollTop;
      }
    };
    chart.addEventListener("scroll", onChartScroll);
    sidebar.addEventListener("scroll", onSidebarScroll);
    return () => {
      chart.removeEventListener("scroll", onChartScroll);
      sidebar.removeEventListener("scroll", onSidebarScroll);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------
  const nav = (dir: -1 | 1) => {
    setAnchor((d) => {
      const step =
        zoom === "week" ? 7 : zoom === "month" ? 30 : 365;
      return addDays(d, dir * step);
    });
  };

  // ---------------------------------------------------------------------------
  // Drag-to-reschedule (pointer events, snaps to day)
  // ---------------------------------------------------------------------------
  const onBarPointerDown = (
    e: ReactPointerEvent<HTMLDivElement>,
    task: StoredTask
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const originalStart =
      parseISODate(task.start_date) ?? parseISODate(task.due_date);
    const originalEnd =
      parseISODate(task.due_date) ?? parseISODate(task.start_date);
    if (!originalStart || !originalEnd) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({
      id: task.id,
      startX: e.clientX,
      originalStart,
      originalEnd,
      deltaDays: 0,
    });
  };

  const onBarPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const px = e.clientX - drag.startX;
    const delta = Math.round(px / pixelsPerDay);
    if (delta !== drag.deltaDays) {
      setDrag({ ...drag, deltaDays: delta });
    }
  };

  const onBarPointerUp = () => {
    if (!drag) return;
    if (drag.deltaDays !== 0) {
      const newStart = addDays(drag.originalStart, drag.deltaDays);
      const newEnd = addDays(drag.originalEnd, drag.deltaDays);
      onTaskUpdate(drag.id, {
        start_date: formatISODate(newStart),
        due_date: formatISODate(newEnd),
        updated_at: new Date().toISOString(),
      });
    }
    setDrag(null);
  };

  // ---------------------------------------------------------------------------
  // Dependency line builder
  // ---------------------------------------------------------------------------
  const dependencyPaths = useMemo(() => {
    const paths: {
      key: string;
      d: string;
    }[] = [];

    flatTasks.forEach((task) => {
      if (!task.dependsOn || task.dependsOn.length === 0) return;
      const targetRow = taskRow.get(task.id);
      if (targetRow == null) return;
      const targetPos = calculateTaskPosition(task, start, end, pixelsPerDay);
      if (!targetPos) return;

      task.dependsOn.forEach((depId) => {
        const dep = flatTasks.find((t) => t.id === depId);
        if (!dep) return;
        const depRow = taskRow.get(dep.id);
        if (depRow == null) return;
        const depPos = calculateTaskPosition(dep, start, end, pixelsPerDay);
        if (!depPos) return;

        const x1 = depPos.left + depPos.width;
        const y1 = depRow * (ROW_HEIGHT + ROW_GAP) + ROW_HEIGHT / 2;
        const x2 = targetPos.left;
        const y2 = targetRow * (ROW_HEIGHT + ROW_GAP) + ROW_HEIGHT / 2;

        const midX = (x1 + x2) / 2;
        paths.push({
          key: `${dep.id}->${task.id}`,
          d: `M ${x1},${y1} C ${midX},${y1} ${midX},${y2} ${x2},${y2}`,
        });
      });
    });

    return paths;
  }, [flatTasks, taskRow, start, end, pixelsPerDay]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const totalRows = flatTasks.length;
  const totalChartHeight = totalRows * (ROW_HEIGHT + ROW_GAP) + 16;

  const renderDateHeader = () => {
    if (zoom === "year") {
      // group by month
      const months: { label: string; left: number; width: number }[] = [];
      let i = 0;
      while (i < dayCells.length) {
        const monthStart = dayCells[i];
        let j = i;
        while (
          j < dayCells.length &&
          dayCells[j].getMonth() === monthStart.getMonth()
        )
          j++;
        months.push({
          label: formatMonthLabel(monthStart),
          left: i * pixelsPerDay,
          width: (j - i) * pixelsPerDay,
        });
        i = j;
      }
      return (
        <div
          className="relative border-b border-slate-200 bg-slate-50"
          style={{ width: chartWidth, height: HEADER_HEIGHT }}
        >
          {months.map((m) => (
            <div
              key={m.label + m.left}
              className="absolute top-0 flex h-full items-center justify-center border-r border-slate-200 text-xs font-semibold text-slate-700"
              style={{ left: m.left, width: m.width }}
            >
              {m.label}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div
        className="relative border-b border-slate-200 bg-slate-50"
        style={{ width: chartWidth, height: HEADER_HEIGHT }}
      >
        {dayCells.map((d, i) => {
          const isFirstOfWeek = d.getDay() === 1; // Monday
          return (
            <div
              key={i}
              className="absolute top-0 flex flex-col items-center justify-center border-r border-slate-200 text-[10px] text-slate-600"
              style={{
                left: i * pixelsPerDay,
                width: pixelsPerDay,
                height: HEADER_HEIGHT,
              }}
            >
              {isFirstOfWeek && (
                <span className="text-emerald-700 font-semibold">
                  S{getWeekNumber(d)}
                </span>
              )}
              <span>{formatDayLabel(d)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="panel relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Top toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => nav(-1)}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50"
            aria-label="Anterior"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setAnchor(new Date())}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => nav(1)}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50"
            aria-label="Próximo"
          >
            ›
          </button>
          <span className="ml-2 text-sm text-slate-600">
            {zoom === "week" && `Semana de ${formatDayLabel(start)} — ${formatDayLabel(end)}`}
            {zoom === "month" && formatMonthLabel(start)}
            {zoom === "year" && start.getFullYear()}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Group by */}
          <label className="flex items-center gap-1 text-xs text-slate-600">
            Agrupar:
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GanttGroupBy)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
            >
              <option value="none">Nenhum</option>
              <option value="status">Status</option>
              <option value="priority">Prioridade</option>
              <option value="assignee">Responsável</option>
              <option value="project">Projeto</option>
            </select>
          </label>

          {/* Zoom */}
          <div className="flex overflow-hidden rounded-md border border-slate-300 text-xs">
            {(["week", "month", "year"] as Zoom[]).map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZoom(z)}
                className={
                  zoom === z
                    ? "bg-emerald-600 px-3 py-1 text-white"
                    : "bg-white px-3 py-1 text-slate-700 hover:bg-slate-50"
                }
              >
                {z === "week" ? "Semana" : z === "month" ? "Mês" : "Ano"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body: sidebar + chart */}
      <div className="flex h-[70vh]">
        {/* Sidebar (task list) */}
        <div
          ref={sidebarRef}
          className="overflow-y-auto border-r border-slate-200 bg-slate-50/60"
          style={{ width: SIDEBAR_WIDTH }}
        >
          <div
            className="sticky top-0 z-10 flex items-end border-b border-slate-200 bg-slate-50 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
            style={{ height: HEADER_HEIGHT }}
          >
            Tarefa
          </div>
          {grouped.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <div className="border-b border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-600">
                  {group.label}
                </div>
              )}
              {group.tasks.map((t) => (
                <div
                  key={t.id}
                  style={{ height: ROW_HEIGHT, marginBottom: ROW_GAP }}
                  className="flex items-center gap-2 truncate border-b border-slate-100 px-3 text-sm text-slate-800"
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[t.status].bar }}
                    aria-hidden
                  />
                  <span className="truncate" title={t.title}>
                    {t.title}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Chart */}
        <div ref={chartRef} className="relative flex-1 overflow-auto">
          {renderDateHeader()}

          <div
            className="relative"
            style={{ width: chartWidth, height: totalChartHeight }}
          >
            {/* Vertical grid lines (per day for week/month, weekly for year) */}
            {dayCells.map((d, i) => {
              const weekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div
                  key={i}
                  className={[
                    "absolute top-0 h-full border-r",
                    weekend ? "border-slate-200 bg-slate-50/40" : "border-slate-100",
                  ].join(" ")}
                  style={{ left: i * pixelsPerDay, width: pixelsPerDay }}
                />
              );
            })}

            {/* Dependency lines (behind bars) */}
            <svg
              className="pointer-events-none absolute left-0 top-0"
              width={chartWidth}
              height={totalChartHeight}
            >
              {dependencyPaths.map((p) => (
                <path
                  key={p.key}
                  d={p.d}
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  fill="none"
                  markerEnd="url(#arrow)"
                />
              ))}
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                </marker>
              </defs>
            </svg>

            {/* Bars */}
            {flatTasks.map((task, idx) => {
              const pos = calculateTaskPosition(task, start, end, pixelsPerDay);
              if (!pos) return null;
              const isDragging = drag?.id === task.id;
              const offset = isDragging ? (drag?.deltaDays ?? 0) * pixelsPerDay : 0;
              const tStart =
                parseISODate(task.start_date) ?? parseISODate(task.due_date);
              const tEnd =
                parseISODate(task.due_date) ?? parseISODate(task.start_date);
              const durationDays =
                tStart && tEnd ? diffInDays(tStart, tEnd) + 1 : task.duration ?? 1;

              return (
                <div
                  key={task.id}
                  role="button"
                  tabIndex={0}
                  onPointerDown={(e) => onBarPointerDown(e, task)}
                  onPointerMove={onBarPointerMove}
                  onPointerUp={onBarPointerUp}
                  onPointerCancel={onBarPointerUp}
                  onMouseEnter={(e) =>
                    setHover({ id: task.id, x: e.clientX, y: e.clientY })
                  }
                  onMouseMove={(e) =>
                    setHover({ id: task.id, x: e.clientX, y: e.clientY })
                  }
                  onMouseLeave={() => setHover(null)}
                  className={[
                    "absolute flex cursor-grab items-center rounded-md border px-2 text-xs font-medium text-white shadow-sm select-none",
                    isDragging ? "cursor-grabbing opacity-80 ring-2 ring-emerald-400" : "",
                  ].join(" ")}
                  style={{
                    left: pos.left + offset,
                    width: pos.width,
                    top: idx * (ROW_HEIGHT + ROW_GAP),
                    height: ROW_HEIGHT,
                    backgroundColor: STATUS_COLORS[task.status].bar,
                    borderColor: STATUS_COLORS[task.status].bar,
                  }}
                >
                  <span className="truncate">{task.title}</span>
                  <span className="ml-auto text-[10px] opacity-80">
                    {durationDays}d
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] shadow-sm backdrop-blur">
        {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[s].bar }}
            />
            <span className="text-slate-700">{STATUS_LABELS[s]}</span>
          </span>
        ))}
      </div>

      {/* Tooltip */}
      {hover &&
        (() => {
          const t = flatTasks.find((x) => x.id === hover.id);
          if (!t) return null;
          const tStart =
            parseISODate(t.start_date) ?? parseISODate(t.due_date);
          const tEnd = parseISODate(t.due_date) ?? parseISODate(t.start_date);
          const dur =
            tStart && tEnd ? diffInDays(tStart, tEnd) + 1 : t.duration ?? 1;
          return (
            <div
              role="tooltip"
              className="pointer-events-none fixed z-50 rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow-lg"
              style={{ left: hover.x + 12, top: hover.y + 12 }}
            >
              <div className="font-semibold">{t.title}</div>
              <div className="opacity-80">
                {dur} dia{dur === 1 ? "" : "s"} · {STATUS_LABELS[t.status]}
              </div>
            </div>
          );
        })()}
    </div>
  );
}
