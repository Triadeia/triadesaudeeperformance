"use client";

import { useMemo } from "react";
import { Search, X } from "lucide-react";
import type { TaskStatus } from "@/lib/data";
import { EMPTY_FILTERS, type StoredTask, type TaskFiltersState } from "@/lib/tasks-storage";

const ALL_STATUSES: TaskStatus[] = ["Backlog", "A Fazer", "Em andamento", "Em revisão", "Bloqueada", "Concluída", "Cancelada"];
const ALL_PRIORITIES = ["Urgente", "Alta", "Média", "Baixa"];

interface FilterPanelProps {
  open: boolean;
  filters: TaskFiltersState;
  tasks: StoredTask[];
  onChange: (filters: TaskFiltersState) => void;
  onClose: () => void;
}

export function FilterPanel({ open, filters, tasks, onChange, onClose }: FilterPanelProps) {
  const assignees = useMemo(() => Array.from(new Set(tasks.map((task) => task.assignee))).sort(), [tasks]);
  const projects = useMemo(() => Array.from(new Set(tasks.map((task) => task.project))).sort(), [tasks]);
  const areas = useMemo(() => Array.from(new Set(tasks.map((task) => task.area))).sort(), [tasks]);

  if (!open) return null;

  function toggle<K extends keyof TaskFiltersState>(key: K, value: string) {
    const current = filters[key];
    if (!Array.isArray(current)) return;
    const list = current as string[];
    const next = list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
    onChange({ ...filters, [key]: next } as TaskFiltersState);
  }

  function clearAll() {
    onChange(EMPTY_FILTERS);
  }

  const activeCount =
    filters.statuses.length +
    filters.priorities.length +
    filters.assignees.length +
    filters.projects.length +
    filters.areas.length +
    (filters.search.trim() ? 1 : 0);

  return (
    <div className="mb-5 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-heading text-sm font-extrabold uppercase tracking-wider">Filtros</h3>
          <p className="muted text-xs">
            {activeCount > 0 ? `${activeCount} filtro(s) ativo(s)` : "Atualiza as visões em tempo real."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 ? (
            <button
              onClick={clearAll}
              className="h-8 rounded-lg border border-[var(--border)] bg-white px-3 text-xs font-bold text-slate-600 hover:bg-slate-50"
              type="button"
            >
              Limpar
            </button>
          ) : null}
          <button
            onClick={onClose}
            aria-label="Fechar filtros"
            className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.search}
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
            placeholder="Buscar por título, responsável, projeto…"
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <FilterGroup label="Status" options={ALL_STATUSES} selected={filters.statuses} onToggle={(value) => toggle("statuses", value)} />
        <FilterGroup label="Prioridade" options={ALL_PRIORITIES} selected={filters.priorities} onToggle={(value) => toggle("priorities", value)} />
        <FilterGroup label="Responsável" options={assignees} selected={filters.assignees} onToggle={(value) => toggle("assignees", value)} />
        <FilterGroup label="Projeto" options={projects} selected={filters.projects} onToggle={(value) => toggle("projects", value)} />
        <FilterGroup label="Área" options={areas} selected={filters.areas} onToggle={(value) => toggle("areas", value)} />
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                active
                  ? "bg-emerald-600 text-white"
                  : "border border-[var(--border)] bg-white text-slate-600 hover:bg-slate-50"
              }`}
              aria-pressed={active}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
