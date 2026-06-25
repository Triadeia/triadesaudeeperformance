"use client";

/**
 * TableView — Open ClickUp lightweight port.
 *
 * Features:
 *  - 6 columns: Tarefa | Status | Prioridade | Responsável | Projeto | Prazo
 *  - Bulk selection (checkbox column)
 *  - Inline editing (click cell to edit, ESC cancels, Enter / blur commits)
 *  - HTML5 drag-and-drop reordering (no @dnd-kit dependency)
 *  - Column visibility toggle (⋮ menu)
 *  - Sortable headers (asc / desc)
 *  - Pagination — 50 rows per page
 *  - Bulk actions: set status, delete, assign
 *
 * Styling stays within the Triade Saúde token system (emerald/slate),
 * no external UI library required.
 */

import { useMemo, useState, useCallback } from "react";
import type {
  StoredTask,
  TaskStatus,
  TaskPriority,
} from "../types/task";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from "../types/task";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type TableViewProps = {
  tasks: StoredTask[];
  onTaskUpdate: (id: string, updates: Partial<StoredTask>) => void;
  onTaskDelete: (id: string) => void;
  onBulkUpdate: (ids: string[], updates: Partial<StoredTask>) => void;
  onTaskReorder?: (orderedIds: string[]) => void;
};

type ColumnKey =
  | "select"
  | "title"
  | "status"
  | "priority"
  | "assignee"
  | "project"
  | "due_date";

type SortDir = "asc" | "desc";
type SortKey = Exclude<ColumnKey, "select">;

const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "select", label: "" },
  { key: "title", label: "Tarefa" },
  { key: "status", label: "Status" },
  { key: "priority", label: "Prioridade" },
  { key: "assignee", label: "Responsável" },
  { key: "project", label: "Projeto" },
  { key: "due_date", label: "Prazo" },
];

const PAGE_SIZE = 50;
const DEFAULT_PRIORITY: TaskPriority = "Média";

function normalizePriority(priority: string | undefined): TaskPriority {
  return priority && priority in PRIORITY_LABELS ? (priority as TaskPriority) : DEFAULT_PRIORITY;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TableView({
  tasks,
  onTaskUpdate,
  onTaskDelete,
  onBulkUpdate,
  onTaskReorder,
}: TableViewProps) {
  // ----- state -----
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [visible, setVisible] = useState<Record<ColumnKey, boolean>>({
    select: true,
    title: true,
    status: true,
    priority: true,
    assignee: true,
    project: true,
    due_date: true,
  });
  const [showColMenu, setShowColMenu] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("due_date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<{ id: string; col: ColumnKey } | null>(null);
  const [draftValue, setDraftValue] = useState<string>("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  // ----- derived -----
  const sorted = useMemo(() => {
    const arr = [...tasks];
    arr.sort((a, b) => {
      const av = (a[sortKey] ?? "") as string | number;
      const bv = (b[sortKey] ?? "") as string | number;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [tasks, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageTasks = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // ----- selection -----
  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllOnPage = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allOn = pageTasks.every((t) => next.has(t.id));
      if (allOn) pageTasks.forEach((t) => next.delete(t.id));
      else pageTasks.forEach((t) => next.add(t.id));
      return next;
    });
  }, [pageTasks]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  // ----- sorting -----
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // ----- inline edit -----
  const startEdit = (id: string, col: ColumnKey, current: unknown) => {
    if (col === "select") return;
    setEditing({ id, col });
    setDraftValue(current == null ? "" : String(current));
  };

  const commitEdit = () => {
    if (!editing) return;
    const { id, col } = editing;
    const v = draftValue.trim();
    const updates: Partial<StoredTask> = {};
    switch (col) {
      case "title":
        if (v.length > 0) updates.title = v;
        break;
      case "status":
        updates.status = v as TaskStatus;
        break;
      case "priority":
        updates.priority = v as TaskPriority;
        break;
      case "assignee":
        updates.assignee = v || undefined;
        break;
      case "project":
        updates.project = v || undefined;
        break;
      case "due_date":
        updates.due_date = v || undefined;
        break;
    }
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date().toISOString();
      onTaskUpdate(id, updates);
    }
    setEditing(null);
  };

  const cancelEdit = () => setEditing(null);

  // ----- bulk actions -----
  const bulkSetStatus = (status: TaskStatus) => {
    onBulkUpdate(Array.from(selected), {
      status,
      updatedAt: new Date().toISOString(),
    });
    clearSelection();
  };

  const bulkDelete = () => {
    if (selected.size === 0) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Excluir ${selected.size} tarefa(s)?`)
    ) {
      return;
    }
    Array.from(selected).forEach((id) => onTaskDelete(id));
    clearSelection();
  };

  const bulkAssign = () => {
    if (typeof window === "undefined") return;
    const v = window.prompt("Atribuir a:");
    if (v == null) return;
    onBulkUpdate(Array.from(selected), {
      assignee: v.trim() || undefined,
      updatedAt: new Date().toISOString(),
    });
    clearSelection();
  };

  // ----- drag reorder -----
  const handleDragStart = (id: string) => setDragId(id);
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setHoverId(id);
  };
  const handleDrop = (targetId: string) => {
    if (!dragId || !onTaskReorder || dragId === targetId) {
      setDragId(null);
      setHoverId(null);
      return;
    }
    const ids = sorted.map((t) => t.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    onTaskReorder(next);
    setDragId(null);
    setHoverId(null);
  };

  // ----- helpers -----
  const isColVisible = (k: ColumnKey) => visible[k];
  const allChecked =
    pageTasks.length > 0 && pageTasks.every((t) => selected.has(t.id));

  // ----- render -----
  return (
    <div className="panel overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700">
            {tasks.length} tarefa{tasks.length === 1 ? "" : "s"}
            {selected.size > 0 && (
              <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                {selected.size} selecionada{selected.size === 1 ? "" : "s"}
              </span>
            )}
          </span>

          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <select
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                onChange={(e) => {
                  if (e.target.value) {
                    bulkSetStatus(e.target.value as TaskStatus);
                    e.target.value = "";
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>
                  Alterar status…
                </option>
                {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={bulkAssign}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
              >
                Atribuir
              </button>
              <button
                type="button"
                onClick={bulkDelete}
                className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
              >
                Excluir
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Limpar
              </button>
            </div>
          )}
        </div>

        {/* Column toggle menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColMenu((s) => !s)}
            aria-label="Configurar colunas"
            className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
          >
            ⋮
          </button>
          {showColMenu && (
            <div className="absolute right-0 z-30 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Colunas visíveis
              </p>
              {ALL_COLUMNS.filter((c) => c.key !== "select").map((c) => (
                <label
                  key={c.key}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={isColVisible(c.key)}
                    onChange={(e) =>
                      setVisible((prev) => ({ ...prev, [c.key]: e.target.checked }))
                    }
                  />
                  {c.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr className="border-b border-slate-200">
              {isColVisible("select") && (
                <th className="w-10 px-3 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAllOnPage}
                    aria-label="Selecionar todas"
                  />
                </th>
              )}
              {ALL_COLUMNS.filter(
                (c) => c.key !== "select" && isColVisible(c.key)
              ).map((c) => (
                <th
                  key={c.key}
                  className="cursor-pointer px-3 py-2 text-left font-semibold text-slate-700 hover:text-emerald-700"
                  onClick={() => handleSort(c.key as SortKey)}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {sortKey === c.key && (
                      <span aria-hidden className="text-emerald-600">
                        {sortDir === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {pageTasks.length === 0 && (
              <tr>
                <td
                  className="px-3 py-8 text-center text-slate-500"
                  colSpan={ALL_COLUMNS.filter((c) => isColVisible(c.key)).length}
                >
                  Nenhuma tarefa encontrada.
                </td>
              </tr>
            )}

            {pageTasks.map((task) => {
              const isSelected = selected.has(task.id);
              const isHovered = hoverId === task.id && dragId && dragId !== task.id;
              return (
                <tr
                  key={task.id}
                  draggable
                  onDragStart={() => handleDragStart(task.id)}
                  onDragOver={(e) => handleDragOver(e, task.id)}
                  onDrop={() => handleDrop(task.id)}
                  onDragEnd={() => {
                    setDragId(null);
                    setHoverId(null);
                  }}
                  className={[
                    "border-b border-slate-100 transition-colors",
                    isSelected ? "bg-emerald-50" : "hover:bg-emerald-50/30",
                    isHovered ? "outline outline-2 outline-emerald-400" : "",
                    dragId === task.id ? "opacity-50" : "",
                  ].join(" ")}
                >
                  {isColVisible("select") && (
                    <td className="px-3 py-2 align-top">
                      <div className="flex items-center gap-1">
                        <span
                          className="cursor-grab select-none text-slate-400"
                          aria-label="Reordenar"
                          title="Arraste para reordenar"
                        >
                          ≡
                        </span>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(task.id)}
                          aria-label={`Selecionar ${task.title}`}
                        />
                      </div>
                    </td>
                  )}

                  {isColVisible("title") && (
                    <td
                      className="px-3 py-2 align-top"
                      onClick={() => startEdit(task.id, "title", task.title)}
                    >
                      {editing?.id === task.id && editing.col === "title" ? (
                        <input
                          autoFocus
                          value={draftValue}
                          onChange={(e) => setDraftValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="w-full rounded border border-emerald-400 px-2 py-1 outline-none"
                        />
                      ) : (
                        <span className="font-medium text-slate-800">{task.title}</span>
                      )}
                    </td>
                  )}

                  {isColVisible("status") && (
                    <td
                      className="px-3 py-2 align-top"
                      onClick={() => startEdit(task.id, "status", task.status)}
                    >
                      {editing?.id === task.id && editing.col === "status" ? (
                        <select
                          autoFocus
                          value={draftValue}
                          onChange={(e) => setDraftValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="rounded border border-emerald-400 px-1 py-0.5"
                        >
                          {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={[
                            "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                            STATUS_COLORS[task.status].bg,
                            STATUS_COLORS[task.status].border,
                            STATUS_COLORS[task.status].text,
                          ].join(" ")}
                        >
                          {STATUS_LABELS[task.status]}
                        </span>
                      )}
                    </td>
                  )}

                  {isColVisible("priority") && (
                    <td
                      className="px-3 py-2 align-top"
                      onClick={() => startEdit(task.id, "priority", normalizePriority(task.priority))}
                    >
                      {(() => {
                        const priority = normalizePriority(task.priority);
                        return editing?.id === task.id && editing.col === "priority" ? (
                          <select
                            autoFocus
                            value={draftValue}
                            onChange={(e) => setDraftValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitEdit();
                              if (e.key === "Escape") cancelEdit();
                            }}
                            className="rounded border border-emerald-400 px-1 py-0.5"
                          >
                            {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((p) => (
                              <option key={p} value={p}>
                                {PRIORITY_LABELS[p]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={[
                              "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                              PRIORITY_COLORS[priority],
                            ].join(" ")}
                          >
                            {PRIORITY_LABELS[priority]}
                          </span>
                        );
                      })()}
                    </td>
                  )}

                  {isColVisible("assignee") && (
                    <td
                      className="px-3 py-2 align-top text-slate-700"
                      onClick={() => startEdit(task.id, "assignee", task.assignee ?? "")}
                    >
                      {editing?.id === task.id && editing.col === "assignee" ? (
                        <input
                          autoFocus
                          value={draftValue}
                          onChange={(e) => setDraftValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="rounded border border-emerald-400 px-2 py-1 outline-none"
                        />
                      ) : (
                        task.assignee ?? <span className="text-slate-400">—</span>
                      )}
                    </td>
                  )}

                  {isColVisible("project") && (
                    <td
                      className="px-3 py-2 align-top text-slate-700"
                      onClick={() => startEdit(task.id, "project", task.project ?? "")}
                    >
                      {editing?.id === task.id && editing.col === "project" ? (
                        <input
                          autoFocus
                          value={draftValue}
                          onChange={(e) => setDraftValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="rounded border border-emerald-400 px-2 py-1 outline-none"
                        />
                      ) : (
                        task.project ?? <span className="text-slate-400">—</span>
                      )}
                    </td>
                  )}

                  {isColVisible("due_date") && (
                    <td
                      className="px-3 py-2 align-top text-slate-700"
                      onClick={() => startEdit(task.id, "due_date", task.due_date ?? "")}
                    >
                      {editing?.id === task.id && editing.col === "due_date" ? (
                        <input
                          autoFocus
                          type="date"
                          value={draftValue}
                          onChange={(e) => setDraftValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="rounded border border-emerald-400 px-2 py-1 outline-none"
                        />
                      ) : task.due_date ? (
                        new Date(task.due_date).toLocaleDateString("pt-BR")
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-xs text-slate-600">
          <span>
            Página {page + 1} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
