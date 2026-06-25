"use client";

import { useEffect, useMemo, useState } from "react";
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
  Plus,
  Search,
  Settings,
  Sun,
  Table2,
  Timer,
  Users,
  X,
} from "lucide-react";

type ViewMode = "list" | "board" | "calendar" | "gantt" | "table";
type StatusKey = "todo" | "progress" | "review" | "complete";
type Priority = "urgent" | "high" | "normal" | "low";
type GroupBy = "status" | "priority" | "assignee" | "none";

type Subtask = { id: string; title: string; done: boolean; assignee: string };
type CustomFields = { storyPoints: number; environment: "Dev" | "Staging" | "Production" | "-" };
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
  customFields: CustomFields;
  timeEstimate: string;
  timeLogged: string;
};

const STORAGE_KEY = "triade:open-clickup:complete:v1";

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

const seedTasks: Task[] = [
  {
    id: "task-auth-flow",
    title: "Build authentication flow",
    description: "Implement Google OAuth and email/password login with session handling.",
    status: "progress",
    priority: "urgent",
    assignees: ["SC", "MC"],
    tags: ["frontend", "backend", "design"],
    startDate: "2026-06-06",
    dueDate: "2026-06-09",
    storyPoints: 8,
    list: "Sprint 24",
    space: "Product",
    folder: "Sprints",
    dependencies: ["task-oauth-callback"],
    comments: 3,
    watchers: ["SC"],
    subtasks: [
      { id: "sub-oauth", title: "OAuth callback handler", done: true, assignee: "SC" },
      { id: "sub-session", title: "Session middleware", done: false, assignee: "SC" },
      { id: "sub-login", title: "Login UI", done: false, assignee: "MC" },
    ],
    checklists: ["Security review", "Smoke test"],
    customFields: { storyPoints: 8, environment: "Dev" },
    timeEstimate: "6h",
    timeLogged: "2h 20m",
  },
  {
    id: "task-custom-fields",
    title: "Add custom fields to list view",
    description: "Expose story points, environment, and owner metadata inside table and list views.",
    status: "progress",
    priority: "normal",
    assignees: ["SC", "DR"],
    tags: ["frontend"],
    startDate: "2026-06-09",
    dueDate: "2026-06-11",
    storyPoints: 5,
    list: "Sprint 24",
    space: "Product",
    folder: "Sprints",
    dependencies: [],
    comments: 1,
    watchers: ["DR"],
    subtasks: [],
    checklists: ["Column visibility", "Inline edit"],
    customFields: { storyPoints: 5, environment: "Dev" },
    timeEstimate: "4h",
    timeLogged: "1h",
  },
  {
    id: "task-notification",
    title: "Notification system",
    description: "Create assignment, comment, mention, and due-date notifications.",
    status: "progress",
    priority: "urgent",
    assignees: ["SC"],
    tags: ["backend"],
    startDate: "2026-06-10",
    dueDate: "2026-06-26",
    storyPoints: 13,
    list: "Sprint 24",
    space: "Product",
    folder: "Sprints",
    dependencies: ["task-auth-flow"],
    comments: 0,
    watchers: ["SC", "PN"],
    subtasks: [],
    checklists: ["SSE stream", "Read/unread state"],
    customFields: { storyPoints: 13, environment: "Dev" },
    timeEstimate: "10h",
    timeLogged: "0h",
  },
  {
    id: "task-board-flicker",
    title: "Fix board drag-and-drop flicker",
    description: "Stabilize card transforms while moving between columns.",
    status: "todo",
    priority: "high",
    assignees: ["DR"],
    tags: ["bug", "frontend"],
    startDate: "2026-06-13",
    dueDate: "2026-06-25",
    storyPoints: 3,
    list: "Sprint 24",
    space: "Product",
    folder: "Sprints",
    dependencies: [],
    comments: 0,
    watchers: [],
    subtasks: [],
    checklists: ["Regression test"],
    customFields: { storyPoints: 3, environment: "-" },
    timeEstimate: "2h",
    timeLogged: "0h",
  },
  {
    id: "task-docs",
    title: "Write API documentation",
    description: "Document endpoints, auth, schemas, and webhook examples.",
    status: "todo",
    priority: "low",
    assignees: ["PN"],
    tags: [],
    startDate: "2026-06-12",
    dueDate: "2026-06-14",
    storyPoints: 2,
    list: "Sprint 24",
    space: "Product",
    folder: "Sprints",
    dependencies: [],
    comments: 0,
    watchers: [],
    subtasks: [],
    checklists: [],
    customFields: { storyPoints: 2, environment: "-" },
    timeEstimate: "3h",
    timeLogged: "0h",
  },
  {
    id: "task-query-performance",
    title: "Optimize task query performance",
    description: "Tune list payloads and indexes for large workspaces.",
    status: "todo",
    priority: "high",
    assignees: ["LM"],
    tags: ["backend"],
    startDate: "2026-06-10",
    dueDate: "2026-06-12",
    storyPoints: 8,
    list: "Sprint 24",
    space: "Product",
    folder: "Sprints",
    dependencies: [],
    comments: 0,
    watchers: ["LM"],
    subtasks: [],
    checklists: ["Index review"],
    customFields: { storyPoints: 8, environment: "Staging" },
    timeEstimate: "6h",
    timeLogged: "1h",
  },
  {
    id: "task-dark-mode",
    title: "Dark mode support (theming)",
    description: "Ship ClickUp-style theme tokens with persisted user preference.",
    status: "todo",
    priority: "low",
    assignees: ["DR"],
    tags: ["frontend", "design"],
    startDate: "2026-06-17",
    dueDate: "2026-06-19",
    storyPoints: 5,
    list: "Sprint 24",
    space: "Product",
    folder: "Sprints",
    dependencies: [],
    comments: 0,
    watchers: ["MC"],
    subtasks: [],
    checklists: ["Light mode", "Dark mode"],
    customFields: { storyPoints: 5, environment: "-" },
    timeEstimate: "5h",
    timeLogged: "0h",
  },
  {
    id: "task-dashboard-layout",
    title: "Design new dashboard layout",
    description: "Refresh dashboard cards, shortcuts, and widgets.",
    status: "review",
    priority: "high",
    assignees: ["MC"],
    tags: ["design"],
    startDate: "2026-06-24",
    dueDate: "2026-06-26",
    storyPoints: 5,
    list: "Sprint 24",
    space: "Design",
    folder: "Mockups",
    dependencies: [],
    comments: 0,
    watchers: ["SC"],
    subtasks: [],
    checklists: ["Mobile pass", "Desktop pass"],
    customFields: { storyPoints: 5, environment: "-" },
    timeEstimate: "5h",
    timeLogged: "4h",
  },
  {
    id: "task-tooltips",
    title: "User onboarding tooltips",
    description: "Guide new users through List, Board, Gantt, Table, and command palette.",
    status: "review",
    priority: "normal",
    assignees: ["MC", "PN"],
    tags: ["design", "frontend"],
    startDate: "2026-06-08",
    dueDate: "2026-06-10",
    storyPoints: 5,
    list: "Sprint 24",
    space: "Design",
    folder: "Mockups",
    dependencies: [],
    comments: 0,
    watchers: [],
    subtasks: [],
    checklists: ["Copy", "Placement"],
    customFields: { storyPoints: 5, environment: "-" },
    timeEstimate: "4h",
    timeLogged: "1h",
  },
  {
    id: "task-ci",
    title: "Set up CI pipeline",
    description: "Run lint, typecheck, unit, e2e and deploy checks on every push.",
    status: "complete",
    priority: "normal",
    assignees: ["LM"],
    tags: ["backend"],
    startDate: "2026-06-03",
    dueDate: "2026-06-05",
    storyPoints: 3,
    list: "Sprint 24",
    space: "Engineering",
    folder: "Infra",
    dependencies: [],
    comments: 0,
    watchers: ["SC"],
    subtasks: [],
    checklists: ["GitHub Actions", "Vercel deploy"],
    customFields: { storyPoints: 3, environment: "Production" },
    timeEstimate: "4h",
    timeLogged: "4h",
  },
  {
    id: "task-mobile-scope",
    title: "Mobile app MVP scoping",
    description: "Define first mobile pass for inbox, my work, and quick capture.",
    status: "todo",
    priority: "normal",
    assignees: ["SC"],
    tags: ["mobile"],
    startDate: "2026-06-08",
    dueDate: "2026-06-13",
    storyPoints: 8,
    list: "Backlog",
    space: "Product",
    dependencies: ["task-query-performance"],
    comments: 0,
    watchers: ["SC"],
    subtasks: [],
    checklists: ["Scope", "Prototype"],
    customFields: { storyPoints: 8, environment: "-" },
    timeEstimate: "8h",
    timeLogged: "0h",
  },
  {
    id: "task-gantt-deps",
    title: "Gantt view dependencies",
    description: "Draw dependency connectors and highlight blocked work.",
    status: "todo",
    priority: "high",
    assignees: ["SC"],
    tags: ["gantt"],
    startDate: "2026-06-14",
    dueDate: "2026-06-18",
    storyPoints: 8,
    list: "Backlog",
    space: "Product",
    dependencies: ["task-mobile-scope"],
    comments: 0,
    watchers: ["SC"],
    subtasks: [],
    checklists: ["Connector lines", "Hover cards"],
    customFields: { storyPoints: 8, environment: "-" },
    timeEstimate: "6h",
    timeLogged: "0h",
  },
];

const views: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
  { key: "list", label: "List", icon: <List className="size-4" /> },
  { key: "board", label: "Board", icon: <Kanban className="size-4" /> },
  { key: "calendar", label: "Calendar", icon: <CalendarDays className="size-4" /> },
  { key: "gantt", label: "Gantt", icon: <Layers3 className="size-4" /> },
  { key: "table", label: "Table", icon: <Table2 className="size-4" /> },
];

function todayLabel(iso: string) {
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

export function TasksWorkspace() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    if (typeof window === "undefined") return seedTasks;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Task[]) : seedTasks;
    } catch {
      return seedTasks;
    }
  });
  const [view, setView] = useState<ViewMode>("list");
  const [activeList, setActiveList] = useState("Sprint 24");
  const [query, setQuery] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [dark, setDark] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [sortBy, setSortBy] = useState<"manual" | "due" | "priority">("manual");

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    const searched = tasks.filter((task) => {
      const inList = task.list === activeList || activeList === "Home";
      const text = `${task.title} ${task.description} ${task.tags.join(" ")} ${task.assignees.join(" ")}`.toLowerCase();
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

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

  function patchTask(id: string, patch: Partial<Task>) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...patch } : task)));
  }

  function createTask(status: StatusKey = "todo") {
    const task: Task = {
      ...seedTasks[0],
      id: `task-${Date.now()}`,
      title: "New task",
      description: "Describe the work, acceptance criteria, links, and owners.",
      status,
      priority: "normal",
      assignees: ["SC"],
      tags: [],
      startDate: "2026-06-25",
      dueDate: "2026-06-26",
      storyPoints: 1,
      list: activeList,
      space: activeList === "Infra" ? "Engineering" : activeList === "Mockups" ? "Design" : "Product",
      folder: activeList === "Sprint 24" ? "Sprints" : undefined,
      dependencies: [],
      comments: 0,
      watchers: ["SC"],
      subtasks: [],
      checklists: [],
      customFields: { storyPoints: 1, environment: "-" },
      timeEstimate: "1h",
      timeLogged: "0h",
    };
    setTasks((current) => [task, ...current]);
    setSelectedTaskId(task.id);
  }

  function moveTask(id: string, status: StatusKey) {
    patchTask(id, { status });
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

  return (
    <div className={cls("fixed inset-0 z-[80] flex overflow-hidden bg-white text-[#1d2129]", dark && "dark bg-[#1a1c23] text-[#e6e8ec]")}>
      <aside className="flex w-[260px] shrink-0 flex-col border-r border-[#e8eaed] bg-[#fafbfc] dark:border-[#2a2e38] dark:bg-[#15171d]">
        <div className="flex h-[52px] items-center gap-2 border-b border-[#e8eaed] px-4 dark:border-[#2a2e38]">
          <div className="grid size-6 place-items-center rounded-md bg-[#7b68ee] text-sm font-bold text-white">A</div>
          <span className="font-semibold">Acme Inc.</span>
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
            Spaces <Plus className="size-4" />
          </div>
          <Space name="Product" emoji="🚀" open>
            <FolderLink name="Sprints" active={activeList === "Sprint 24"} onClick={() => setActiveList("Sprint 24")} />
            <FolderLink name="Backlog" active={activeList === "Backlog"} onClick={() => setActiveList("Backlog")} marker="text-orange-500" />
            <FolderLink name="Roadmap" active={activeList === "Roadmap"} onClick={() => setActiveList("Roadmap")} marker="text-emerald-500" />
          </Space>
          <Space name="Marketing" emoji="🌄" open>
            <FolderLink name="Campaigns" active={activeList === "Campaigns"} onClick={() => setActiveList("Campaigns")} marker="text-pink-500" />
            <FolderLink name="Content Calendar" active={activeList === "Content Calendar"} onClick={() => setActiveList("Content Calendar")} marker="text-sky-500" />
          </Space>
          <Space name="Engineering" emoji="⚙️" open>
            <FolderLink name="Infra" active={activeList === "Infra"} onClick={() => setActiveList("Infra")} marker="text-sky-500" />
          </Space>
          <Space name="Design" emoji="🎯" open>
            <FolderLink name="Mockups" active={activeList === "Mockups"} onClick={() => setActiveList("Mockups")} marker="text-violet-500" />
          </Space>
        </div>
        <div className="flex items-center gap-2 border-t border-[#e8eaed] p-3 dark:border-[#2a2e38]">
          <Avatar id={dark ? "MC" : "SC"} size="md" />
          <span className="truncate text-sm">{dark ? "Maya Chen" : "Santiago Cotto"}</span>
          <button className="ml-auto rounded p-1.5 text-slate-500 hover:bg-[#eceef1] dark:hover:bg-[#262a34]"><Bell className="size-4" /></button>
          <button className="rounded p-1.5 text-slate-500 hover:bg-[#eceef1] dark:hover:bg-[#262a34]"><Settings className="size-4" /></button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-white dark:bg-[#1a1c23]">
        <header className="border-b border-[#e8eaed] dark:border-[#2a2e38]">
          <div className="flex items-center gap-2 px-4 pt-3 text-sm text-slate-500">
            <span className="grid size-4 place-items-center rounded bg-[#7b68ee] text-[10px] text-white">🚀</span>
            Product {activeList === "Sprint 24" ? <span>/ Sprints</span> : null}
          </div>
          <div className="flex items-center px-4 py-1">
            <h1 className="text-xl font-semibold">{activeList}</h1>
            <button className="ml-2 text-slate-400">☆</button>
            <MoreHorizontal className="ml-2 size-4 text-slate-400" />
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
          {view === "list" && <ListView tasks={visibleTasks} groupBy={groupBy} onOpen={setSelectedTaskId} onAdd={createTask} />}
          {view === "board" && <BoardView tasks={visibleTasks} onOpen={setSelectedTaskId} onMove={moveTask} onAdd={createTask} />}
          {view === "calendar" && <CalendarView tasks={visibleTasks} onOpen={setSelectedTaskId} />}
          {view === "gantt" && <GanttView tasks={visibleTasks} onOpen={setSelectedTaskId} dark={dark} />}
          {view === "table" && <TableView tasks={visibleTasks} groupBy={groupBy} onOpen={setSelectedTaskId} onPatch={patchTask} />}
        </section>
      </main>

      <button
        onClick={() => setDark((value) => !value)}
        className="fixed bottom-5 left-5 z-[90] grid size-10 place-items-center rounded-full border border-white/20 bg-[#1d2129] text-white shadow-xl"
        aria-label="Toggle dark mode"
      >
        {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
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
      {selectedTask ? <TaskModal task={selectedTask} onClose={() => setSelectedTaskId(null)} onPatch={patchTask} /> : null}
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

function Space({ name, emoji, open, children }: { name: string; emoji: string; open?: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="flex h-8 items-center gap-2 rounded px-2 font-semibold">
        {open ? <ChevronDown className="size-3 text-slate-400" /> : <ChevronRight className="size-3 text-slate-400" />}
        <span className="grid size-5 place-items-center rounded bg-[#f1effd]">{emoji}</span>
        {name}
      </div>
      <div className="ml-5 space-y-1">{children}</div>
    </div>
  );
}

function FolderLink({ name, active, onClick, marker = "text-slate-500" }: { name: string; active?: boolean; onClick: () => void; marker?: string }) {
  return (
    <button onClick={onClick} className={cls("flex h-8 w-full items-center gap-2 rounded px-2 text-left hover:bg-[#eceef1] dark:hover:bg-[#262a34]", active && "bg-[#f1effd] text-[#7b68ee] dark:bg-[#2c2550]")}>
      <List className={cls("size-4", marker)} />
      {name}
    </button>
  );
}

function ToolbarButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <button className="flex h-8 items-center gap-1.5 rounded px-2 hover:bg-[#f4f5f7] dark:hover:bg-[#262a34]">{icon}{label}</button>;
}

function groupTasks(tasks: Task[], groupBy: GroupBy) {
  if (groupBy === "none") return [{ key: "all", label: "Tasks", tasks }];
  const map = new Map<string, Task[]>();
  for (const task of tasks) {
    const key = groupBy === "status" ? statusConfig[task.status].label : groupBy === "priority" ? priorityConfig[task.priority].label : task.assignees[0] ?? "Unassigned";
    map.set(key, [...(map.get(key) ?? []), task]);
  }
  return Array.from(map, ([key, value]) => ({ key, label: key, tasks: value }));
}

function TaskRow({ task, onOpen, dense = false }: { task: Task; onOpen: (id: string) => void; dense?: boolean }) {
  return (
    <button onClick={() => onOpen(task.id)} className={cls("grid w-full grid-cols-[minmax(280px,1fr)_190px_110px_120px_100px] items-center border-b border-[#e8eaed] px-6 text-left text-sm hover:bg-[#f8f9fb] dark:border-[#2a2e38] dark:hover:bg-[#20232c]", dense ? "h-10" : "h-11")}>
      <span className="flex items-center gap-2">
        <StatusDot status={task.status} />
        <span>{task.title}</span>
        {task.dependencies.length ? <span className="text-xs text-slate-400">⌘ {task.dependencies.length}</span> : null}
        {task.comments ? <span className="text-xs text-slate-400">▢ {task.comments}</span> : null}
      </span>
      <span className="flex items-center -space-x-2">{task.assignees.map((id) => <Avatar key={id} id={id} />)}</span>
      <span className={todayLabel(task.dueDate).includes("Today") || todayLabel(task.dueDate).includes("Tomorrow") ? "text-orange-500" : "text-slate-500"}>{todayLabel(task.dueDate)}</span>
      <PriorityFlag priority={task.priority} />
      <span>{task.storyPoints}</span>
    </button>
  );
}

function ListView({ tasks, groupBy, onOpen, onAdd }: { tasks: Task[]; groupBy: GroupBy; onOpen: (id: string) => void; onAdd: (status?: StatusKey) => void }) {
  return (
    <div className="min-w-[900px]">
      <div className="grid h-8 grid-cols-[minmax(280px,1fr)_190px_110px_120px_100px] items-center border-b border-[#e8eaed] px-6 text-[11px] font-semibold text-slate-400 dark:border-[#2a2e38]">
        <span>NAME</span><span>ASSIGNEE</span><span>DUE DATE</span><span>PRIORITY</span><span>STORY POINTS</span>
      </div>
      {groupTasks(tasks, groupBy).map((group) => (
        <div key={group.key}>
          <div className="flex h-9 items-center gap-3 border-b border-[#e8eaed] px-6 text-sm dark:border-[#2a2e38]">
            <ChevronDown className="size-4 text-slate-400" />
            <span className={cls("rounded px-2 py-0.5 text-[11px] font-bold", groupBy === "status" ? statusByLabel(group.label) : "bg-slate-100 text-slate-500 dark:bg-[#2f333f]")}>{group.label}</span>
            <span className="text-slate-400">{group.tasks.length}</span>
            <button onClick={() => onAdd(labelToStatus(group.label))} className="flex items-center gap-1 text-slate-400 hover:text-[#7b68ee]"><Plus className="size-4" /> Add Task</button>
          </div>
          {group.tasks.map((task) => <TaskRow key={task.id} task={task} onOpen={onOpen} />)}
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
                <div className="mb-3 flex flex-wrap gap-1">{task.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div>
                <div className="flex items-center justify-between text-xs text-slate-500"><span>{todayLabel(task.dueDate)}</span><span className="flex -space-x-2">{task.assignees.map((id) => <Avatar key={id} id={id} />)}</span></div>
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
              const start = Number(task.startDate.slice(-2));
              const due = Number(task.dueDate.slice(-2));
              const left = Math.max(0, start - 4) * px + 10;
              const width = Math.max(1, due - start + 1) * px - 20;
              return (
                <div key={task.id} className="relative h-10 border-b border-[#2a2e38]">
                  {days.map((day) => <span key={day} className="absolute top-0 h-10 border-r border-[#2a2e38]" style={{ left: (day - 4) * px, width: 1 }} />)}
                  <button onClick={() => onOpen(task.id)} className={cls("absolute top-2 flex h-5 items-center justify-between rounded-full px-2 text-[11px] text-white", dark ? "bg-slate-500" : "bg-[#87909e]")} style={{ left, width }}>
                    <span className="truncate">{task.title}</span>
                    <Avatar id={task.assignees[0] ?? "SC"} />
                  </button>
                  {task.dependencies.length ? <svg className="pointer-events-none absolute inset-0 overflow-visible"><path d={`M ${Math.max(0, start - 5) * px + 40} 20 C ${left - 30} 20 ${left - 30} 20 ${left} 20`} stroke="#87909e" fill="none" strokeWidth="2" /></svg> : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function TableView({ tasks, groupBy, onOpen, onPatch }: { tasks: Task[]; groupBy: GroupBy; onOpen: (id: string) => void; onPatch: (id: string, patch: Partial<Task>) => void }) {
  const grouped = groupTasks(tasks, groupBy);
  return (
    <div className="min-w-[980px]">
      <div className="grid h-9 grid-cols-[42px_minmax(280px,1fr)_190px_110px_120px_120px] items-center border-b border-[#e8eaed] px-4 text-[11px] font-semibold text-slate-400 dark:border-[#2a2e38]">
        <span></span><span>NAME</span><span>ASSIGNEE</span><span>DUE DATE</span><span>PRIORITY</span><span>STORY POINTS</span>
      </div>
      {grouped.map((group) => (
        <div key={group.key}>
          <div className="flex h-8 items-center gap-2 border-b border-[#e8eaed] px-4 dark:border-[#2a2e38]"><ChevronDown className="size-4 text-slate-400" /><span className="text-xs font-semibold">{group.label}</span><span className="text-xs text-slate-400">{group.tasks.length}</span></div>
          {group.tasks.map((task) => (
            <div key={task.id} className="grid h-10 grid-cols-[42px_minmax(280px,1fr)_190px_110px_120px_120px] items-center border-b border-[#e8eaed] px-4 text-sm hover:bg-[#f8f9fb] dark:border-[#2a2e38] dark:hover:bg-[#20232c]">
              <button onClick={() => onPatch(task.id, { status: task.status === "complete" ? "todo" : "complete" })}><StatusDot status={task.status} /></button>
              <button onClick={() => onOpen(task.id)} className="truncate text-left">{task.title}</button>
              <span className="flex -space-x-2">{task.assignees.map((id) => <Avatar key={id} id={id} />)}</span>
              <span>{todayLabel(task.dueDate)}</span>
              <PriorityFlag priority={task.priority} />
              <span>{task.storyPoints}</span>
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

function TaskModal({ task, onClose, onPatch }: { task: Task; onClose: () => void; onPatch: (id: string, patch: Partial<Task>) => void }) {
  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-black/45 p-8">
      <div className="flex max-h-[90vh] w-full max-w-[1080px] overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-[#20232c]">
        <div className="min-w-0 flex-1 overflow-y-auto p-6">
          <div className="mb-8 flex items-center gap-2"><span className={cls("rounded px-2 py-0.5 text-[11px] font-bold", statusConfig[task.status].badge)}>{statusConfig[task.status].label}</span><span className="text-sm text-slate-500">in {task.list}</span></div>
          <input value={task.title} onChange={(event) => onPatch(task.id, { title: event.target.value })} className="mb-5 w-full bg-transparent text-2xl font-bold outline-none" />
          <div className="mb-6">
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500"><List className="size-4" /> Description</div>
            <textarea value={task.description} onChange={(event) => onPatch(task.id, { description: event.target.value })} className="min-h-24 w-full rounded-lg border border-[#e8eaed] bg-transparent p-3 outline-none focus:border-[#7b68ee] dark:border-[#2a2e38]" />
          </div>
          <section className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 font-medium"><Check className="size-4" /> Subtasks <span className="text-sm text-slate-400">{task.subtasks.length}</span></h3>
            <div className="overflow-hidden rounded-lg border border-[#e8eaed] dark:border-[#2a2e38]">
              {task.subtasks.map((subtask) => (
                <div key={subtask.id} className="flex h-9 items-center gap-3 border-b border-[#e8eaed] px-3 last:border-b-0 dark:border-[#2a2e38]">
                  {subtask.done ? <StatusDot status="complete" /> : <StatusDot status="progress" />}
                  <span className="text-sm">{subtask.title}</span>
                  <span className="ml-auto"><Avatar id={subtask.assignee} /></span>
                </div>
              ))}
              <button onClick={() => onPatch(task.id, { subtasks: [...task.subtasks, { id: `sub-${Date.now()}`, title: "New subtask", done: false, assignee: "SC" }] })} className="flex h-9 items-center gap-2 px-3 text-sm text-slate-400 hover:text-[#7b68ee]"><Plus className="size-4" /> Add a subtask</button>
            </div>
          </section>
          <section className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 font-medium"><Check className="size-4" /> Checklists</h3>
            <button onClick={() => onPatch(task.id, { checklists: [...task.checklists, "New checklist"] })} className="flex h-9 items-center gap-2 text-sm text-slate-400 hover:text-[#7b68ee]"><Plus className="size-4" /> Add checklist</button>
          </section>
          <section className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 font-medium"><Paperclip className="size-4" /> Attachments</h3>
            <div className="grid h-20 place-items-center rounded-lg border border-dashed border-[#e8eaed] text-sm text-slate-400 dark:border-[#2a2e38]"><Paperclip className="size-4" />Drop files or click to upload</div>
          </section>
          <section>
            <h3 className="mb-3 flex items-center gap-2 font-medium"><Timer className="size-4" /> Time tracking</h3>
            <div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-lg bg-[#fafbfc] p-3 dark:bg-[#15171d]"><span className="block text-xs text-slate-400">LOGGED</span>{task.timeLogged}</div><div className="rounded-lg bg-[#fafbfc] p-3 dark:bg-[#15171d]"><span className="block text-xs text-slate-400">ESTIMATE</span>{task.timeEstimate}</div></div>
          </section>
        </div>
        <aside className="w-[320px] shrink-0 border-l border-[#e8eaed] bg-[#fafbfc] p-6 dark:border-[#2a2e38] dark:bg-[#1f222b]">
          <div className="mb-8 flex justify-end gap-2"><MoreHorizontal className="size-4 text-slate-400" /><Columns3 className="size-4 text-slate-400" /><button onClick={onClose}><X className="size-4 text-slate-400" /></button></div>
          <MetaRow label="Assignees"><span className="flex -space-x-2">{task.assignees.map((id) => <Avatar key={id} id={id} size="md" />)}</span></MetaRow>
          <MetaRow label="Due date"><span className="text-orange-500">{todayLabel(task.dueDate)}</span></MetaRow>
          <MetaRow label="Start date"><span className="text-red-500">{todayLabel(task.startDate)}</span></MetaRow>
          <MetaRow label="Priority"><PriorityFlag priority={task.priority} /></MetaRow>
          <MetaRow label="Recurring"><span className="text-slate-500">Doesn&apos;t repeat</span></MetaRow>
          <MetaRow label="Tags"><span className="flex flex-wrap gap-1">{task.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</span></MetaRow>
          <MetaRow label="Watchers"><span className="flex -space-x-2">{task.watchers.map((id) => <Avatar key={id} id={id} />)}</span></MetaRow>
          <div className="my-5 border-t border-[#e8eaed] pt-5 dark:border-[#2a2e38]">
            <p className="mb-4 text-xs font-semibold text-slate-500">CUSTOM FIELDS</p>
            <MetaRow label="Story Points">{task.storyPoints}</MetaRow>
            <MetaRow label="Environment"><span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-500 dark:bg-blue-500/15">{task.customFields.environment}</span></MetaRow>
          </div>
          <div className="border-t border-[#e8eaed] pt-5 text-xs text-slate-500 dark:border-[#2a2e38]">Created by Santiago Cotto<br />Jun 7, 2026</div>
        </aside>
      </div>
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mb-4 grid grid-cols-[100px_1fr] items-center gap-3 text-sm"><span className="text-slate-500">{label}</span><span>{children}</span></div>;
}
