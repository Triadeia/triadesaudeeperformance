"use client";

import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Columns3,
  Command,
  Flag,
  Gauge,
  Home,
  Inbox,
  Kanban,
  Layers3,
  List,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  Paperclip,
  Pause,
  Play,
  Plus,
  Search,
  Settings,
  Sun,
  Table2,
  Timer,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { employees as baseEmployees } from "@/lib/data";

type ViewMode = "list" | "board" | "calendar" | "gantt" | "table";
type StatusKey = "todo" | "progress" | "review" | "complete";
type Priority = "urgent" | "high" | "normal" | "low";
type GroupBy = "status" | "priority" | "assignee" | "none";
type AppTheme = "light" | "dark" | "navy";

type Subtask = { id: string; title: string; done: boolean; assignee: string };
type CustomFields = { storyPoints: number; environment: "Dev" | "Staging" | "Production" | "-" };
type TeamMember = { id: string; name: string; email: string; role: string; area: string; active: boolean; color: string };
type ListConfig = { id: string; name: string; marker: string; favorite?: boolean; collapsed?: boolean };
type SpaceConfig = { id: string; name: string; emoji: string; favorite?: boolean; collapsed?: boolean; lists: ListConfig[] };
type WorkspaceConfig = {
  spaces: SpaceConfig[];
  members: TeamMember[];
  workspaceName?: string;
  favorites?: string[];
  collapsedSpaces?: string[];
  collapsedLists?: string[];
  spaceOrder?: string[];
  listOrder?: string[];
  activeList?: string;
  activeSpaceId?: string;
  view?: ViewMode;
  groupBy?: GroupBy;
  filterPriority?: Priority | "all";
  sortBy?: "manual" | "due" | "priority";
};
type Task = {
  id: string;
  title: string;
  description: string;
  status: StatusKey;
  priority: Priority;
  assignees: string[];
  tags: string[];
  startDate: string;
  dueDate: string;
  storyPoints: number;
  list: string;
  space: string;
  folder?: string;
  dependencies: string[];
  comments: number;
  watchers: string[];
  subtasks: Subtask[];
  checklists: string[];
  attachments?: string[];
  customFields: CustomFields;
  timeEstimate: string;
  timeLogged: string;
  meetingId?: string | null;
  workspaceMeta?: Record<string, unknown>;
  favorite?: boolean;
  position?: number;
};

type ApiTask = {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  assignee?: string | null;
  project?: string | null;
  area?: string | null;
  meeting_id?: string | null;
  due_date?: string | null;
  score?: number | null;
  position?: number | null;
  workspace_meta?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const THEME_STORAGE_KEY = "tsp-theme";
const VALID_THEMES: AppTheme[] = ["light", "dark", "navy"];

const people: Record<string, { name: string; color: string }> = {
  SC: { name: "Santiago Cotto", color: "bg-violet-500" },
  MC: { name: "Maya Chen", color: "bg-pink-500" },
  DR: { name: "Drew Rivera", color: "bg-emerald-500" },
  LM: { name: "Leo Martins", color: "bg-sky-500" },
  PN: { name: "Priya Nair", color: "bg-orange-500" },
};

const statusConfig: Record<StatusKey, { label: string; badge: string; color: string; ring: string }> = {
  todo: { label: "TO DO", badge: "bg-slate-100 text-slate-500", color: "bg-slate-400", ring: "border-slate-400" },
  progress: { label: "IN PROGRESS", badge: "bg-blue-100 text-blue-500", color: "bg-blue-500", ring: "border-blue-500" },
  review: { label: "IN REVIEW", badge: "bg-violet-100 text-violet-500", color: "bg-violet-500", ring: "border-violet-500" },
  complete: { label: "COMPLETE", badge: "bg-green-100 text-green-600", color: "bg-green-500", ring: "border-green-500" },
};

const priorityConfig: Record<Priority, { label: string; color: string; text: string }> = {
  urgent: { label: "URGENT", color: "text-red-500", text: "text-red-500" },
  high: { label: "HIGH", color: "text-yellow-500", text: "text-yellow-600" },
  normal: { label: "NORMAL", color: "text-blue-400", text: "text-blue-500" },
  low: { label: "LOW", color: "text-slate-400", text: "text-slate-500" },
};

const defaultSpaces: SpaceConfig[] = [
  {
    id: "product",
    name: "Product",
    emoji: "🚀",
    lists: [
      { id: "sprint-24", name: "Sprint 24", marker: "text-violet-500" },
      { id: "backlog", name: "Backlog", marker: "text-orange-500" },
      { id: "roadmap", name: "Roadmap", marker: "text-emerald-500" },
    ],
  },
  {
    id: "marketing",
    name: "Marketing",
    emoji: "🌄",
    lists: [
      { id: "campaigns", name: "Campaigns", marker: "text-pink-500" },
      { id: "content-calendar", name: "Content Calendar", marker: "text-sky-500" },
    ],
  },
  {
    id: "engineering",
    name: "Engineering",
    emoji: "⚙️",
    lists: [{ id: "infra", name: "Infra", marker: "text-sky-500" }],
  },
  {
    id: "design",
    name: "Design",
    emoji: "🎯",
    lists: [{ id: "mockups", name: "Mockups", marker: "text-violet-500" }],
  },
];

const defaultMembers: TeamMember[] = baseEmployees.map((employee, index) => ({
  id: employee.id,
  name: employee.name,
  email: employee.email,
  role: employee.role,
  area: employee.area,
  active: employee.active,
  color: ["#0f766e", "#7c3aed", "#2563eb", "#ea580c", "#db2777", "#16a34a"][index % 6],
}));

const views: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
  { key: "list", label: "List", icon: <List className="size-4" /> },
  { key: "board", label: "Board", icon: <Kanban className="size-4" /> },
  { key: "calendar", label: "Calendar", icon: <CalendarDays className="size-4" /> },
  { key: "gantt", label: "Gantt", icon: <Layers3 className="size-4" /> },
  { key: "table", label: "Table", icon: <Table2 className="size-4" /> },
];

function todayLabel(iso: string) {
  if (!iso || Number.isNaN(new Date(`${iso}T00:00:00`).getTime())) return "No date";
  const today = new Date("2026-06-25T00:00:00");
  const date = new Date(`${iso}T00:00:00`);
  const diff = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function cls(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function Avatar({ id, size = "sm" }: { id: string; size?: "sm" | "md" }) {
  const person = people[id] ?? { name: id, color: "bg-slate-500" };
  return (
    <span
      title={person.name}
      className={cls(
        "inline-flex shrink-0 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-sm dark:border-[#1f222b]",
        person.color,
        size === "md" ? "size-8" : "size-6",
      )}
    >
      {id}
    </span>
  );
}

function StatusDot({ status }: { status: StatusKey }) {
  const cfg = statusConfig[status];
  return status === "complete" ? (
    <span className={cls("grid size-4 place-items-center rounded-full text-white", cfg.color)}>
      <Check className="size-3" />
    </span>
  ) : (
    <span className={cls("inline-block size-4 rounded-full border-2", cfg.ring)}>
      <span className={cls("block h-full w-1/2 rounded-l-full", status === "todo" ? "bg-transparent" : cfg.color)} />
    </span>
  );
}

function PriorityFlag({ priority }: { priority: Priority }) {
  return <Flag className={cls("size-4 fill-current", priorityConfig[priority].color)} />;
}

function Tag({ children }: { children: string }) {
  const tone =
    children === "backend"
      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15"
      : children === "design"
        ? "bg-pink-100 text-pink-500 dark:bg-pink-500/15"
        : children === "bug"
          ? "bg-red-100 text-red-500 dark:bg-red-500/15"
          : "bg-blue-100 text-blue-500 dark:bg-blue-500/15";
  return <span className={cls("rounded-full px-2 py-0.5 text-[11px] font-medium", tone)}>{children}</span>;
}

function isStatus(value: unknown): value is StatusKey {
  return typeof value === "string" && value in statusConfig;
}

function isPriority(value: unknown): value is Priority {
  return typeof value === "string" && value in priorityConfig;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function firstString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function normalizeTask(value: unknown, index: number): Task {
  const base = blankTaskTemplate(index);
  if (!value || typeof value !== "object") return { ...base };

  const raw = value as Partial<Task> & Record<string, unknown>;
  const assignees = stringArray(raw.assignees).length > 0 ? stringArray(raw.assignees) : base.assignees;
  const tags = stringArray(raw.tags);
  const watchers = stringArray(raw.watchers);
  const dependencies = stringArray(raw.dependencies);
  const checklists = stringArray(raw.checklists);
  const attachments = stringArray(raw.attachments);
  const subtasks = Array.isArray(raw.subtasks)
    ? (raw.subtasks as unknown[])
        .filter((item): item is Partial<Subtask> & Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map((item, subIndex) => ({
          id: typeof item.id === "string" && item.id ? item.id : `${base.id}-sub-${subIndex}`,
          title: typeof item.title === "string" && item.title.trim() ? item.title : "Subtask",
          done: Boolean(item.done),
          assignee: typeof item.assignee === "string" && item.assignee ? item.assignee : assignees[0] ?? "SC",
        }))
    : [];
  const customFields =
    raw.customFields && typeof raw.customFields === "object"
      ? (raw.customFields as Partial<CustomFields> & Record<string, unknown>)
      : {};
  const storyPoints = typeof raw.storyPoints === "number" && Number.isFinite(raw.storyPoints) ? raw.storyPoints : base.storyPoints;
  const environment =
    customFields.environment === "Dev" ||
    customFields.environment === "Staging" ||
    customFields.environment === "Production" ||
    customFields.environment === "-"
      ? customFields.environment
      : base.customFields.environment;

  return {
    ...base,
    id: typeof raw.id === "string" && raw.id ? raw.id : base.id,
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title : base.title,
    description: typeof raw.description === "string" ? raw.description : base.description,
    status: isStatus(raw.status) ? raw.status : base.status,
    priority: isPriority(raw.priority) ? raw.priority : base.priority,
    assignees,
    tags,
    startDate: typeof raw.startDate === "string" && raw.startDate ? raw.startDate : base.startDate,
    dueDate: typeof raw.dueDate === "string" && raw.dueDate ? raw.dueDate : base.dueDate,
    storyPoints,
    list: typeof raw.list === "string" && raw.list ? raw.list : base.list,
    space: typeof raw.space === "string" && raw.space ? raw.space : base.space,
    folder: typeof raw.folder === "string" ? raw.folder : base.folder,
    dependencies,
    comments: typeof raw.comments === "number" && Number.isFinite(raw.comments) ? raw.comments : 0,
    watchers,
    subtasks,
    checklists,
    attachments,
    customFields: { storyPoints, environment },
    timeEstimate: typeof raw.timeEstimate === "string" ? raw.timeEstimate : base.timeEstimate,
    timeLogged: typeof raw.timeLogged === "string" ? raw.timeLogged : base.timeLogged,
    meetingId: typeof raw.meetingId === "string" ? raw.meetingId : null,
    workspaceMeta: raw.workspaceMeta && typeof raw.workspaceMeta === "object" ? (raw.workspaceMeta as Record<string, unknown>) : {},
  };
}

function normalizeSpaces(value: unknown): SpaceConfig[] {
  if (!Array.isArray(value)) return defaultSpaces;
  const spaces = value
    .filter((item): item is Partial<SpaceConfig> & Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((space, index) => {
      const lists = Array.isArray(space.lists)
        ? (space.lists as unknown[])
            .filter((list): list is { name?: unknown; marker?: unknown } => Boolean(list) && typeof list === "object")
            .map((list, listIndex) => ({
              id: typeof (list as Record<string, unknown>).id === "string" && (list as Record<string, unknown>).id
                ? String((list as Record<string, unknown>).id)
                : `list-${index}-${listIndex}`,
              name: typeof list.name === "string" && list.name.trim() ? list.name : "Nova lista",
              marker: typeof list.marker === "string" && list.marker ? list.marker : "text-violet-500",
              favorite: Boolean((list as Record<string, unknown>).favorite),
              collapsed: Boolean((list as Record<string, unknown>).collapsed),
            }))
        : [];
      return {
        id: typeof space.id === "string" && space.id ? space.id : `space-${index}`,
        name: typeof space.name === "string" && space.name.trim() ? space.name : "Novo space",
        emoji: typeof space.emoji === "string" && space.emoji ? space.emoji : "🧩",
        favorite: Boolean(space.favorite),
        collapsed: Boolean(space.collapsed),
        lists: lists.length > 0 ? lists : [{ id: `list-${index}-0`, name: "Lista principal", marker: "text-violet-500" }],
      };
    });
  return spaces.length > 0 ? spaces : defaultSpaces;
}

function normalizeWorkspaceConfig(value: unknown): WorkspaceConfig | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<WorkspaceConfig> & Record<string, unknown>;
  const spaces = normalizeSpaces(raw.spaces);
  const members = Array.isArray(raw.members) && raw.members.length > 0 ? raw.members : defaultMembers;
  return {
    spaces,
    members,
    workspaceName: typeof raw.workspaceName === "string" && raw.workspaceName ? raw.workspaceName : undefined,
    favorites: Array.isArray(raw.favorites) ? raw.favorites.filter((item): item is string => typeof item === "string") : [],
    collapsedSpaces: Array.isArray(raw.collapsedSpaces) ? raw.collapsedSpaces.filter((item): item is string => typeof item === "string") : [],
    collapsedLists: Array.isArray(raw.collapsedLists) ? raw.collapsedLists.filter((item): item is string => typeof item === "string") : [],
    spaceOrder: Array.isArray(raw.spaceOrder) ? raw.spaceOrder.filter((item): item is string => typeof item === "string") : undefined,
    listOrder: Array.isArray(raw.listOrder) ? raw.listOrder.filter((item): item is string => typeof item === "string") : undefined,
    activeList: typeof raw.activeList === "string" && raw.activeList ? raw.activeList : undefined,
    activeSpaceId: typeof raw.activeSpaceId === "string" && raw.activeSpaceId ? raw.activeSpaceId : undefined,
    view: raw.view === "list" || raw.view === "board" || raw.view === "calendar" || raw.view === "gantt" || raw.view === "table" ? raw.view : undefined,
    groupBy: raw.groupBy === "status" || raw.groupBy === "priority" || raw.groupBy === "assignee" || raw.groupBy === "none" ? raw.groupBy : undefined,
    filterPriority:
      raw.filterPriority === "all" ||
      raw.filterPriority === "urgent" ||
      raw.filterPriority === "high" ||
      raw.filterPriority === "normal" ||
      raw.filterPriority === "low"
        ? raw.filterPriority
        : undefined,
    sortBy: raw.sortBy === "manual" || raw.sortBy === "due" || raw.sortBy === "priority" ? raw.sortBy : undefined,
  };
}

function loadStoredTasks(): Task[] {
  return [];
}

function loadStoredSpaces(): SpaceConfig[] {
  return defaultSpaces;
}

function secondsFromTime(value: string) {
  const hours = Number(value.match(/(\d+(?:\.\d+)?)h/)?.[1] ?? 0);
  const minutes = Number(value.match(/(\d+)m/)?.[1] ?? 0);
  const seconds = Number(value.match(/(\d+)s/)?.[1] ?? 0);
  return Math.round(hours * 3600 + minutes * 60 + seconds);
}

function timeFromSeconds(total: number) {
  const safe = Math.max(0, Math.round(total));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours && minutes && seconds) return `${hours}h ${minutes}m ${seconds}s`;
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  if (minutes && seconds) return `${minutes}m ${seconds}s`;
  if (minutes) return `${minutes}m`;
  return `${seconds}s`;
}

function readTheme(): AppTheme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  const dataset = document.documentElement.dataset.theme;
  if (VALID_THEMES.includes(dataset as AppTheme)) return dataset as AppTheme;
  if (VALID_THEMES.includes(stored as AppTheme)) return stored as AppTheme;
  return "light";
}

function applyTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  document
    .querySelectorAll<HTMLElement>("[data-theme-choice]")
    .forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.themeChoice === theme)));
}

function moveItem<T>(items: T[], from: number, to: number) {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function uniqueId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function blankTaskTemplate(index: number): Task {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: `task-template-${index}`,
    title: "Nova tarefa",
    description: "",
    status: "todo",
    priority: "normal",
    assignees: [],
    tags: [],
    startDate: today,
    dueDate: today,
    storyPoints: 0,
    list: "Geral",
    space: "Triade",
    folder: undefined,
    dependencies: [],
    comments: 0,
    watchers: [],
    subtasks: [],
    checklists: [],
    attachments: [],
    customFields: { storyPoints: 0, environment: "-" },
    timeEstimate: "0m",
    timeLogged: "0m",
    meetingId: null,
    workspaceMeta: {},
    favorite: false,
    position: index,
  };
}

const apiStatusToUi: Record<string, StatusKey> = {
  Backlog: "todo",
  "A Fazer": "todo",
  "Em andamento": "progress",
  "Em revisão": "review",
  Bloqueada: "review",
  Concluída: "complete",
  Cancelada: "complete",
  backlog: "todo",
  todo: "todo",
  in_progress: "progress",
  review: "review",
  blocked: "review",
  done: "complete",
  cancelled: "complete",
};

const uiStatusToApi: Record<StatusKey, string> = {
  todo: "A Fazer",
  progress: "Em andamento",
  review: "Em revisão",
  complete: "Concluída",
};

const apiPriorityToUi: Record<string, Priority> = {
  Urgente: "urgent",
  Alta: "high",
  Média: "normal",
  Baixa: "low",
  urgent: "urgent",
  high: "high",
  medium: "normal",
  low: "low",
};

const uiPriorityToApi: Record<Priority, string> = {
  urgent: "Urgente",
  high: "Alta",
  normal: "Média",
  low: "Baixa",
};

function taskFromApi(apiTask: ApiTask, index: number): Task {
  const base = blankTaskTemplate(index);
  const meta = apiTask.workspace_meta && typeof apiTask.workspace_meta === "object" ? apiTask.workspace_meta : {};
  const status = apiStatusToUi[apiTask.status ?? ""] ?? "todo";
  const priority = apiPriorityToUi[apiTask.priority ?? ""] ?? "normal";
  const areaTag = apiTask.area?.trim();
  const isMeetingTask = Boolean(apiTask.meeting_id);
  return normalizeTask({
    ...base,
    id: apiTask.id,
    title: apiTask.title,
    description: apiTask.description ?? "",
    status,
    priority,
    assignees: stringArray(meta.assignees).length ? stringArray(meta.assignees) : apiTask.assignee ? [apiTask.assignee.slice(0, 2).toUpperCase()] : [],
    tags: stringArray(meta.tags).length ? stringArray(meta.tags) : [isMeetingTask ? "reunião" : "", areaTag ?? ""].filter(Boolean),
    startDate: firstString(meta.startDate) ?? apiTask.due_date ?? base.startDate,
    dueDate: apiTask.due_date ?? base.dueDate,
    storyPoints: apiTask.score ?? base.storyPoints,
    list: firstString(meta.list) ?? (apiTask.project?.trim() || (isMeetingTask ? "Reuniões" : "Geral")),
    space: firstString(meta.space) ?? (isMeetingTask ? "Triade" : (apiTask.area?.trim() || "Triade")),
    folder: firstString(meta.folder) ?? (isMeetingTask ? "Memória da empresa" : base.folder),
    dependencies: stringArray(meta.dependencies),
    comments: typeof meta.comments === "number" ? meta.comments : 0,
    watchers: stringArray(meta.watchers).length ? stringArray(meta.watchers) : [],
    subtasks: Array.isArray(meta.subtasks) ? meta.subtasks : [],
    checklists: stringArray(meta.checklists).length ? stringArray(meta.checklists) : isMeetingTask ? ["Validar decisão", "Executar próximo passo"] : [],
    attachments: stringArray(meta.attachments),
    customFields: meta.customFields && typeof meta.customFields === "object" ? meta.customFields : { storyPoints: apiTask.score ?? base.storyPoints, environment: "-" },
    timeEstimate: firstString(meta.timeEstimate) ?? base.timeEstimate,
    timeLogged: firstString(meta.timeLogged) ?? "0h",
    meetingId: apiTask.meeting_id ?? null,
    workspaceMeta: meta,
    position: apiTask.position ?? base.position,
  }, index);
}

function taskToApiPayload(task: Task, options: { includeMeetingId?: boolean } = {}) {
  const payload: Record<string, string | number | Record<string, unknown> | null | undefined> = {
    title: task.title,
    description: task.description,
    status: uiStatusToApi[task.status],
    priority: uiPriorityToApi[task.priority],
    project: task.list,
    area: task.tags[0] === "reunião" ? "Reuniões" : task.space,
    due_date: task.dueDate,
    score: task.storyPoints,
    position: task.position ?? 0,
    workspace_meta: {
      ...(task.workspaceMeta ?? {}),
      assignees: task.assignees ?? [],
      tags: task.tags ?? [],
      startDate: task.startDate,
      dueDate: task.dueDate,
      storyPoints: task.storyPoints,
      list: task.list,
      space: task.space,
      folder: task.folder ?? null,
      dependencies: task.dependencies ?? [],
      comments: task.comments ?? 0,
      watchers: task.watchers ?? [],
      subtasks: task.subtasks ?? [],
      checklists: task.checklists ?? [],
      attachments: task.attachments ?? [],
      customFields: task.customFields ?? { storyPoints: task.storyPoints ?? 0, environment: "-" },
      timeEstimate: task.timeEstimate,
      timeLogged: task.timeLogged,
      meetingId: task.meetingId ?? null,
    },
  };
  if (options.includeMeetingId) payload.meeting_id = task.meetingId ?? undefined;
  return payload;
}

function shouldSyncPatch(patch: Partial<Task>) {
  return [
    "title",
    "description",
    "status",
    "priority",
    "position",
    "assignees",
    "tags",
    "startDate",
    "dueDate",
    "storyPoints",
    "list",
    "space",
    "folder",
    "dependencies",
    "comments",
    "watchers",
    "subtasks",
    "checklists",
    "attachments",
    "customFields",
    "timeEstimate",
    "timeLogged",
    "meetingId",
  ].some(
    (key) => key in patch,
  );
}

async function fetchApiTasks(): Promise<Task[] | null> {
  const res = await fetch("/api/tasks?limit=500", { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!Array.isArray(data?.tasks)) return null;
  return data.tasks.map((task: ApiTask, index: number) => taskFromApi(task, index));
}

async function fetchWorkspaceConfig(): Promise<WorkspaceConfig | null> {
  const res = await fetch("/api/tasks/workspace", { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return normalizeWorkspaceConfig(data?.workspace);
}

async function saveWorkspaceConfig(config: WorkspaceConfig) {
  await fetch("/api/tasks/workspace", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(config),
  });
}

type WorkspaceDialogState =
  | { kind: "space"; mode: "create"; spaceId?: string }
  | { kind: "space"; mode: "rename"; spaceId: string }
  | { kind: "list"; mode: "create"; spaceId: string }
  | { kind: "list"; mode: "rename"; spaceId: string; listId: string }
  | { kind: "workspace"; mode: "rename" }
  | null;

export function TasksWorkspace() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [spaces, setSpaces] = useState<SpaceConfig[]>(defaultSpaces);
  const [members, setMembers] = useState<TeamMember[]>(defaultMembers);
  const [workspaceName, setWorkspaceName] = useState("Triade TSP");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [collapsedSpaces, setCollapsedSpaces] = useState<string[]>([]);
  const [collapsedLists, setCollapsedLists] = useState<string[]>([]);
  const [spaceOrder, setSpaceOrder] = useState<string[]>([]);
  const [listOrder, setListOrder] = useState<string[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string>("product");
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<ViewMode>("list");
  const [activeList, setActiveList] = useState("Sprint 24");
  const [query, setQuery] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [theme, setTheme] = useState<AppTheme>("light");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [sortBy, setSortBy] = useState<"manual" | "due" | "priority">("manual");
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dialog, setDialog] = useState<WorkspaceDialogState>(null);
  const [dialogValue, setDialogValue] = useState("");
  const [dialogMarker, setDialogMarker] = useState("text-violet-500");
  const [dialogEmoji, setDialogEmoji] = useState("🧩");
  const [dialogLoading, setDialogLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTheme(readTheme());
      setTasks(loadStoredTasks());
      setSpaces(loadStoredSpaces());
      setMembers(defaultMembers);
      setWorkspaceName("Triade TSP");
      setFavorites([]);
      setCollapsedSpaces([]);
      setCollapsedLists([]);
      setSpaceOrder([]);
      setListOrder([]);
      setActiveSpaceId("product");
      setHydrated(true);
      fetchApiTasks()
        .then((apiTasks) => {
    if (apiTasks?.length) {
            setTasks(apiTasks);
            const hasMeetingsList = apiTasks.some((task) => task.list === "Reuniões");
            if (hasMeetingsList && !apiTasks.some((task) => task.list === "Sprint 24")) {
              setActiveList("Reuniões");
            }
            if (hasMeetingsList) {
              setSpaces((current) =>
                current.some((space) => space.lists.some((list) => list.name === "Reuniões"))
                  ? current
                  : [
                      {
                        id: "triade-meetings",
                        name: "Triade",
                        emoji: "✅",
                        lists: [{ id: "reunioes", name: "Reuniões", marker: "text-emerald-500" }],
                      },
                      ...current,
                    ],
              );
            }
          }
        })
        .catch(() => undefined);
      fetchWorkspaceConfig()
        .then((workspace) => {
          if (!workspace) return;
          setSpaces(workspace.spaces);
          if (workspace.members?.length) setMembers(workspace.members);
          if (workspace.workspaceName) setWorkspaceName(workspace.workspaceName);
          setFavorites(workspace.favorites ?? []);
          setCollapsedSpaces(workspace.collapsedSpaces ?? []);
          setCollapsedLists(workspace.collapsedLists ?? []);
          setSpaceOrder(workspace.spaceOrder ?? []);
          setListOrder(workspace.listOrder ?? []);
          if (workspace.activeSpaceId) setActiveSpaceId(workspace.activeSpaceId);
          if (workspace.activeList) setActiveList(workspace.activeList);
          if (workspace.view) setView(workspace.view);
          if (workspace.groupBy) setGroupBy(workspace.groupBy);
          if (workspace.filterPriority) setFilterPriority(workspace.filterPriority);
          if (workspace.sortBy) setSortBy(workspace.sortBy);
        })
        .catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const syncTheme = () => setTheme(readTheme());
    syncTheme();
    window.addEventListener("storage", syncTheme);
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      window.removeEventListener("storage", syncTheme);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      void saveWorkspaceConfig({ spaces, members, workspaceName, favorites, collapsedSpaces, collapsedLists, spaceOrder, listOrder, activeList, activeSpaceId, view, groupBy, filterPriority, sortBy }).catch(() => undefined);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [activeList, activeSpaceId, collapsedLists, collapsedSpaces, favorites, groupBy, hydrated, listOrder, members, sortBy, spaceOrder, spaces, filterPriority, view, workspaceName]);

  const visibleTasks = useMemo(() => {
    const searched = tasks.filter((task) => {
      const inList = task.list === activeList || activeList === "Home";
      const text = `${task.title} ${task.description} ${(task.tags ?? []).join(" ")} ${(task.assignees ?? []).join(" ")}`.toLowerCase();
      const matchesQuery = query.trim().length === 0 || text.includes(query.toLowerCase());
      const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
      return inList && matchesQuery && matchesPriority;
    });
    if (sortBy === "due") return [...searched].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    if (sortBy === "priority") {
      const order: Record<Priority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
      return [...searched].sort((a, b) => order[a.priority] - order[b.priority]);
    }
    return searched;
  }, [activeList, filterPriority, query, sortBy, tasks]);

  const orderedSpaces = useMemo(() => {
    if (!spaceOrder.length) return spaces;
    const byId = new Map(spaces.map((space) => [space.id, space] as const));
    const ordered = spaceOrder.map((id) => byId.get(id)).filter((space): space is SpaceConfig => Boolean(space));
    const rest = spaces.filter((space) => !spaceOrder.includes(space.id));
    return [...ordered, ...rest];
  }, [spaceOrder, spaces]);

  const orderedWorkspaceSpaces = useMemo(
    () =>
      orderedSpaces.map((space) => ({
        ...space,
        lists: listOrder.length
          ? [
              ...listOrder
                .map((key) => {
                  const [spaceId, listId] = key.split(":");
                  if (spaceId !== space.id) return null;
                  return space.lists.find((list) => list.id === listId) ?? null;
                })
                .filter((list): list is ListConfig => Boolean(list)),
              ...space.lists.filter((list) => !listOrder.includes(`${space.id}:${list.id}`)),
            ]
          : space.lists,
      })),
    [listOrder, orderedSpaces],
  );

  const activeSpace = orderedWorkspaceSpaces.find((space) => space.id === activeSpaceId) ?? orderedWorkspaceSpaces[0] ?? defaultSpaces[0];
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

  async function syncCreateTask(task: Task) {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(taskToApiPayload(task, { includeMeetingId: true })),
      });
      if (!res.ok) throw new Error("Falha ao criar tarefa.");
      const saved = (await res.json()) as ApiTask;
      setTasks((current) => [taskFromApi(saved, current.length), ...current.filter((item) => item.id !== task.id)]);
      setSelectedTaskId(saved.id);
    } catch {
      throw new Error("Falha ao persistir a nova tarefa.");
    }
  }

  async function syncPatchTask(task: Task, patch: Partial<Task>) {
    if (!shouldSyncPatch(patch)) return null;
    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(taskToApiPayload(task)),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.error ?? "Falha ao salvar a alteração.");
    }
    return data as ApiTask;
  }

  function patchTask(id: string, patch: Partial<Task>) {
    const snapshot = tasks;
    setTasks((current) => {
      const next = current.map((task) => (task.id === id ? { ...task, ...patch } : task));
      const updated = next.find((task) => task.id === id);
      if (updated) {
        void syncPatchTask(updated, patch)
          .then((saved) => {
            if (!saved) return;
            setTasks((latest) =>
              latest.map((task) =>
                task.id === id ? taskFromApi(saved, latest.findIndex((item) => item.id === id)) : task,
              ),
            );
          })
          .catch(() => {
            setTasks(snapshot);
          });
      }
      return next;
    });
  }

  function requestDeleteTask(id: string) {
    const task = tasks.find((item) => item.id === id) ?? null;
    setDeleteTarget(task);
  }

  async function confirmDeleteTask() {
    if (!deleteTarget) return;
    const snapshot = tasks;
    setDeleteLoading(true);
    setTasks((current) => current.filter((task) => task.id !== deleteTarget.id));
    setSelectedTaskId(null);
    try {
      const response = await fetch(`/api/tasks/${deleteTarget.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Falha ao excluir tarefa.");
      setDeleteTarget(null);
    } catch {
      setTasks(snapshot);
    } finally {
      setDeleteLoading(false);
    }
  }

  function openWorkspaceRename() {
    setDialog({ kind: "workspace", mode: "rename" });
    setDialogValue(workspaceName);
  }

  function openCreateSpace() {
    setDialog({ kind: "space", mode: "create" });
    setDialogValue("");
    setDialogEmoji("🧩");
    setDialogMarker("text-violet-500");
  }

  function openRenameSpace(space: SpaceConfig) {
    setDialog({ kind: "space", mode: "rename", spaceId: space.id });
    setDialogValue(space.name);
    setDialogEmoji(space.emoji);
  }

  function openCreateList(spaceId: string) {
    setDialog({ kind: "list", mode: "create", spaceId });
    setDialogValue("");
    setDialogMarker("text-violet-500");
  }

  function openRenameList(spaceId: string, list: ListConfig) {
    setDialog({ kind: "list", mode: "rename", spaceId, listId: list.id });
    setDialogValue(list.name);
    setDialogMarker(list.marker);
  }

  function toggleFavorite(key: string) {
    setFavorites((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  function toggleSpaceCollapse(spaceId: string) {
    setCollapsedSpaces((current) => (current.includes(spaceId) ? current.filter((item) => item !== spaceId) : [...current, spaceId]));
  }

  function toggleListCollapse(spaceId: string, listId: string) {
    const key = `${spaceId}:${listId}`;
    setCollapsedLists((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  function moveSpace(spaceId: string, direction: -1 | 1) {
    setSpaces((current) => {
      const index = current.findIndex((space) => space.id === spaceId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = moveItem(current, index, nextIndex);
      setSpaceOrder(next.map((space) => space.id));
      return next;
    });
  }

  function moveList(spaceId: string, listId: string, direction: -1 | 1) {
    setSpaces((current) =>
      current.map((space) => {
        if (space.id !== spaceId) return space;
        const index = space.lists.findIndex((list) => list.id === listId);
        const nextIndex = index + direction;
        if (index < 0 || nextIndex < 0 || nextIndex >= space.lists.length) return space;
        const nextLists = moveItem(space.lists, index, nextIndex);
        setListOrder(
          current.flatMap((item) =>
            item.id === spaceId ? nextLists.map((list) => `${spaceId}:${list.id}`) : item.lists.map((list) => `${item.id}:${list.id}`),
          ),
        );
        return { ...space, lists: nextLists };
      }),
    );
  }

  function moveTaskByDirection(id: string, direction: -1 | 1) {
    setTasks((current) => {
      const sameList = current.filter((task) => task.list === activeList);
      const index = sameList.findIndex((task) => task.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= sameList.length) return current;
      const a = sameList[index];
      const b = sameList[nextIndex];
      const aPosition = a.position ?? index;
      const bPosition = b.position ?? nextIndex;
      const next = current.map((task) => {
        if (task.id === a.id) return { ...task, position: bPosition };
        if (task.id === b.id) return { ...task, position: aPosition };
        return task;
      });
      void syncPatchTask({ ...a, position: bPosition } as Task, { position: bPosition }).catch(() => undefined);
      void syncPatchTask({ ...b, position: aPosition } as Task, { position: aPosition }).catch(() => undefined);
      return next;
    });
  }

  async function submitDialog(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog) return;
    setDialogLoading(true);
    const value = dialogValue.trim();
    try {
      if (dialog.kind === "workspace") {
        if (value) setWorkspaceName(value);
        setDialog(null);
      } else if (dialog.kind === "space" && dialog.mode === "create") {
        if (!value) return;
        const space: SpaceConfig = {
          id: uniqueId("space"),
          name: value,
          emoji: dialogEmoji || "🧩",
          lists: [{ id: uniqueId("list"), name: "Lista principal", marker: dialogMarker || "text-violet-500" }],
        };
        setSpaces((current) => [...current, space]);
        setSpaceOrder((current) => [...current, space.id]);
        setActiveSpaceId(space.id);
        setActiveList(space.lists[0].name);
        setDialog(null);
      } else if (dialog.kind === "space" && dialog.mode === "rename") {
        if (!value) return;
        setSpaces((current) => current.map((space) => (space.id === dialog.spaceId ? { ...space, name: value, emoji: dialogEmoji || space.emoji } : space)));
        if (activeSpaceId === dialog.spaceId) setActiveSpaceId(dialog.spaceId);
        setDialog(null);
      } else if (dialog.kind === "list" && dialog.mode === "create") {
        if (!value) return;
        const newList: ListConfig = { id: uniqueId("list"), name: value, marker: dialogMarker || "text-violet-500" };
        setSpaces((current) =>
          current.map((space) => (space.id === dialog.spaceId ? { ...space, lists: [...space.lists, newList] } : space)),
        );
        setListOrder((current) => [...current, `${dialog.spaceId}:${newList.id}`]);
        setActiveSpaceId(dialog.spaceId);
        setActiveList(newList.name);
        setDialog(null);
      } else if (dialog.kind === "list" && dialog.mode === "rename") {
        if (!value) return;
        const previousListName = spaces.find((space) => space.id === dialog.spaceId)?.lists.find((list) => list.id === dialog.listId)?.name;
        setSpaces((current) =>
          current.map((space) =>
            space.id === dialog.spaceId
              ? {
                  ...space,
                  lists: space.lists.map((list) => (list.id === dialog.listId ? { ...list, name: value, marker: dialogMarker || list.marker } : list)),
                }
              : space,
          ),
        );
        if (previousListName && activeList === previousListName) setActiveList(value);
        setDialog(null);
      }
    } finally {
      setDialogLoading(false);
    }
  }

  async function createTask(status: StatusKey = "todo") {
    const snapshot = tasks;
    const taskPosition = Math.max(0, ...tasks.filter((task) => task.list === activeList).map((task) => task.position ?? 0)) + 1;
    const draft = blankTaskTemplate(tasks.length + 1);
    const task: Task = {
      ...draft,
      id: uniqueId("task"),
      title: "Nova tarefa",
      description: "Descreva a entrega, critérios de aceite, links e responsáveis.",
      status,
      priority: "normal",
      assignees: [],
      tags: activeList ? [activeList] : [],
      storyPoints: 1,
      list: activeList,
      space: activeSpace?.name ?? "Triade",
      folder: activeList === "Sprint 24" ? "Sprints" : undefined,
      dependencies: [],
      comments: 0,
      watchers: [],
      subtasks: [],
      checklists: [],
      attachments: [],
      customFields: { storyPoints: 1, environment: "-" },
      timeEstimate: "0m",
      timeLogged: "0h",
      position: taskPosition,
    };
    setTasks((current) => [task, ...current]);
    setSelectedTaskId(task.id);
    try {
      await syncCreateTask(task);
    } catch {
      setTasks(snapshot);
      setSelectedTaskId(null);
    }
  }

  function moveTask(id: string, status: StatusKey) {
    patchTask(id, { status });
  }

  function cycleTheme() {
    const next: AppTheme = theme === "light" ? "dark" : theme === "dark" ? "navy" : "light";
    applyTheme(next);
    setTheme(next);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if (!isTyping && event.key === "?") setPaletteOpen(true);
      if (!isTyping && event.key.toLowerCase() === "c") createTask();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const isDarkTheme = theme !== "light";

  return (
    <div
      className={cls(
        "fixed inset-0 z-[80] flex overflow-hidden bg-white text-[#1d2129]",
        isDarkTheme && "dark bg-[#1a1c23] text-[#e6e8ec]",
        theme === "navy" && "bg-[#071e33] text-[#ecf7ff]",
      )}
      data-open-clickup-theme={theme}
    >
      <aside
        className={cls(
          "flex w-[260px] shrink-0 flex-col border-r",
          isDarkTheme ? "border-[#2a2e38] bg-[#15171d] text-[#e6e8ec]" : "border-[#e8eaed] bg-[#fafbfc] text-[#1d2129]",
        )}
      >
          <div className={cls("flex h-[52px] items-center gap-2 border-b px-4", isDarkTheme ? "border-[#2a2e38]" : "border-[#e8eaed]")}>
            <div className="grid size-7 place-items-center rounded-md bg-[#041827] text-[11px] font-black tracking-tight text-emerald-300">TSP</div>
            <div className="min-w-0">
            <button type="button" onClick={openWorkspaceRename} className="block truncate font-semibold text-left hover:text-[#7b68ee]">{workspaceName}</button>
            <span className="block truncate text-[11px] text-slate-500">Saúde & Performance</span>
          </div>
          <ChevronDown className="ml-auto size-4 text-slate-400" />
          <PanelLeftClose className="size-4 text-slate-400" />
        </div>
        <div className="p-3">
          <label className="flex h-8 items-center gap-2 rounded-md border border-[#e8eaed] bg-white px-2 text-sm text-slate-500 dark:border-[#2a2e38] dark:bg-[#20232c]">
            <Search className="size-4" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="w-full bg-transparent outline-none" />
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] dark:bg-[#2f333f]">⌘K</span>
          </label>
        </div>
        <nav className="space-y-1 border-b border-[#e8eaed] px-3 pb-3 text-sm dark:border-[#2a2e38]">
          <SidebarLink icon={<Home className="size-4" />} label="Home" active={activeList === "Home"} onClick={() => setActiveList("Home")} />
          <SidebarLink icon={<Inbox className="size-4" />} label="Inbox" badge="3" />
          <SidebarLink icon={<Gauge className="size-4" />} label="Dashboards" />
        </nav>
        <div className="flex-1 overflow-y-auto px-2 py-3 text-sm">
          <div className="mb-2 flex items-center justify-between px-2 text-[11px] font-medium uppercase text-slate-400">
            Spaces <button onClick={openCreateSpace} title="Add space" className="rounded p-1 hover:bg-[#eceef1] dark:hover:bg-[#262a34]"><Plus className="size-4" /></button>
          </div>
          {orderedWorkspaceSpaces.map((space) => (
            <Space
              key={space.id}
              space={space}
              collapsed={collapsedSpaces.includes(space.id)}
              favorite={favorites.includes(`space:${space.id}`)}
              onToggleCollapse={() => toggleSpaceCollapse(space.id)}
              onAddList={() => openCreateList(space.id)}
              onToggleFavorite={() => toggleFavorite(`space:${space.id}`)}
              onRename={() => openRenameSpace(space)}
              onMoveUp={() => moveSpace(space.id, -1)}
              onMoveDown={() => moveSpace(space.id, 1)}
            >
              {space.lists.map((list) => (
                <FolderLink
                  key={`${space.id}-${list.id}`}
                  spaceId={space.id}
                  list={list}
                  active={activeList === list.name}
                  collapsed={collapsedLists.includes(`${space.id}:${list.id}`)}
                  favorite={favorites.includes(`list:${space.id}:${list.id}`)}
                  onClick={() => {
                    setActiveList(list.name);
                    setActiveSpaceId(space.id);
                  }}
                  onToggleCollapse={() => toggleListCollapse(space.id, list.id)}
                  onToggleFavorite={() => toggleFavorite(`list:${space.id}:${list.id}`)}
                  onRename={() => openRenameList(space.id, list)}
                  onMoveUp={() => moveList(space.id, list.id, -1)}
                  onMoveDown={() => moveList(space.id, list.id, 1)}
                />
              ))}
            </Space>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-[#e8eaed] p-3 dark:border-[#2a2e38]">
          <Avatar id="SC" size="md" />
          <span className="truncate text-sm">Will Trindade</span>
          <button onClick={() => setNoticeOpen(true)} className="ml-auto rounded p-1.5 text-slate-500 hover:bg-[#eceef1] dark:hover:bg-[#262a34]"><Bell className="size-4" /></button>
          <button onClick={() => setSettingsOpen(true)} className="rounded p-1.5 text-slate-500 hover:bg-[#eceef1] dark:hover:bg-[#262a34]"><Settings className="size-4" /></button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-white dark:bg-[#1a1c23]">
        <header className="border-b border-[#e8eaed] dark:border-[#2a2e38]">
          <div className="flex items-center gap-2 px-4 pt-3 text-sm text-slate-500">
            <span className="grid size-4 place-items-center rounded bg-[#7b68ee] text-[10px] text-white">🚀</span>
            {activeSpace?.name ?? "Triade"} {activeList === "Sprint 24" ? <span>/ Sprints</span> : null}
          </div>
          <div className="flex items-center px-4 py-1">
            <button
              type="button"
              onClick={() =>
                setDialog({
                  kind: "list",
                  mode: "rename",
                  spaceId: activeSpace?.id ?? "product",
                  listId: activeSpace?.lists.find((item) => item.name === activeList)?.id ?? activeSpace?.lists[0]?.id ?? "list",
                })
              }
              className="text-xl font-semibold hover:text-[#7b68ee]"
            >
              {activeList}
            </button>
            <button className="ml-2 text-slate-400" onClick={() => toggleFavorite(`list:${activeSpace?.id ?? "product"}:${activeList}`)}>{favorites.includes(`list:${activeSpace?.id ?? "product"}:${activeList}`) ? "★" : "☆"}</button>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="ml-2 rounded p-1 text-slate-400 hover:bg-[#f4f5f7] dark:hover:bg-[#262a34]"><MoreHorizontal className="size-4" /></button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="z-[150] min-w-56 rounded-md border border-[#e8eaed] bg-white p-1 shadow-xl dark:border-[#2a2e38] dark:bg-[#20232c]">
                  <DropdownMenu.Item onSelect={() => setSettingsOpen(true)} className="rounded px-3 py-2 text-sm outline-none hover:bg-[#f1effd]">Open settings</DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => setDialog({ kind: "list", mode: "rename", spaceId: activeSpace?.id ?? "product", listId: activeSpace?.lists.find((item) => item.name === activeList)?.id ?? activeSpace?.lists[0]?.id ?? "list" })} className="rounded px-3 py-2 text-sm outline-none hover:bg-[#f1effd]">Rename list</DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => createTask()} className="rounded px-3 py-2 text-sm outline-none hover:bg-[#f1effd]">New task</DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
          <div className="flex h-[42px] items-center justify-between px-3">
            <div className="flex items-center gap-0.5">
              {views.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setView(item.key)}
                  className={cls(
                    "flex h-[42px] items-center gap-1.5 border-b-2 px-3 text-sm transition",
                    view === item.key ? "border-[#7b68ee] font-medium text-[#1d2129] dark:text-white" : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white",
                  )}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
              <button className="flex h-[42px] items-center gap-1.5 px-3 text-sm text-slate-500"><Plus className="size-4" /> View</button>
            </div>
            <div className="flex items-center gap-1 text-sm text-slate-500">
              <ToolbarButton icon={<Users className="size-4" />} label="Assignee" />
              <select value={groupBy} onChange={(event) => setGroupBy(event.target.value as GroupBy)} className="h-8 rounded bg-transparent px-2 outline-none hover:bg-[#f4f5f7] dark:hover:bg-[#262a34]">
                <option value="status">Group: Status</option>
                <option value="priority">Group: Priority</option>
                <option value="assignee">Group: Assignee</option>
                <option value="none">No Group</option>
              </select>
              <select value={filterPriority} onChange={(event) => setFilterPriority(event.target.value as Priority | "all")} className="h-8 rounded bg-transparent px-2 outline-none hover:bg-[#f4f5f7] dark:hover:bg-[#262a34]">
                <option value="all">Filter</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value as "manual" | "due" | "priority")} className="h-8 rounded bg-transparent px-2 outline-none hover:bg-[#f4f5f7] dark:hover:bg-[#262a34]">
                <option value="manual">Sort</option>
                <option value="due">Due date</option>
                <option value="priority">Priority</option>
              </select>
              <button onClick={() => setPaletteOpen(true)} className="rounded p-2 hover:bg-[#f4f5f7] dark:hover:bg-[#262a34]"><Search className="size-4" /></button>
              <button
                onClick={() => createTask()}
                className="ml-1 flex h-8 items-center gap-1 rounded bg-[#7b68ee] px-3 font-medium text-white hover:bg-[#6c5ce7]"
              >
                <Plus className="size-4" /> Add Task
              </button>
            </div>
          </div>
        </header>

        <section className="min-h-0 flex-1 overflow-auto">
          {view === "list" && (
            <ListView
              tasks={visibleTasks}
              groupBy={groupBy}
              favorites={favorites}
              onOpen={setSelectedTaskId}
              onAdd={createTask}
              onDelete={requestDeleteTask}
              onToggleFavorite={(id) => toggleFavorite(`task:${id}`)}
              onMoveUp={(id) => moveTaskByDirection(id, -1)}
              onMoveDown={(id) => moveTaskByDirection(id, 1)}
            />
          )}
          {view === "board" && <BoardView tasks={visibleTasks} onOpen={setSelectedTaskId} onMove={moveTask} onAdd={createTask} />}
          {view === "calendar" && <CalendarView tasks={visibleTasks} onOpen={setSelectedTaskId} />}
          {view === "gantt" && <GanttView tasks={visibleTasks} onOpen={setSelectedTaskId} dark={isDarkTheme} />}
          {view === "table" && <TableView tasks={visibleTasks} groupBy={groupBy} onOpen={setSelectedTaskId} onPatch={patchTask} onDelete={requestDeleteTask} />}
        </section>
      </main>

      <button
        onClick={cycleTheme}
        className="fixed bottom-5 left-5 z-[90] grid size-10 place-items-center rounded-full border border-white/20 bg-[#1d2129] text-white shadow-xl"
        aria-label="Alternar tema do painel"
      >
        {isDarkTheme ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>

      {paletteOpen ? (
        <CommandPalette
          tasks={tasks}
          onClose={() => setPaletteOpen(false)}
          onOpenTask={(id) => {
            setSelectedTaskId(id);
            setPaletteOpen(false);
          }}
        />
      ) : null}
      {dialog ? (
        <WorkspaceDialog
          dialog={dialog}
          value={dialogValue}
          marker={dialogMarker}
          emoji={dialogEmoji}
          loading={dialogLoading}
          onValueChange={setDialogValue}
          onMarkerChange={setDialogMarker}
          onEmojiChange={setDialogEmoji}
          onCancel={() => setDialog(null)}
          onSubmit={submitDialog}
        />
      ) : null}
      {selectedTask ? <TaskModal task={selectedTask} members={members} onClose={() => setSelectedTaskId(null)} onPatch={patchTask} onDelete={requestDeleteTask} /> : null}
      {noticeOpen ? <PanelModal title="Notifications" onClose={() => setNoticeOpen(false)}><NotificationList tasks={tasks} /></PanelModal> : null}
      {settingsOpen ? (
        <PanelModal title="Workspace settings" onClose={() => setSettingsOpen(false)}>
          <SettingsPanel
            spaces={spaces}
            tasks={tasks}
            onReset={() => {
              setTasks([]);
              setSpaces(defaultSpaces);
              setWorkspaceName("Triade TSP");
              setMembers(defaultMembers);
              setFavorites([]);
              setCollapsedSpaces([]);
              setCollapsedLists([]);
              setSpaceOrder([]);
              setListOrder([]);
              setActiveSpaceId("product");
              setActiveList("Sprint 24");
            }}
          />
        </PanelModal>
      ) : null}
      <Dialog.Root
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[130] bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[131] w-[min(92vw,480px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#e8eaed] bg-white p-6 shadow-2xl dark:border-[#2a2e38] dark:bg-[#20232c]">
            <Dialog.Title className="text-lg font-semibold text-slate-900 dark:text-white">Excluir tarefa</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 text-slate-500">
              {deleteTarget ? `Tem certeza que deseja excluir "${deleteTarget.title}"? Esta ação não pode ser desfeita.` : ""}
            </Dialog.Description>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="h-10 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteTask()}
                disabled={deleteLoading}
                className="h-10 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                {deleteLoading ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function SidebarLink({ icon, label, active, badge, onClick }: { icon: React.ReactNode; label: string; active?: boolean; badge?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={cls("flex h-8 w-full items-center gap-3 rounded px-2 text-left hover:bg-[#eceef1] dark:hover:bg-[#262a34]", active && "bg-[#f1effd] text-[#7b68ee] dark:bg-[#2c2550]")}>
      {icon}
      <span>{label}</span>
      {badge ? <span className="ml-auto rounded-full bg-[#7b68ee] px-1.5 text-xs text-white">{badge}</span> : null}
    </button>
  );
}

function Space({
  space,
  collapsed,
  favorite,
  children,
  onAddList,
  onToggleCollapse,
  onToggleFavorite,
  onRename,
  onMoveUp,
  onMoveDown,
}: {
  space: SpaceConfig;
  collapsed?: boolean;
  favorite?: boolean;
  children: React.ReactNode;
  onAddList?: () => void;
  onToggleCollapse?: () => void;
  onToggleFavorite?: () => void;
  onRename?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  return (
    <div className="mb-2">
      <div className="flex h-8 items-center gap-2 rounded px-2 font-semibold">
        <button type="button" onClick={onToggleCollapse} className="rounded p-1 text-slate-400 hover:bg-[#eceef1] dark:hover:bg-[#262a34]">
          {collapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
        </button>
        <button type="button" onClick={onToggleFavorite} className="rounded px-1 text-slate-400 hover:bg-[#eceef1] dark:hover:bg-[#262a34]">
          {favorite ? "★" : "☆"}
        </button>
        <span className="grid size-5 place-items-center rounded bg-[#f1effd]">{space.emoji}</span>
        <button type="button" onClick={onRename} className="min-w-0 flex-1 truncate text-left hover:text-[#7b68ee]">
          {space.name}
        </button>
        <button onClick={onAddList} title="Add list" className="rounded p-1 text-slate-400 hover:bg-[#eceef1] hover:text-[#7b68ee] dark:hover:bg-[#262a34]">
          <Plus className="size-3" />
        </button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="rounded p-1 text-slate-400 hover:bg-[#eceef1] dark:hover:bg-[#262a34]">
              <MoreHorizontal className="size-3" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="z-[150] min-w-44 rounded-md border border-[#e8eaed] bg-white p-1 shadow-xl dark:border-[#2a2e38] dark:bg-[#20232c]">
              <DropdownMenu.Item onSelect={onRename} className="rounded px-3 py-2 text-sm outline-none hover:bg-[#f1effd]">Rename</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={onToggleFavorite} className="rounded px-3 py-2 text-sm outline-none hover:bg-[#f1effd]">{favorite ? "Unfavorite" : "Favorite"}</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={onMoveUp} className="rounded px-3 py-2 text-sm outline-none hover:bg-[#f1effd]">Move up</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={onMoveDown} className="rounded px-3 py-2 text-sm outline-none hover:bg-[#f1effd]">Move down</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      {!collapsed ? <div className="ml-5 space-y-1">{children}</div> : null}
    </div>
  );
}

function FolderLink({
  list,
  active,
  collapsed,
  favorite,
  onClick,
  onToggleCollapse,
  onToggleFavorite,
  onRename,
  onMoveUp,
  onMoveDown,
}: {
  spaceId: string;
  list: ListConfig;
  active?: boolean;
  collapsed?: boolean;
  favorite?: boolean;
  onClick: () => void;
  onToggleCollapse?: () => void;
  onToggleFavorite?: () => void;
  onRename?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  return (
    <div className={cls("flex h-8 w-full items-center gap-1 rounded px-1 text-left hover:bg-[#eceef1] dark:hover:bg-[#262a34]", active && "bg-[#f1effd] text-[#7b68ee] dark:bg-[#2c2550]")}>
      <button type="button" onClick={onToggleCollapse} className="rounded p-1 text-slate-400 hover:bg-white/70 dark:hover:bg-black/20">
        {collapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
      </button>
      <button type="button" onClick={onToggleFavorite} className="rounded px-1 text-slate-400 hover:bg-white/70 dark:hover:bg-black/20">
        {favorite ? "★" : "☆"}
      </button>
      <button onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2 truncate text-left">
        <List className={cls("size-4", list.marker)} />
        <span className="truncate">{list.name}</span>
      </button>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="rounded p-1 text-slate-400 hover:bg-white/70 dark:hover:bg-black/20">
            <MoreHorizontal className="size-3" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="z-[150] min-w-44 rounded-md border border-[#e8eaed] bg-white p-1 shadow-xl dark:border-[#2a2e38] dark:bg-[#20232c]">
            <DropdownMenu.Item onSelect={onRename} className="rounded px-3 py-2 text-sm outline-none hover:bg-[#f1effd]">Rename</DropdownMenu.Item>
            <DropdownMenu.Item onSelect={onToggleFavorite} className="rounded px-3 py-2 text-sm outline-none hover:bg-[#f1effd]">{favorite ? "Unfavorite" : "Favorite"}</DropdownMenu.Item>
            <DropdownMenu.Item onSelect={onMoveUp} className="rounded px-3 py-2 text-sm outline-none hover:bg-[#f1effd]">Move up</DropdownMenu.Item>
            <DropdownMenu.Item onSelect={onMoveDown} className="rounded px-3 py-2 text-sm outline-none hover:bg-[#f1effd]">Move down</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

function ToolbarButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <button className="flex h-8 items-center gap-1.5 rounded px-2 hover:bg-[#f4f5f7] dark:hover:bg-[#262a34]">{icon}{label}</button>;
}

function groupTasks(tasks: Task[], groupBy: GroupBy) {
  if (groupBy === "none") return [{ key: "all", label: "Tasks", tasks }];
  const map = new Map<string, Task[]>();
  for (const task of tasks) {
    const key = groupBy === "status" ? statusConfig[task.status].label : groupBy === "priority" ? priorityConfig[task.priority].label : (task.assignees ?? [])[0] ?? "Unassigned";
    map.set(key, [...(map.get(key) ?? []), task]);
  }
  return Array.from(map, ([key, value]) => ({ key, label: key, tasks: value }));
}

function TaskRow({
  task,
  favorite,
  onOpen,
  onDelete,
  onToggleFavorite,
  onMoveUp,
  onMoveDown,
  dense = false,
}: {
  task: Task;
  favorite?: boolean;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  dense?: boolean;
}) {
  return (
    <div className={cls("grid w-full grid-cols-[minmax(240px,1fr)_190px_110px_120px_100px_44px] items-center border-b border-[#e8eaed] px-6 text-sm hover:bg-[#f8f9fb] dark:border-[#2a2e38] dark:hover:bg-[#20232c]", dense ? "h-10" : "h-11")}>
      <button onClick={() => onOpen(task.id)} className="col-span-1 flex items-center gap-2 truncate text-left">
        <StatusDot status={task.status} />
        <span className="truncate">{task.title}</span>
        {(task.dependencies ?? []).length ? <span className="text-xs text-slate-400">⌘ {(task.dependencies ?? []).length}</span> : null}
        {task.comments ? <span className="text-xs text-slate-400">▢ {task.comments}</span> : null}
      </button>
      <span className="flex items-center -space-x-2">{(task.assignees ?? []).map((id) => <Avatar key={id} id={id} />)}</span>
      <span className={todayLabel(task.dueDate).includes("Today") || todayLabel(task.dueDate).includes("Tomorrow") ? "text-orange-500" : "text-slate-500"}>{todayLabel(task.dueDate)}</span>
      <PriorityFlag priority={task.priority} />
      <span>{task.storyPoints ?? 0}</span>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="grid size-8 place-items-center rounded text-slate-400 hover:bg-[#eceef1] dark:hover:bg-[#262a34]">
            {favorite ? "★" : <MoreHorizontal className="size-4" />}
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="z-[150] min-w-44 rounded-md border border-[#e8eaed] bg-white p-1 shadow-xl dark:border-[#2a2e38] dark:bg-[#20232c]">
            <DropdownMenu.Item onSelect={() => onOpen(task.id)} className="rounded px-3 py-2 text-sm outline-none hover:bg-[#f1effd]">Edit</DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => onToggleFavorite(task.id)} className="rounded px-3 py-2 text-sm outline-none hover:bg-[#f1effd]">{favorite ? "Unfavorite" : "Favorite"}</DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => onMoveUp(task.id)} className="rounded px-3 py-2 text-sm outline-none hover:bg-[#f1effd]">Move up</DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => onMoveDown(task.id)} className="rounded px-3 py-2 text-sm outline-none hover:bg-[#f1effd]">Move down</DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => onDelete(task.id)} className="rounded px-3 py-2 text-sm text-red-500 outline-none hover:bg-red-50 dark:hover:bg-red-500/10">Delete</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

function ListView({
  tasks,
  favorites,
  groupBy,
  onOpen,
  onAdd,
  onDelete,
  onToggleFavorite,
  onMoveUp,
  onMoveDown,
}: {
  tasks: Task[];
  favorites: string[];
  groupBy: GroupBy;
  onOpen: (id: string) => void;
  onAdd: (status?: StatusKey) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}) {
  return (
    <div className="min-w-[900px]">
      <div className="grid h-8 grid-cols-[minmax(240px,1fr)_190px_110px_120px_100px_44px] items-center border-b border-[#e8eaed] px-6 text-[11px] font-semibold text-slate-400 dark:border-[#2a2e38]">
        <span>NAME</span><span>ASSIGNEE</span><span>DUE DATE</span><span>PRIORITY</span><span>STORY POINTS</span><span></span>
      </div>
      {groupTasks(tasks, groupBy).map((group) => (
        <div key={group.key}>
          <div className="flex h-9 items-center gap-3 border-b border-[#e8eaed] px-6 text-sm dark:border-[#2a2e38]">
            <ChevronDown className="size-4 text-slate-400" />
            <span className={cls("rounded px-2 py-0.5 text-[11px] font-bold", groupBy === "status" ? statusByLabel(group.label) : "bg-slate-100 text-slate-500 dark:bg-[#2f333f]")}>{group.label}</span>
            <span className="text-slate-400">{group.tasks.length}</span>
            <button onClick={() => onAdd(labelToStatus(group.label))} className="flex items-center gap-1 text-slate-400 hover:text-[#7b68ee]"><Plus className="size-4" /> Add Task</button>
          </div>
          {group.tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              favorite={favorites.includes(`task:${task.id}`)}
              onOpen={onOpen}
              onDelete={onDelete}
              onToggleFavorite={onToggleFavorite}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
            />
          ))}
          <button onClick={() => onAdd(labelToStatus(group.label))} className="flex h-9 items-center gap-2 px-12 text-sm text-slate-400 hover:text-[#7b68ee]"><Plus className="size-4" /> Add Task</button>
        </div>
      ))}
    </div>
  );
}

function statusByLabel(label: string) {
  const match = Object.values(statusConfig).find((status) => status.label === label);
  return match?.badge ?? "bg-slate-100 text-slate-500";
}

function labelToStatus(label: string): StatusKey {
  return (Object.entries(statusConfig).find(([, config]) => config.label === label)?.[0] as StatusKey | undefined) ?? "todo";
}

function BoardView({ tasks, onOpen, onMove, onAdd }: { tasks: Task[]; onOpen: (id: string) => void; onMove: (id: string, status: StatusKey) => void; onAdd: (status?: StatusKey) => void }) {
  const columns = (Object.keys(statusConfig) as StatusKey[]).map((status) => ({ status, tasks: tasks.filter((task) => task.status === status) }));
  return (
    <div className="flex h-full min-w-[1100px] gap-4 overflow-x-auto p-6">
      {columns.map((column) => (
        <div key={column.status} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onMove(event.dataTransfer.getData("task"), column.status)} className="w-[280px] shrink-0 rounded-lg bg-[#fafbfc] p-3 dark:bg-[#15171d]">
          <div className="mb-3 flex items-center gap-2">
            <span className={cls("rounded px-2 py-0.5 text-[11px] font-bold", statusConfig[column.status].badge)}>{statusConfig[column.status].label}</span>
            <span className="text-sm text-slate-400">{column.tasks.length}</span>
            <button onClick={() => onAdd(column.status)} className="ml-auto text-slate-400"><Plus className="size-4" /></button>
          </div>
          <div className="space-y-2">
            {column.tasks.map((task) => (
              <button key={task.id} draggable onDragStart={(event) => event.dataTransfer.setData("task", task.id)} onClick={() => onOpen(task.id)} className="w-full rounded-md border border-[#e8eaed] bg-white p-3 text-left shadow-sm hover:shadow-md dark:border-[#2a2e38] dark:bg-[#20232c]">
                <div className="mb-3 flex items-start gap-2"><StatusDot status={task.status} /><span className="text-sm">{task.title}</span><PriorityFlag priority={task.priority} /></div>
                <div className="mb-3 flex flex-wrap gap-1">{(task.tags ?? []).map((tag) => <Tag key={tag}>{tag}</Tag>)}</div>
                <div className="flex items-center justify-between text-xs text-slate-500"><span>{todayLabel(task.dueDate)}</span><span className="flex -space-x-2">{(task.assignees ?? []).map((id) => <Avatar key={id} id={id} />)}</span></div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CalendarView({ tasks, onOpen }: { tasks: Task[]; onOpen: (id: string) => void }) {
  const days = Array.from({ length: 30 }, (_, index) => index + 1);
  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">June 2026</h2><span className="text-sm text-slate-500">Month view</span></div>
      <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-[#e8eaed] dark:border-[#2a2e38]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="border-b border-[#e8eaed] bg-[#fafbfc] p-2 text-xs font-semibold text-slate-400 dark:border-[#2a2e38] dark:bg-[#15171d]">{day}</div>)}
        {days.map((day) => {
          const iso = `2026-06-${String(day).padStart(2, "0")}`;
          const dayTasks = tasks.filter((task) => task.dueDate === iso);
          return (
            <div key={day} className="min-h-[115px] border-b border-r border-[#e8eaed] p-2 dark:border-[#2a2e38]">
              <span className={cls("text-xs", day === 25 && "rounded-full bg-[#7b68ee] px-2 py-0.5 text-white")}>{day}</span>
              <div className="mt-2 space-y-1">
                {dayTasks.map((task) => <button key={task.id} onClick={() => onOpen(task.id)} className="block w-full truncate rounded bg-[#f1effd] px-2 py-1 text-left text-xs text-[#7b68ee] dark:bg-[#2c2550]">{task.title}</button>)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GanttView({ tasks, onOpen, dark }: { tasks: Task[]; onOpen: (id: string) => void; dark: boolean }) {
  const days = Array.from({ length: 18 }, (_, index) => index + 4);
  const px = 68;
  return (
    <div className="h-full min-w-[1100px] overflow-auto bg-[#1a1c23] text-[#e6e8ec]">
      <div className="grid" style={{ gridTemplateColumns: `260px ${days.length * px}px` }}>
        <div className="sticky left-0 z-10 border-r border-[#2a2e38] bg-[#1a1c23]">
          <div className="h-14 border-b border-[#2a2e38] px-4 py-3 text-xs font-semibold text-slate-400">NAME</div>
          {tasks.map((task) => <button key={task.id} onClick={() => onOpen(task.id)} className="flex h-40px h-10 w-full items-center gap-2 border-b border-[#2a2e38] px-4 text-left text-sm"><StatusDot status={task.status} />{task.title}</button>)}
        </div>
        <div>
          <div className="grid h-14 border-b border-[#2a2e38]" style={{ gridTemplateColumns: `repeat(${days.length}, ${px}px)` }}>
            {days.map((day) => <div key={day} className="border-r border-[#2a2e38] px-2 py-1 text-center text-xs text-slate-400"><div>June 2026</div><div className={day === 8 ? "mx-auto mt-1 grid size-5 place-items-center rounded-full bg-[#7b68ee] text-white" : ""}>{day}</div></div>)}
          </div>
          <div className="relative">
            {tasks.map((task) => {
              const start = Number(task.startDate?.slice(-2) ?? "4");
              const due = Number(task.dueDate?.slice(-2) ?? "4");
              const left = Math.max(0, start - 4) * px + 10;
              const width = Math.max(1, due - start + 1) * px - 20;
              return (
                <div key={task.id} className="relative h-10 border-b border-[#2a2e38]">
                  {days.map((day) => <span key={day} className="absolute top-0 h-10 border-r border-[#2a2e38]" style={{ left: (day - 4) * px, width: 1 }} />)}
                  <button onClick={() => onOpen(task.id)} className={cls("absolute top-2 flex h-5 items-center justify-between rounded-full px-2 text-[11px] text-white", dark ? "bg-slate-500" : "bg-[#87909e]")} style={{ left, width }}>
                    <span className="truncate">{task.title}</span>
                    <Avatar id={(task.assignees ?? [])[0] ?? "SC"} />
                  </button>
                  {(task.dependencies ?? []).length ? <svg className="pointer-events-none absolute inset-0 overflow-visible"><path d={`M ${Math.max(0, start - 5) * px + 40} 20 C ${left - 30} 20 ${left - 30} 20 ${left} 20`} stroke="#87909e" fill="none" strokeWidth="2" /></svg> : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function TableView({
  tasks,
  groupBy,
  onOpen,
  onPatch,
  onDelete,
}: {
  tasks: Task[];
  groupBy: GroupBy;
  onOpen: (id: string) => void;
  onPatch: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
}) {
  const grouped = groupTasks(tasks, groupBy);
  return (
    <div className="min-w-[980px]">
      <div className="grid h-9 grid-cols-[42px_minmax(240px,1fr)_190px_110px_120px_120px_44px] items-center border-b border-[#e8eaed] px-4 text-[11px] font-semibold text-slate-400 dark:border-[#2a2e38]">
        <span></span><span>NAME</span><span>ASSIGNEE</span><span>DUE DATE</span><span>PRIORITY</span><span>STORY POINTS</span><span></span>
      </div>
      {grouped.map((group) => (
        <div key={group.key}>
          <div className="flex h-8 items-center gap-2 border-b border-[#e8eaed] px-4 dark:border-[#2a2e38]"><ChevronDown className="size-4 text-slate-400" /><span className="text-xs font-semibold">{group.label}</span><span className="text-xs text-slate-400">{group.tasks.length}</span></div>
          {group.tasks.map((task) => (
            <div key={task.id} className="grid h-10 grid-cols-[42px_minmax(240px,1fr)_190px_110px_120px_120px_44px] items-center border-b border-[#e8eaed] px-4 text-sm hover:bg-[#f8f9fb] dark:border-[#2a2e38] dark:hover:bg-[#20232c]">
              <button onClick={() => onPatch(task.id, { status: task.status === "complete" ? "todo" : "complete" })}><StatusDot status={task.status} /></button>
              <button onClick={() => onOpen(task.id)} className="truncate text-left">{task.title}</button>
              <span className="flex -space-x-2">{(task.assignees ?? []).map((id) => <Avatar key={id} id={id} />)}</span>
              <span>{todayLabel(task.dueDate)}</span>
              <PriorityFlag priority={task.priority} />
              <span>{task.storyPoints ?? 0}</span>
              <button onClick={() => onDelete(task.id)} className="grid size-8 place-items-center rounded text-slate-400 hover:bg-[#eceef1] dark:hover:bg-[#262a34]"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function CommandPalette({ tasks, onClose, onOpenTask }: { tasks: Task[]; onClose: () => void; onOpenTask: (id: string) => void }) {
  const [value, setValue] = useState("");
  const results = tasks.filter((task) => task.title.toLowerCase().includes(value.toLowerCase())).slice(0, 6);
  return (
    <div className="fixed inset-0 z-[120] bg-black/30 pt-[12vh]" onClick={onClose}>
      <div onClick={(event) => event.stopPropagation()} className="mx-auto w-[640px] overflow-hidden rounded-xl border border-[#e8eaed] bg-white shadow-2xl dark:border-[#2a2e38] dark:bg-[#20232c]">
        <div className="flex h-12 items-center gap-3 border-b border-[#e8eaed] px-4 dark:border-[#2a2e38]"><Search className="size-4 text-slate-400" /><input autoFocus value={value} onChange={(event) => setValue(event.target.value)} placeholder="Search tasks, commands, people..." className="flex-1 bg-transparent outline-none" /><span className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-400 dark:bg-[#2f333f]">ESC</span></div>
        <div className="p-2">
          {(value ? results : tasks.slice(0, 4)).map((task) => <button key={task.id} onClick={() => onOpenTask(task.id)} className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left hover:bg-[#f1effd] dark:hover:bg-[#2c2550]"><StatusDot status={task.status} /><span>{task.title}</span><span className="ml-auto text-xs text-slate-400">in {task.list} ↵</span></button>)}
          <button className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-slate-500 hover:bg-[#f1effd] dark:hover:bg-[#2c2550]"><Command className="size-4" />Create task, switch view, group by priority...</button>
        </div>
      </div>
    </div>
  );
}

function TaskModal({
  task,
  members,
  onClose,
  onPatch,
  onDelete,
}: {
  task: Task;
  members: TeamMember[];
  onClose: () => void;
  onPatch: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
}) {
  const [timerRunning, setTimerRunning] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState((task.assignees ?? [])[0] ?? "SC");

  useEffect(() => {
    setTimerRunning(false);
    setNewChecklistItem("");
    setNewSubtaskTitle("");
    setNewSubtaskAssignee((task.assignees ?? [])[0] ?? "SC");
  }, [task.id, task.assignees]);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => {
      onPatch(task.id, { timeLogged: timeFromSeconds(secondsFromTime(task.timeLogged) + 1) });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [onPatch, task.id, task.timeLogged, timerRunning]);

  function addChecklistItem() {
    if (!newChecklistItem.trim()) return;
    onPatch(task.id, { checklists: [...(task.checklists ?? []), newChecklistItem.trim()] });
    setNewChecklistItem("");
  }

  function addSubtask() {
    if (!newSubtaskTitle.trim()) return;
    onPatch(task.id, {
      subtasks: [
        ...(task.subtasks ?? []),
        {
          id: `sub-${Date.now()}`,
          title: newSubtaskTitle.trim(),
          done: false,
          assignee: newSubtaskAssignee || ((task.assignees ?? [])[0] ?? "SC"),
        },
      ],
    });
    setNewSubtaskTitle("");
  }

  function confirmDelete() {
    onDelete(task.id);
  }

  async function uploadAttachments(files: FileList | null) {
    const selected = Array.from(files ?? []);
    if (!selected.length) return;
    setUploadingAttachment(true);
    const uploaded: string[] = [];
    try {
      for (const file of selected) {
        const form = new FormData();
        form.set("file", file);
        form.set("title", `${task.title} - ${file.name}`);
        form.set("documentType", "task_attachment");
        const response = await fetch("/api/documents/upload", { method: "POST", body: form });
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          window.alert(data?.error ?? `Falha ao enviar ${file.name}`);
          continue;
        }
        uploaded.push(file.name);
      }
      if (uploaded.length) onPatch(task.id, { attachments: [...(task.attachments ?? []), ...uploaded] });
    } catch {
      window.alert("Falha de conexão ao enviar anexo.");
    } finally {
      setUploadingAttachment(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-black/45 p-8">
      <div className="flex max-h-[90vh] w-full max-w-[1080px] overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-[#20232c]">
        <div className="min-w-0 flex-1 overflow-y-auto p-6">
          <div className="mb-8 flex items-center gap-2"><span className={cls("rounded px-2 py-0.5 text-[11px] font-bold", statusConfig[task.status].badge)}>{statusConfig[task.status].label}</span><span className="text-sm text-slate-500">in {task.list}</span><button onClick={confirmDelete} className="ml-auto flex h-8 items-center gap-2 rounded px-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 className="size-4" /> Delete</button></div>
          <input value={task.title} onChange={(event) => onPatch(task.id, { title: event.target.value })} className="mb-5 w-full bg-transparent text-2xl font-bold outline-none" />
          <div className="mb-6">
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500"><List className="size-4" /> Description</div>
            <textarea value={task.description} onChange={(event) => onPatch(task.id, { description: event.target.value })} className="min-h-24 w-full rounded-lg border border-[#e8eaed] bg-transparent p-3 outline-none focus:border-[#7b68ee] dark:border-[#2a2e38]" />
          </div>
          <section className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 font-medium"><Check className="size-4" /> Subtasks <span className="text-sm text-slate-400">{(task.subtasks ?? []).length}</span></h3>
            <div className="overflow-hidden rounded-lg border border-[#e8eaed] dark:border-[#2a2e38]">
              {(task.subtasks ?? []).map((subtask) => (
                <div key={subtask.id} className="flex h-9 items-center gap-3 border-b border-[#e8eaed] px-3 last:border-b-0 dark:border-[#2a2e38]">
                  <button onClick={() => onPatch(task.id, { subtasks: (task.subtasks ?? []).map((item) => item.id === subtask.id ? { ...item, done: !item.done } : item) })}>{subtask.done ? <StatusDot status="complete" /> : <StatusDot status="progress" />}</button>
                  <span className="text-sm">{subtask.title}</span>
                  <span className="ml-auto"><Avatar id={subtask.assignee} /></span>
                </div>
              ))}
              <div className="flex gap-2 border-t border-[#e8eaed] p-3 dark:border-[#2a2e38]">
                <input
                  value={newSubtaskTitle}
                  onChange={(event) => setNewSubtaskTitle(event.target.value)}
                  placeholder="New subtask"
                  className="min-w-0 flex-1 rounded border border-[#e8eaed] bg-transparent px-3 py-2 text-sm outline-none focus:border-[#7b68ee] dark:border-[#2a2e38]"
                />
                <select
                  value={newSubtaskAssignee}
                  onChange={(event) => setNewSubtaskAssignee(event.target.value)}
                  className="rounded border border-[#e8eaed] bg-transparent px-2 text-sm outline-none dark:border-[#2a2e38]"
                >
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <button onClick={addSubtask} className="rounded bg-[#7b68ee] px-3 text-sm font-medium text-white">
                  Add
                </button>
              </div>
            </div>
          </section>
          <section className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 font-medium"><Check className="size-4" /> Checklists</h3>
            <div className="overflow-hidden rounded-lg border border-[#e8eaed] dark:border-[#2a2e38]">
              {(task.checklists ?? []).map((item, index) => (
                <div key={`${item}-${index}`} className="flex h-9 items-center gap-3 border-b border-[#e8eaed] px-3 last:border-b-0 dark:border-[#2a2e38]">
                  <Check className="size-4 text-emerald-500" />
                  <span className="text-sm">{item}</span>
                  <button onClick={() => onPatch(task.id, { checklists: (task.checklists ?? []).filter((_, itemIndex) => itemIndex !== index) })} className="ml-auto text-slate-400 hover:text-red-500"><X className="size-4" /></button>
                </div>
              ))}
              <div className="flex gap-2 border-t border-[#e8eaed] p-3 dark:border-[#2a2e38]">
                <input
                  value={newChecklistItem}
                  onChange={(event) => setNewChecklistItem(event.target.value)}
                  placeholder="New checklist item"
                  className="min-w-0 flex-1 rounded border border-[#e8eaed] bg-transparent px-3 py-2 text-sm outline-none focus:border-[#7b68ee] dark:border-[#2a2e38]"
                />
                <button onClick={addChecklistItem} className="rounded bg-[#7b68ee] px-3 text-sm font-medium text-white">
                  Add
                </button>
              </div>
            </div>
          </section>
          <section className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 font-medium"><Paperclip className="size-4" /> Attachments</h3>
            <label className="grid min-h-20 cursor-pointer place-items-center rounded-lg border border-dashed border-[#e8eaed] p-4 text-sm text-slate-400 hover:border-[#7b68ee] dark:border-[#2a2e38]">
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(event) => {
                  void uploadAttachments(event.target.files);
                  event.currentTarget.value = "";
                }}
              />
              <Paperclip className="size-4" /> {uploadingAttachment ? "Uploading..." : "Drop files or click to upload"}
            </label>
            {(task.attachments ?? []).length ? <div className="mt-2 space-y-1">{(task.attachments ?? []).map((file, index) => <div key={`${file}-${index}`} className="flex h-8 items-center gap-2 rounded bg-[#fafbfc] px-3 text-sm dark:bg-[#15171d]"><Paperclip className="size-4 text-slate-400" />{file}<button onClick={() => onPatch(task.id, { attachments: (task.attachments ?? []).filter((_, fileIndex) => fileIndex !== index) })} className="ml-auto text-slate-400 hover:text-red-500"><X className="size-4" /></button></div>)}</div> : null}
          </section>
          <section>
            <h3 className="mb-3 flex items-center gap-2 font-medium"><Timer className="size-4" /> Time tracking</h3>
            <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-3 text-sm">
              <label className="rounded-lg bg-[#fafbfc] p-3 dark:bg-[#15171d]"><span className="block text-xs text-slate-400">LOGGED</span><input value={task.timeLogged} onChange={(event) => onPatch(task.id, { timeLogged: event.target.value })} className="w-full bg-transparent outline-none" /></label>
              <label className="rounded-lg bg-[#fafbfc] p-3 dark:bg-[#15171d]"><span className="block text-xs text-slate-400">ESTIMATE</span><input value={task.timeEstimate} onChange={(event) => onPatch(task.id, { timeEstimate: event.target.value })} className="w-full bg-transparent outline-none" /></label>
              <button onClick={() => setTimerRunning((value) => !value)} className={cls("grid size-12 place-items-center self-end rounded-lg text-white", timerRunning ? "bg-amber-500" : "bg-[#7b68ee]")}>{timerRunning ? <Pause className="size-5" /> : <Play className="size-5" />}</button>
              <button
                onClick={() => setTimerRunning(false)}
                className="grid size-12 place-items-center self-end rounded-lg bg-slate-600 text-white"
              >
                <Timer className="size-5" />
              </button>
            </div>
          </section>
        </div>
        <aside className="w-[320px] shrink-0 border-l border-[#e8eaed] bg-[#fafbfc] p-6 dark:border-[#2a2e38] dark:bg-[#1f222b]">
          <div className="mb-8 flex justify-end gap-2"><MoreHorizontal className="size-4 text-slate-400" /><Columns3 className="size-4 text-slate-400" /><button onClick={onClose}><X className="size-4 text-slate-400" /></button></div>
          <MetaRow label="Assignees">
            <select
              value={(task.assignees ?? [])[0] ?? ""}
              onChange={(event) =>
                onPatch(task.id, {
                  assignees: event.target.value ? [event.target.value] : [],
                })
              }
              className="w-full rounded border border-[#e8eaed] bg-transparent px-2 py-1 outline-none dark:border-[#2a2e38]"
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </MetaRow>
          <MetaRow label="Due date"><input type="date" value={task.dueDate} onChange={(event) => onPatch(task.id, { dueDate: event.target.value })} className="rounded bg-transparent text-orange-500 outline-none" /></MetaRow>
          <MetaRow label="Start date"><input type="date" value={task.startDate} onChange={(event) => onPatch(task.id, { startDate: event.target.value })} className="rounded bg-transparent text-red-500 outline-none" /></MetaRow>
          <MetaRow label="Priority"><select value={task.priority} onChange={(event) => onPatch(task.id, { priority: event.target.value as Priority })} className="rounded bg-transparent outline-none">{(Object.keys(priorityConfig) as Priority[]).map((priority) => <option key={priority} value={priority}>{priorityConfig[priority].label}</option>)}</select></MetaRow>
          <MetaRow label="Recurring"><span className="text-slate-500">Doesn&apos;t repeat</span></MetaRow>
          <MetaRow label="Tags"><span className="flex flex-wrap gap-1">{(task.tags ?? []).map((tag) => <Tag key={tag}>{tag}</Tag>)}</span></MetaRow>
          <MetaRow label="Watchers"><span className="flex -space-x-2">{(task.watchers ?? []).map((id) => <Avatar key={id} id={id} />)}</span></MetaRow>
          <div className="my-5 border-t border-[#e8eaed] pt-5 dark:border-[#2a2e38]">
            <p className="mb-4 text-xs font-semibold text-slate-500">CUSTOM FIELDS</p>
            <MetaRow label="Story Points"><input type="number" min={0} value={task.storyPoints ?? 0} onChange={(event) => onPatch(task.id, { storyPoints: Number(event.target.value), customFields: { ...(task.customFields ?? { environment: "-" }), storyPoints: Number(event.target.value) } })} className="w-16 rounded bg-transparent outline-none" /></MetaRow>
            <MetaRow label="Environment"><select value={task.customFields?.environment ?? "-"} onChange={(event) => onPatch(task.id, { customFields: { storyPoints: task.storyPoints ?? 0, environment: event.target.value as CustomFields["environment"] } })} className="rounded bg-transparent outline-none"><option value="-">-</option><option value="Dev">Dev</option><option value="Staging">Staging</option><option value="Production">Production</option></select></MetaRow>
          </div>
          <div className="border-t border-[#e8eaed] pt-5 text-xs text-slate-500 dark:border-[#2a2e38]">Created by Santiago Cotto<br />Jun 7, 2026</div>
        </aside>
      </div>
    </div>
  );
}

function WorkspaceDialog({
  dialog,
  value,
  marker,
  emoji,
  loading,
  onValueChange,
  onMarkerChange,
  onEmojiChange,
  onCancel,
  onSubmit,
}: {
  dialog: WorkspaceDialogState;
  value: string;
  marker: string;
  emoji: string;
  loading: boolean;
  onValueChange: (value: string) => void;
  onMarkerChange: (value: string) => void;
  onEmojiChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const title =
    dialog?.kind === "workspace"
      ? "Rename workspace"
      : dialog?.kind === "space" && dialog.mode === "create"
        ? "Create space"
        : dialog?.kind === "space"
          ? "Rename space"
          : dialog?.mode === "create"
            ? "Create list"
            : "Rename list";

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[140] bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[141] w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#e8eaed] bg-white p-5 shadow-2xl outline-none dark:border-[#2a2e38] dark:bg-[#20232c]">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
                <Dialog.Description className="text-sm text-slate-500">
                  Keep the workspace structure aligned with the panel.
                </Dialog.Description>
              </div>
              <button type="button" onClick={onCancel} className="rounded p-1 text-slate-400 hover:bg-[#f4f5f7] dark:hover:bg-[#262a34]">
                <X className="size-4" />
              </button>
            </div>
            <label className="block space-y-2 text-sm">
              <span className="text-slate-500">Name</span>
              <input
                value={value}
                onChange={(event) => onValueChange(event.target.value)}
                autoFocus
                className="h-10 w-full rounded-lg border border-[#e8eaed] bg-transparent px-3 outline-none focus:border-[#7b68ee] dark:border-[#2a2e38]"
              />
            </label>
            {dialog?.kind === "space" ? (
              <label className="block space-y-2 text-sm">
                <span className="text-slate-500">Emoji</span>
                <input
                  value={emoji}
                  onChange={(event) => onEmojiChange(event.target.value)}
                  className="h-10 w-full rounded-lg border border-[#e8eaed] bg-transparent px-3 outline-none focus:border-[#7b68ee] dark:border-[#2a2e38]"
                />
              </label>
            ) : null}
            {dialog?.kind === "list" ? (
              <label className="block space-y-2 text-sm">
                <span className="text-slate-500">Marker</span>
                <select
                  value={marker}
                  onChange={(event) => onMarkerChange(event.target.value)}
                  className="h-10 w-full rounded-lg border border-[#e8eaed] bg-transparent px-3 outline-none focus:border-[#7b68ee] dark:border-[#2a2e38]"
                >
                  <option value="text-violet-500">Violet</option>
                  <option value="text-sky-500">Sky</option>
                  <option value="text-emerald-500">Emerald</option>
                  <option value="text-orange-500">Orange</option>
                  <option value="text-pink-500">Pink</option>
                </select>
              </label>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onCancel} className="rounded-lg border border-[#e8eaed] px-3 py-2 text-sm dark:border-[#2a2e38]">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="rounded-lg bg-[#7b68ee] px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PanelModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[115] bg-black/30" onClick={onClose}>
      <div onClick={(event) => event.stopPropagation()} className="absolute bottom-5 left-5 top-5 w-[420px] overflow-hidden rounded-xl border border-[#e8eaed] bg-white shadow-2xl dark:border-[#2a2e38] dark:bg-[#20232c]">
        <div className="flex h-12 items-center justify-between border-b border-[#e8eaed] px-4 dark:border-[#2a2e38]">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded p-1.5 text-slate-400 hover:bg-[#f4f5f7] dark:hover:bg-[#262a34]"><X className="size-4" /></button>
        </div>
        <div className="max-h-[calc(100vh-7rem)] overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}

function NotificationList({ tasks }: { tasks: Task[] }) {
  const urgent = tasks.filter((task) => task.priority === "urgent" || todayLabel(task.dueDate) === "Today" || todayLabel(task.dueDate) === "Tomorrow").slice(0, 8);
  return (
    <div className="space-y-2">
      {urgent.map((task) => (
        <div key={task.id} className="rounded-lg border border-[#e8eaed] p-3 text-sm dark:border-[#2a2e38]">
          <div className="mb-1 flex items-center gap-2 font-medium"><StatusDot status={task.status} />{task.title}</div>
          <div className="flex items-center justify-between text-xs text-slate-500"><span>{priorityConfig[task.priority].label}</span><span>{todayLabel(task.dueDate)}</span></div>
        </div>
      ))}
      {!urgent.length ? <div className="rounded-lg border border-dashed border-[#e8eaed] p-6 text-center text-sm text-slate-500 dark:border-[#2a2e38]">No notifications</div> : null}
    </div>
  );
}

function SettingsPanel({ spaces, tasks, onReset }: { spaces: SpaceConfig[]; tasks: Task[]; onReset: () => void }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-lg border border-[#e8eaed] p-3 dark:border-[#2a2e38]">
        <div className="mb-2 font-medium">Workspace</div>
        <div className="text-slate-500">Spaces: {spaces.length}</div>
        <div className="text-slate-500">Lists: {spaces.reduce((total, space) => total + space.lists.length, 0)}</div>
        <div className="text-slate-500">Tasks: {tasks.length}</div>
      </div>
      <div className="rounded-lg border border-[#e8eaed] p-3 dark:border-[#2a2e38]">
        <div className="mb-2 font-medium">Persistence</div>
        <div className="text-slate-500">Changes persist through the tasks API and workspace settings endpoint.</div>
      </div>
      <button onClick={onReset} className="flex h-9 w-full items-center justify-center rounded bg-red-500 text-white hover:bg-red-600">Reset workspace</button>
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mb-4 grid grid-cols-[100px_1fr] items-center gap-3 text-sm"><span className="text-slate-500">{label}</span><span>{children}</span></div>;
}
