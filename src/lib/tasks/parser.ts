import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type FilterCriteria,
  type Priority,
  type Task,
  type TaskStatus,
} from "./schema";

export type Intent = "create" | "filter" | "summarize" | "status-change" | "unknown";

export type ParseResult =
  | { intent: "create"; data: CreateData; response: string }
  | { intent: "filter"; data: FilterCriteria; response: string }
  | { intent: "summarize"; data: Record<string, never>; response: string }
  | { intent: "status-change"; data: StatusChangeData; response: string }
  | { intent: "unknown"; data: Record<string, never>; response: string };

export type CreateData = {
  title: string;
  assignee?: string;
  due?: string; // ISO-8601
  priority?: Priority;
  status?: TaskStatus;
};

export type StatusChangeData = {
  index?: number;
  title?: string;
  status: TaskStatus;
};

// Mapeamento de palavras-chave em PT-BR para status
const STATUS_KEYWORDS: Array<{ matches: RegExp; status: TaskStatus }> = [
  { matches: /\bbloquead/i, status: "Bloqueada" },
  { matches: /\bconcluíd|\bconcluid|\bpront[ao]|\bfinalizad/i, status: "Concluída" },
  { matches: /\bem\s+andamento|\bandamento|\bfazendo/i, status: "Em andamento" },
  { matches: /\bem\s+revis|\brevis/i, status: "Em revisão" },
  { matches: /\ba\s+fazer|\bpendente|\bafazer/i, status: "A Fazer" },
  { matches: /\bbacklog/i, status: "Backlog" },
];

const PRIORITY_KEYWORDS: Array<{ matches: RegExp; priority: Priority }> = [
  { matches: /\burgente|\burgência|\burgencia/i, priority: "Urgente" },
  { matches: /\balta\s+prioridade|\bprioridade\s+alta/i, priority: "Alta" },
  { matches: /\bmédia|\bmedia\s+prioridade/i, priority: "Média" },
  { matches: /\bbaixa\s+prioridade|\bprioridade\s+baixa/i, priority: "Baixa" },
];

// Dias da semana → próximo dia ISO
const WEEKDAY_KEYWORDS: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  "segunda-feira": 1,
  terça: 2,
  terca: 2,
  "terça-feira": 2,
  "terca-feira": 2,
  quarta: 3,
  "quarta-feira": 3,
  quinta: 4,
  "quinta-feira": 4,
  sexta: 5,
  "sexta-feira": 5,
  sábado: 6,
  sabado: 6,
};

const PT_MONTHS: Record<string, number> = {
  janeiro: 0, jan: 0,
  fevereiro: 1, fev: 1,
  março: 2, marco: 2, mar: 2,
  abril: 3, abr: 3,
  maio: 4, mai: 4,
  junho: 5, jun: 5,
  julho: 6, jul: 6,
  agosto: 7, ago: 7,
  setembro: 8, set: 8,
  outubro: 9, out: 9,
  novembro: 10, nov: 10,
  dezembro: 11, dez: 11,
};

function nextWeekdayIso(weekday: number, base = new Date()): string {
  const result = new Date(base);
  result.setHours(23, 59, 0, 0);
  const today = result.getDay();
  let delta = weekday - today;
  if (delta <= 0) delta += 7;
  result.setDate(result.getDate() + delta);
  return result.toISOString();
}

function parseDateExpression(text: string): string | undefined {
  const lower = text.toLowerCase();

  if (/\bhoje\b/.test(lower)) {
    const d = new Date();
    d.setHours(23, 59, 0, 0);
    return d.toISOString();
  }

  if (/\bamanhã\b|\bamanha\b/.test(lower)) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(23, 59, 0, 0);
    return d.toISOString();
  }

  // "até sexta", "para sexta", "na sexta"
  const weekdayMatch = lower.match(
    /\b(?:até|ate|para|na|no|dia)\s+(domingo|segunda(?:-feira)?|terça(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sábado|sabado)\b/,
  );
  if (weekdayMatch) {
    return nextWeekdayIso(WEEKDAY_KEYWORDS[weekdayMatch[1]]);
  }

  // "dia 24 de junho" ou "24 de junho" ou "24/06"
  const fullDateMatch = lower.match(/\b(\d{1,2})\s+de\s+([a-zç]+)\b/);
  if (fullDateMatch) {
    const day = Number(fullDateMatch[1]);
    const month = PT_MONTHS[fullDateMatch[2]];
    if (!Number.isNaN(day) && month !== undefined) {
      const d = new Date();
      d.setMonth(month, day);
      d.setHours(23, 59, 0, 0);
      if (d < new Date()) d.setFullYear(d.getFullYear() + 1);
      return d.toISOString();
    }
  }

  const slashMatch = lower.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]) - 1;
    const year = slashMatch[3]
      ? Number(slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3])
      : new Date().getFullYear();
    const d = new Date(year, month, day, 23, 59);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  return undefined;
}

function extractStatus(text: string): TaskStatus | undefined {
  for (const entry of STATUS_KEYWORDS) {
    if (entry.matches.test(text)) return entry.status;
  }
  return undefined;
}

function extractPriority(text: string): Priority | undefined {
  for (const entry of PRIORITY_KEYWORDS) {
    if (entry.matches.test(text)) return entry.priority;
  }
  return undefined;
}

function extractAssignee(text: string): string | undefined {
  // "para João", "ao João", "para a Carol"
  const match = text.match(
    /\b(?:para|pra|ao|à|a)\s+(?:o\s+|a\s+)?([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]+)?)/,
  );
  if (match) return match[1].trim();
  return undefined;
}

function stripCreatePrefix(text: string): string {
  return text
    .replace(/^\s*(crie|criar|cria|adicione|adicionar|nova|novo)\s+(uma\s+|um\s+)?(tarefa|task)\s*/i, "")
    .replace(/^\s*(de|para|pra)\s+/i, "")
    .trim();
}

function extractTitle(rawInput: string): string {
  let title = stripCreatePrefix(rawInput);
  // Remove cláusulas de responsável / prazo / prioridade
  title = title
    .replace(
      /\b(?:para|pra|ao|à)\s+(?:o\s+|a\s+)?[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]+)?/g,
      "",
    )
    .replace(/\baté\s+\S+/gi, "")
    .replace(/\bate\s+\S+/gi, "")
    .replace(/\bcom\s+prioridade\s+\S+/gi, "")
    .replace(/\b(urgente|alta\s+prioridade|baixa\s+prioridade|média\s+prioridade)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/^[,.;:-]+|[,.;:-]+$/g, "")
    .trim();
  return title;
}

function parseCreate(input: string): ParseResult {
  const title = extractTitle(input) || "Nova tarefa";
  const assignee = extractAssignee(input);
  const due = parseDateExpression(input);
  const priority = extractPriority(input);
  const status = extractStatus(input);

  const data: CreateData = { title };
  if (assignee) data.assignee = assignee;
  if (due) data.due = due;
  if (priority) data.priority = priority;
  if (status) data.status = status;

  const parts = [`tarefa "${data.title}"`];
  if (assignee) parts.push(`responsável: ${assignee}`);
  if (priority) parts.push(`prioridade ${priority}`);
  if (due) {
    parts.push(`prazo ${new Date(due).toLocaleDateString("pt-BR")}`);
  }

  return {
    intent: "create",
    data,
    response: `Tarefa criada com ${parts.join(", ")}.`,
  };
}

function parseFilter(input: string): ParseResult {
  const data: FilterCriteria = {};
  const status = extractStatus(input);
  if (status) data.status = [status];

  const priority = extractPriority(input);
  if (priority) data.priority = [priority];

  const assignee = extractAssignee(input);
  if (assignee) data.assignee = [assignee];

  const due = parseDateExpression(input);
  if (due) data.dueTo = due;

  const fragments: string[] = [];
  if (status) fragments.push(`status ${status}`);
  if (priority) fragments.push(`prioridade ${priority}`);
  if (assignee) fragments.push(`responsável ${assignee}`);
  if (due) fragments.push(`com prazo até ${new Date(due).toLocaleDateString("pt-BR")}`);

  return {
    intent: "filter",
    data,
    response: fragments.length
      ? `Filtro aplicado: ${fragments.join(", ")}.`
      : "Filtro neutro aplicado (todas as tarefas).",
  };
}

function parseStatusChange(input: string): ParseResult {
  const status = extractStatus(input) ?? "Concluída";
  const indexMatch = input.match(/\b(?:primeira|segunda|terceira|quarta|quinta|sexta)\b/i);
  const ordinalMap: Record<string, number> = {
    primeira: 0,
    segunda: 1,
    terceira: 2,
    quarta: 3,
    quinta: 4,
    sexta: 5,
  };
  const index = indexMatch ? ordinalMap[indexMatch[0].toLowerCase()] : undefined;
  const titleMatch = input.match(/"([^"]+)"|'([^']+)'/);
  const title = titleMatch ? titleMatch[1] ?? titleMatch[2] : undefined;

  return {
    intent: "status-change",
    data: { status, index, title },
    response: `Atualização de status para ${status} preparada.`,
  };
}

export function parseCommand(input: string): ParseResult {
  const text = input.trim();
  if (!text) {
    return {
      intent: "unknown",
      data: {},
      response: "Digite um comando, por exemplo: \"Crie uma tarefa para João revisar o dashboard até sexta\".",
    };
  }

  const lower = text.toLowerCase();

  if (/^(crie|criar|cria|adicione|adicionar|nova|novo)\b/.test(lower)) {
    return parseCreate(text);
  }

  if (/^(mostre|mostrar|listar|liste|filtre|filtrar|filtro|quais|exibir|exiba)\b/.test(lower)) {
    return parseFilter(text);
  }

  if (/^(marque|marcar|mude|mudar|altere|alterar|atualize|atualizar|defina|definir|conclua|concluir)\b/.test(lower)) {
    return parseStatusChange(text);
  }

  if (/^(resuma|resumir|resumo|sumarize|sumariz)/.test(lower)) {
    return {
      intent: "summarize",
      data: {},
      response: "Resumo das tarefas calculado abaixo.",
    };
  }

  // Heurística secundária: se há "tarefa" no texto, tenta inferir create
  if (/tarefa/i.test(lower)) {
    return parseCreate(text);
  }

  return {
    intent: "unknown",
    data: {},
    response:
      "Comando não reconhecido. Tente: \"Crie tarefa para João revisar até sexta\", \"Mostre tarefas bloqueadas\" ou \"Marque a primeira como concluída\".",
  };
}

export function applyParseResult(result: ParseResult, tasks: Task[]): {
  tasks: Task[];
  affected?: Task;
  filter?: FilterCriteria;
  response: string;
} {
  if (result.intent === "create") {
    // Quem aplica de fato é o hook (acesso ao repositório).
    return { tasks, response: result.response };
  }
  if (result.intent === "filter") {
    return { tasks, filter: result.data, response: result.response };
  }
  if (result.intent === "status-change") {
    const targetIndex = result.data.index ?? -1;
    const targetByTitle = result.data.title
      ? tasks.findIndex((task) => task.title.toLowerCase().includes(result.data.title!.toLowerCase()))
      : -1;
    const pickedIndex = targetIndex >= 0 ? targetIndex : targetByTitle;
    if (pickedIndex >= 0 && pickedIndex < tasks.length) {
      return {
        tasks,
        affected: tasks[pickedIndex],
        response: result.response,
      };
    }
    return { tasks, response: "Tarefa alvo não encontrada para alteração de status." };
  }
  if (result.intent === "summarize") {
    const byStatus = TASK_STATUSES.map((status) => ({
      status,
      count: tasks.filter((t) => t.status === status).length,
    })).filter((entry) => entry.count > 0);
    const byPriority = TASK_PRIORITIES.map((priority) => ({
      priority,
      count: tasks.filter((t) => t.priority === priority).length,
    })).filter((entry) => entry.count > 0);
    const summary = [
      `Total: ${tasks.length}`,
      ...byStatus.map((entry) => `${entry.status}: ${entry.count}`),
      ...byPriority.map((entry) => `${entry.priority}: ${entry.count}`),
    ].join(" · ");
    return { tasks, response: summary };
  }
  return { tasks, response: result.response };
}
