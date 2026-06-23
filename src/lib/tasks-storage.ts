/**
 * Camada de persistência das tarefas em localStorage.
 *
 * Frontend-only: nenhuma chamada HTTP. Os dados são lidos e gravados na chave
 * `triade_tasks`. Quando não há nada no localStorage, devolve um fallback baseado
 * em `src/lib/data.ts` para manter a UI populada na primeira visita.
 */

import { tasks as fallbackTasks, type TaskStatus } from "@/lib/data";

export const TASKS_STORAGE_KEY = "triade_tasks";
export const FILTERS_STORAGE_KEY = "triade_tasks_filters";

export type TaskPriority = "Urgente" | "Alta" | "Média" | "Baixa";

export interface StoredTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority | string;
  assignee: string;
  area: string;
  project: string;
  /** Texto curto exibido na UI (ex.: "20 jun"). */
  due: string;
  /** ISO date (YYYY-MM-DD) usada por filtros e calendário. Opcional para tarefas sem prazo. */
  dueDate?: string;
  score: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskFiltersState {
  statuses: TaskStatus[];
  priorities: string[];
  assignees: string[];
  projects: string[];
  areas: string[];
  search: string;
}

export const EMPTY_FILTERS: TaskFiltersState = {
  statuses: [],
  priorities: [],
  assignees: [],
  projects: [],
  areas: [],
  search: "",
};

const MONTHS_PT_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function formatDueLabel(dueDate?: string): string {
  if (!dueDate) return "Sem prazo";
  const parsed = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "Sem prazo";
  return `${String(parsed.getDate()).padStart(2, "0")} ${MONTHS_PT_SHORT[parsed.getMonth()]}`;
}

/** Constrói um seed completo a partir do fallback estático (lib/data.ts). */
function seedFromFallback(): StoredTask[] {
  const now = new Date().toISOString();
  const year = new Date().getFullYear();
  return fallbackTasks.map((task, index) => {
    const dueDay = index % 4 === 0 ? 20 : index % 3 === 0 ? 24 : 30;
    const dueIso = `${year}-06-${String(dueDay).padStart(2, "0")}`;
    return {
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      assignee: task.assignee,
      area: task.area,
      project: task.project,
      due: task.due,
      dueDate: dueIso,
      score: task.score,
      createdAt: now,
      updatedAt: now,
    } satisfies StoredTask;
  });
}

function safeParse(raw: string | null): StoredTask[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((item): item is StoredTask => typeof item?.id === "string" && typeof item?.title === "string");
  } catch {
    return null;
  }
}

export function loadTasks(): StoredTask[] {
  if (!isBrowser()) return seedFromFallback();
  const fromStorage = safeParse(window.localStorage.getItem(TASKS_STORAGE_KEY));
  if (fromStorage && fromStorage.length > 0) return fromStorage;
  const seed = seedFromFallback();
  saveTasks(seed);
  return seed;
}

export function saveTasks(tasks: StoredTask[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
}

export function loadFilters(): TaskFiltersState {
  if (!isBrowser()) return EMPTY_FILTERS;
  try {
    const raw = window.localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return EMPTY_FILTERS;
    const parsed = JSON.parse(raw);
    return { ...EMPTY_FILTERS, ...parsed } as TaskFiltersState;
  } catch {
    return EMPTY_FILTERS;
  }
}

export function saveFilters(filters: TaskFiltersState): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
}

export interface CreateTaskInput {
  title: string;
  status?: TaskStatus;
  priority?: string;
  assignee?: string;
  area?: string;
  project?: string;
  dueDate?: string;
}

export function createTask(input: CreateTaskInput): StoredTask {
  const now = new Date().toISOString();
  return {
    id: `task-local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: input.title.trim(),
    status: input.status ?? "A Fazer",
    priority: input.priority ?? "Média",
    assignee: input.assignee?.trim() || "Sem responsável",
    area: input.area?.trim() || "Geral",
    project: input.project?.trim() || "Sem projeto",
    due: formatDueLabel(input.dueDate),
    dueDate: input.dueDate,
    score: 70,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateTask(tasks: StoredTask[], id: string, patch: Partial<StoredTask>): StoredTask[] {
  return tasks.map((task) => {
    if (task.id !== id) return task;
    const next: StoredTask = { ...task, ...patch, updatedAt: new Date().toISOString() };
    if (patch.dueDate !== undefined) next.due = formatDueLabel(patch.dueDate);
    return next;
  });
}

export function deleteTask(tasks: StoredTask[], id: string): StoredTask[] {
  return tasks.filter((task) => task.id !== id);
}

/**
 * Aplica filtros sobre a lista. Filtros com array vazio significam "todos".
 */
export function applyFilters(tasks: StoredTask[], filters: TaskFiltersState): StoredTask[] {
  const search = filters.search.trim().toLocaleLowerCase("pt-BR");
  return tasks.filter((task) => {
    if (filters.statuses.length > 0 && !filters.statuses.includes(task.status)) return false;
    if (filters.priorities.length > 0 && !filters.priorities.includes(String(task.priority))) return false;
    if (filters.assignees.length > 0 && !filters.assignees.includes(task.assignee)) return false;
    if (filters.projects.length > 0 && !filters.projects.includes(task.project)) return false;
    if (filters.areas.length > 0 && !filters.areas.includes(task.area)) return false;
    if (search.length > 0) {
      const haystack = `${task.title} ${task.assignee} ${task.project} ${task.area}`.toLocaleLowerCase("pt-BR");
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

// ───────────────────────────────────────────────────────────────────────────────
// Command parser (texto natural em português)
// ───────────────────────────────────────────────────────────────────────────────

export type CommandResult =
  | { kind: "create"; task: StoredTask; message: string }
  | { kind: "filter"; filters: Partial<TaskFiltersState>; message: string }
  | { kind: "status-change"; matched: number; status: TaskStatus; message: string }
  | { kind: "info"; message: string }
  | { kind: "error"; message: string };

const STATUS_BY_KEYWORD: Array<{ pattern: RegExp; status: TaskStatus }> = [
  { pattern: /conclu[ií]da?s?|finalizada?s?|pronta?s?/i, status: "Concluída" },
  { pattern: /bloqueada?s?|trava(da|das)?/i, status: "Bloqueada" },
  { pattern: /em\s+andamento|fazendo|em\s+execu[cç][aã]o/i, status: "Em andamento" },
  { pattern: /em\s+revis[aã]o|revisar/i, status: "Em revisão" },
  { pattern: /a\s+fazer|to[- ]?do|para\s+fazer/i, status: "A Fazer" },
  { pattern: /backlog|esperando/i, status: "Backlog" },
  { pattern: /cancelada?s?/i, status: "Cancelada" },
];

const DAY_OF_WEEK_PT: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  terça: 2,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
  "sábado": 6,
};

function nextWeekday(target: number): string {
  const today = new Date();
  const diff = (target - today.getDay() + 7) % 7 || 7;
  const dt = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff);
  return dt.toISOString().slice(0, 10);
}

function parseDueExpression(text: string): string | undefined {
  const lowered = text.toLocaleLowerCase("pt-BR");
  if (/\bhoje\b/.test(lowered)) {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  }
  if (/\bamanh[ãa]\b/.test(lowered)) {
    const dt = new Date();
    dt.setDate(dt.getDate() + 1);
    return dt.toISOString().slice(0, 10);
  }
  for (const [name, weekday] of Object.entries(DAY_OF_WEEK_PT)) {
    if (new RegExp(`\\b${name}\\b`, "i").test(lowered)) return nextWeekday(weekday);
  }
  const ymd = lowered.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  return undefined;
}

function parseAssignee(text: string): string | undefined {
  const match = text.match(/\bpara\s+([A-ZÀ-Ý][\wÀ-ÿ]+(?:\s+[A-ZÀ-Ý][\wÀ-ÿ]+)?)/);
  return match?.[1];
}

/**
 * Avalia um comando em linguagem natural e devolve a ação a executar.
 * Não chama HTTP — toda a lógica é local.
 */
export function parseCommand(rawCommand: string, currentTasks: StoredTask[]): CommandResult {
  const command = rawCommand.trim();
  if (!command) return { kind: "error", message: "Digite um comando." };
  const normalized = command.toLocaleLowerCase("pt-BR");

  // Criação de tarefa
  if (/^(crie|criar|cria|adicione|adicionar|nova\s+tarefa)/i.test(normalized)) {
    let title = command
      .replace(/^(crie|criar|cria|adicione|adicionar)\s+(uma\s+)?(nova\s+)?tarefa\s*/i, "")
      .replace(/^nova\s+tarefa\s*/i, "")
      .trim();
    // Remover trecho de prazo e responsável do título
    title = title.replace(/\s+(para\s+\S+)/i, " ").replace(/\s+(at[ée]\s+\S+)/i, " ").trim();
    if (title.length < 3) return { kind: "error", message: "Informe um título com pelo menos 3 caracteres." };
    const assignee = parseAssignee(command);
    const dueDate = parseDueExpression(command);
    const task = createTask({ title, assignee, dueDate });
    return {
      kind: "create",
      task,
      message: `Tarefa criada em "${task.status}"${assignee ? ` para ${assignee}` : ""}${dueDate ? ` com prazo ${formatDueLabel(dueDate)}` : ""}.`,
    };
  }

  // Mudança de status em massa (ex.: "marque como concluída")
  const statusMatch = STATUS_BY_KEYWORD.find(({ pattern }) => pattern.test(normalized));
  if (/(marque|marcar|mude|mudar|mover|altere|alterar)/i.test(normalized) && statusMatch) {
    const titleHint = command.match(/"([^"]+)"|'([^']+)'/);
    if (titleHint) {
      const needle = (titleHint[1] || titleHint[2] || "").toLocaleLowerCase("pt-BR");
      const matched = currentTasks.filter((task) => task.title.toLocaleLowerCase("pt-BR").includes(needle));
      return {
        kind: "status-change",
        matched: matched.length,
        status: statusMatch.status,
        message: matched.length
          ? `${matched.length} tarefa(s) movida(s) para "${statusMatch.status}".`
          : "Nenhuma tarefa correspondeu ao texto entre aspas.",
      };
    }
    return {
      kind: "info",
      message: `Para mudar status em lote, cite o título entre aspas. Exemplo: marque "publicar painel" como concluída.`,
    };
  }

  // Mostrar tarefas com filtro
  if (/(mostre|mostrar|liste|listar|ver|filtre|filtrar)/i.test(normalized)) {
    if (statusMatch) {
      return {
        kind: "filter",
        filters: { statuses: [statusMatch.status] },
        message: `Exibindo apenas tarefas em "${statusMatch.status}".`,
      };
    }
    const assigneeMatch = parseAssignee(command);
    if (assigneeMatch) {
      return {
        kind: "filter",
        filters: { assignees: [assigneeMatch] },
        message: `Exibindo tarefas atribuídas a ${assigneeMatch}.`,
      };
    }
    if (/\btodas?\b|\blimpar\b/i.test(normalized)) {
      return { kind: "filter", filters: EMPTY_FILTERS, message: "Filtros limpos. Exibindo todas as tarefas." };
    }
  }

  return {
    kind: "info",
    message:
      "Posso ajudar com: criar tarefa (ex.: 'Crie tarefa para João até sexta'), filtrar (ex.: 'Mostre tarefas bloqueadas') ou mudar status (ex.: marque \"X\" como concluída).",
  };
}
