/**
 * CRUD de tarefas — coleção.
 *
 * GET  /api/tasks       Lista tarefas do usuário autenticado com filtros + paginação.
 * POST /api/tasks       Cria nova tarefa.
 *
 * Sessão: `getSession()` (suporta modo demo e Supabase). Quando Supabase não está
 * configurado, devolvemos um fallback estático para manter a UI populada.
 *
 * Schema (Supabase):
 *   tasks(id, organization_id, title, description, status, priority, area,
 *         assignee_id → profiles, project_id → projects, due_at, ai_score,
 *         creator_id, created_at, updated_at)
 *
 * Contrato externo (camada de UI):
 *   status   ∈ "Backlog" | "A Fazer" | "Em andamento" | "Em revisão"
 *            | "Bloqueada" | "Concluída" | "Cancelada"
 *   priority ∈ "Urgente" | "Alta" | "Média" | "Baixa"
 *   assignee → nome (string) — resolvido contra profiles.full_name
 *   project  → nome (string) — resolvido contra projects.name
 *   due_date → ISO yyyy-mm-dd  (mapeia para due_at TIMESTAMPTZ)
 *   score    → ai_score        (0–100)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  fromPriorityLabel,
  fromStatusLabel,
  type TaskPriorityLabel,
  type TaskStatusLabel,
} from "./_mappers";

const StatusLabel = z.enum([...TASK_STATUS_LABELS] as [TaskStatusLabel, ...TaskStatusLabel[]]);
const PriorityLabel = z.enum([
  ...TASK_PRIORITY_LABELS,
] as [TaskPriorityLabel, ...TaskPriorityLabel[]]);

const CreateTaskSchema = z.object({
  title: z.string().min(3, "title precisa de no mínimo 3 caracteres."),
  description: z.string().max(8_000).optional(),
  status: StatusLabel.optional(),
  priority: PriorityLabel.optional(),
  assignee: z.string().min(1).max(120).optional(),
  project: z.string().min(1).max(120).optional(),
  area: z.string().min(1).max(120).optional(),
  meeting_id: z.string().uuid().optional(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "due_date deve ser YYYY-MM-DD.")
    .optional(),
  score: z.number().int().min(0).max(100).optional(),
  workspace_meta: z.record(z.string(), z.unknown()).optional(),
});

/** Tipos de linha retornada pelo Supabase no SELECT abaixo. */
type AssigneeJoin = { full_name: string | null } | { full_name: string | null }[] | null;
type ProjectJoin = { name: string | null } | { name: string | null }[] | null;
interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  area: string | null;
  meeting_id: string | null;
  due_at: string | null;
  ai_score: number | null;
  workspace_meta?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  assignee: AssigneeJoin;
  project: ProjectJoin;
}

const TASK_SELECT = `
  id, title, description, status, priority, area, meeting_id, due_at, ai_score,
  workspace_meta,
  created_at, updated_at,
  assignee:profiles!tasks_assignee_id_fkey(full_name),
  project:projects(name)
` as const;

const TASK_SELECT_LEGACY = `
  id, title, description, status, priority, area, meeting_id, due_at, ai_score,
  created_at, updated_at,
  assignee:profiles!tasks_assignee_id_fkey(full_name),
  project:projects(name)
` as const;

function pickOne<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function shapeTask(row: TaskRow) {
  const assignee = pickOne(row.assignee);
  const project = pickOne(row.project);
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    status: toStatusLabel(row.status),
    priority: toPriorityLabel(row.priority),
    assignee: assignee?.full_name ?? "",
    project: project?.name ?? "",
    area: row.area ?? "",
    meeting_id: row.meeting_id,
    due_date: row.due_at ? row.due_at.slice(0, 10) : null,
    score: row.ai_score ?? 0,
    workspace_meta: row.workspace_meta ?? {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function isMissingWorkspaceMeta(error: { code?: string; message?: string } | null): boolean {
  return Boolean(
    error &&
      (error.code === "42703" ||
        error.message?.includes("workspace_meta") ||
        error.message?.includes("Could not find the 'workspace_meta' column")),
  );
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const url = new URL(request.url);
  const statusLabel = url.searchParams.get("status");
  const priorityLabel = url.searchParams.get("priority");
  const assigneeName = url.searchParams.get("assignee");
  const projectName = url.searchParams.get("project");
  const dueFrom = url.searchParams.get("due_from");
  const dueTo = url.searchParams.get("due_to");
  const limit = clampInt(url.searchParams.get("limit"), 100, 1, 500);
  const offset = clampInt(url.searchParams.get("offset"), 0, 0, 100_000);

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ tasks: [], total: 0, hasMore: false, mode: "demo" });
  }

  const supabase = await createClient();

  // Resolve assignee/project nomes → IDs antes de filtrar (a UI envia nomes).
  let assigneeId: string | null = null;
  if (assigneeName) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("full_name", assigneeName)
      .maybeSingle();
    if (!data) {
      // Nome não encontrado → resultado vazio é mais útil do que erro.
      return NextResponse.json({ tasks: [], total: 0, hasMore: false });
    }
    assigneeId = data.id as string;
  }

  let projectId: string | null = null;
  if (projectName) {
    const { data } = await supabase
      .from("projects")
      .select("id")
      .eq("name", projectName)
      .maybeSingle();
    if (!data) {
      return NextResponse.json({ tasks: [], total: 0, hasMore: false });
    }
    projectId = data.id as string;
  }

  const buildQuery = (select: typeof TASK_SELECT | typeof TASK_SELECT_LEGACY) => {
    let query = supabase
      .from("tasks")
      .select(select, { count: "exact" });

    if (statusLabel) {
      const parsed = StatusLabel.safeParse(statusLabel);
      if (!parsed.success) {
        return { errorResponse: NextResponse.json({ error: "status inválido." }, { status: 422 }) };
      }
      query = query.eq("status", fromStatusLabel(parsed.data));
    }
    if (priorityLabel) {
      const parsed = PriorityLabel.safeParse(priorityLabel);
      if (!parsed.success) {
        return { errorResponse: NextResponse.json({ error: "priority inválido." }, { status: 422 }) };
      }
      query = query.eq("priority", fromPriorityLabel(parsed.data));
    }
    if (assigneeId) query = query.eq("assignee_id", assigneeId);
    if (projectId) query = query.eq("project_id", projectId);
    if (dueFrom) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dueFrom)) {
        return { errorResponse: NextResponse.json({ error: "due_from deve ser YYYY-MM-DD." }, { status: 422 }) };
      }
      query = query.gte("due_at", `${dueFrom}T00:00:00Z`);
    }
    if (dueTo) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dueTo)) {
        return { errorResponse: NextResponse.json({ error: "due_to deve ser YYYY-MM-DD." }, { status: 422 }) };
      }
      query = query.lte("due_at", `${dueTo}T23:59:59Z`);
    }
    return { query };
  };

  const firstQuery = buildQuery(TASK_SELECT);
  if ("errorResponse" in firstQuery) return firstQuery.errorResponse;

  let { data, error, count } = await firstQuery.query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (isMissingWorkspaceMeta(error)) {
    const legacyQuery = buildQuery(TASK_SELECT_LEGACY);
    if ("errorResponse" in legacyQuery) return legacyQuery.errorResponse;
    const legacy = await legacyQuery.query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    data = legacy.data
      ? (legacy.data.map((row) => ({ ...(row as unknown as Record<string, unknown>), workspace_meta: {} })) as unknown as typeof data)
      : null;
    error = legacy.error;
    count = legacy.count;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const tasks = (data ?? []).map((row) => shapeTask(row as unknown as TaskRow));
  const total = count ?? 0;
  return NextResponse.json({
    tasks,
    total,
    hasMore: offset + tasks.length < total,
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = CreateTaskSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido.", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const body = parsed.data;

  if (!isSupabaseConfigured()) {
    const now = new Date().toISOString();
    return NextResponse.json(
      {
        id: `task-local-${Date.now()}`,
        title: body.title,
        description: body.description ?? "",
        status: body.status ?? "A Fazer",
        priority: body.priority ?? "Média",
        assignee: body.assignee ?? "",
        project: body.project ?? "",
    area: body.area ?? "",
    meeting_id: body.meeting_id ?? null,
        due_date: body.due_date ?? null,
        score: body.score ?? 0,
        workspace_meta: body.workspace_meta ?? {},
        created_at: now,
        updated_at: now,
        mode: "demo",
      },
      { status: 201 },
    );
  }

  const supabase = await createClient();

  // organization_id vem do profile (multi-tenant).
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", session.id)
    .single();
  if (!profile?.organization_id) {
    return NextResponse.json({ error: "Organização não encontrada." }, { status: 403 });
  }

  // Resolve nome → ID, ignorando silenciosamente quando não encontrado.
  const assigneeId = await resolveProfileId(supabase, body.assignee);
  const projectId = await resolveProjectId(supabase, body.project);

  const insertPayload = {
    organization_id: profile.organization_id as string,
    creator_id: session.id,
    user_id: session.id,
    title: body.title.trim(),
    description: body.description ?? null,
    status: fromStatusLabel(body.status ?? "A Fazer"),
    priority: fromPriorityLabel(body.priority ?? "Média"),
    area: body.area ?? "Geral",
    assignee_id: assigneeId,
    project_id: projectId,
    meeting_id: body.meeting_id ?? null,
    due_at: body.due_date ? `${body.due_date}T00:00:00Z` : null,
    ai_score: body.score ?? 0,
    workspace_meta: body.workspace_meta ?? {},
  };

  let { data, error } = await supabase
    .from("tasks")
    .insert(insertPayload)
    .select(TASK_SELECT)
    .single();

  if (isMissingWorkspaceMeta(error)) {
    const legacyPayload: Record<string, unknown> = { ...insertPayload };
    delete legacyPayload.workspace_meta;
    const legacy = await supabase
      .from("tasks")
      .insert(legacyPayload)
      .select(TASK_SELECT_LEGACY)
      .single();
    data = legacy.data ? ({ ...legacy.data, workspace_meta: {} } as typeof data) : null;
    error = legacy.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(shapeTask(data as unknown as TaskRow), { status: 201 });
}

function toStatusLabel(value: string): TaskStatusLabel {
  if ((TASK_STATUS_LABELS as readonly string[]).includes(value)) return value as TaskStatusLabel;
  return (TASK_STATUS_LABELS.find((label) => fromStatusLabel(label) === value) ?? "Backlog") as TaskStatusLabel;
}

function toPriorityLabel(value: string | null): TaskPriorityLabel {
  if (value && (TASK_PRIORITY_LABELS as readonly string[]).includes(value)) return value as TaskPriorityLabel;
  return (TASK_PRIORITY_LABELS.find((label) => fromPriorityLabel(label) === value) ?? "Média") as TaskPriorityLabel;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  if (raw === null) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function resolveProfileId(
  supabase: SupabaseClient,
  name: string | undefined,
): Promise<string | null> {
  if (!name?.trim()) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("full_name", name.trim())
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

async function resolveProjectId(
  supabase: SupabaseClient,
  name: string | undefined,
): Promise<string | null> {
  if (!name?.trim()) return null;
  const { data } = await supabase
    .from("projects")
    .select("id")
    .eq("name", name.trim())
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}
