/**
 * CRUD de tarefas — recurso individual.
 *
 * PUT    /api/tasks/:id  Atualização parcial (todos os campos opcionais).
 * DELETE /api/tasks/:id  Remove a tarefa.
 *
 * Notas:
 *   - O recurso é escopado pela RLS (organization + creator). Não filtramos por
 *     creator_id no UPDATE/DELETE porque queremos permitir que membros da mesma
 *     organização editem tarefas. A RLS no banco é a fonte da verdade.
 *   - Retornos seguem o contrato PT-BR (mesmos rótulos do GET).
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
} from "../_mappers";

const StatusLabel = z.enum([...TASK_STATUS_LABELS] as [TaskStatusLabel, ...TaskStatusLabel[]]);
const PriorityLabel = z.enum([
  ...TASK_PRIORITY_LABELS,
] as [TaskPriorityLabel, ...TaskPriorityLabel[]]);

const UpdateTaskSchema = z
  .object({
    title: z.string().min(3).max(280).optional(),
    description: z.string().max(8_000).nullable().optional(),
    status: StatusLabel.optional(),
    priority: PriorityLabel.optional(),
    assignee: z.string().max(120).nullable().optional(),
    project: z.string().max(120).nullable().optional(),
    area: z.string().max(120).nullable().optional(),
    position: z.number().int().nullable().optional(),
    due_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "due_date deve ser YYYY-MM-DD.")
      .nullable()
      .optional(),
    score: z.number().int().min(0).max(100).optional(),
    workspace_meta: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Envie ao menos um campo para atualizar.",
  });

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
  position: number | null;
  workspace_meta?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  assignee: AssigneeJoin;
  project: ProjectJoin;
}

const TASK_SELECT = `
  id, title, description, status, priority, area, meeting_id, due_at, ai_score,
  position,
  workspace_meta,
  created_at, updated_at,
  assignee:profiles!tasks_assignee_id_fkey(full_name),
  project:projects(name)
` as const;

const TASK_SELECT_LEGACY = `
  id, title, description, status, priority, area, meeting_id, due_at, ai_score,
  position,
  created_at, updated_at,
  assignee:profiles!tasks_assignee_id_fkey(full_name),
  project:projects(name)
` as const;

const PRODUCTION_BLOCKED_MESSAGE =
  "O painel de tarefas foi bloqueado porque as variáveis obrigatórias do Supabase não estão configuradas neste ambiente.";

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
    position: row.position,
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

function toStatusLabel(value: string): TaskStatusLabel {
  if ((TASK_STATUS_LABELS as readonly string[]).includes(value)) return value as TaskStatusLabel;
  return (TASK_STATUS_LABELS.find((label) => fromStatusLabel(label) === value) ?? "Backlog") as TaskStatusLabel;
}

function toPriorityLabel(value: string | null): TaskPriorityLabel {
  if (value && (TASK_PRIORITY_LABELS as readonly string[]).includes(value)) return value as TaskPriorityLabel;
  return (TASK_PRIORITY_LABELS.find((label) => fromPriorityLabel(label) === value) ?? "Média") as TaskPriorityLabel;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id obrigatório." }, { status: 422 });

  const json = await request.json().catch(() => null);
  const parsed = UpdateTaskSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido.", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const body = parsed.data;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: PRODUCTION_BLOCKED_MESSAGE }, { status: 503 });
  }

  const supabase = await createClient();

  // Monta o patch convertendo rótulos PT-BR → slugs e nomes → IDs.
  const patch: Record<string, unknown> = {};
  if (body.title !== undefined) patch.title = body.title.trim();
  if (body.description !== undefined) patch.description = body.description;
  if (body.status !== undefined) patch.status = fromStatusLabel(body.status);
  if (body.priority !== undefined) patch.priority = fromPriorityLabel(body.priority);
  if (body.area !== undefined) patch.area = body.area;
  if (body.position !== undefined) patch.position = body.position;
  if (body.due_date !== undefined) {
    patch.due_at = body.due_date ? `${body.due_date}T00:00:00Z` : null;
  }
  if (body.score !== undefined) patch.ai_score = body.score;
  if (body.workspace_meta !== undefined) patch.workspace_meta = body.workspace_meta;
  if (body.assignee !== undefined) {
    patch.assignee_id = body.assignee
      ? await resolveProfileId(supabase, body.assignee)
      : null;
  }
  if (body.project !== undefined) {
    patch.project_id = body.project
      ? await resolveProjectId(supabase, body.project)
      : null;
  }

  let { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", id)
    .select(TASK_SELECT)
    .single();

  if (isMissingWorkspaceMeta(error)) {
    const legacyPatch = { ...patch };
    delete legacyPatch.workspace_meta;
    const legacy = await supabase
      .from("tasks")
      .update(legacyPatch)
      .eq("id", id)
      .select(TASK_SELECT_LEGACY)
      .single();
    data = legacy.data ? ({ ...legacy.data, workspace_meta: {} } as typeof data) : null;
    error = legacy.error;
  }

  if (error) {
    // RLS bloqueia/oculta → 404 evita vazar existência.
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(shapeTask(data as unknown as TaskRow));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id obrigatório." }, { status: 422 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: PRODUCTION_BLOCKED_MESSAGE }, { status: 503 });
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("tasks")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (count === 0) {
    return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function resolveProfileId(
  supabase: SupabaseClient,
  name: string,
): Promise<string | null> {
  if (!name.trim()) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("full_name", name.trim())
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

async function resolveProjectId(
  supabase: SupabaseClient,
  name: string,
): Promise<string | null> {
  if (!name.trim()) return null;
  const { data } = await supabase
    .from("projects")
    .select("id")
    .eq("name", name.trim())
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}
