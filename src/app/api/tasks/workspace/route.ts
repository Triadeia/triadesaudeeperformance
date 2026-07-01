import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const WORKSPACE_CONFIG_NAME = "__open_clickup_workspace__";
const PRODUCTION_BLOCKED_MESSAGE =
  "A configuração do workspace foi bloqueada porque as variáveis obrigatórias do Supabase não estão configuradas neste ambiente.";

const WorkspaceSchema = z.object({
  workspaceName: z.string().min(1).optional(),
  language: z.enum(["pt-BR", "en-US"]).optional(),
  spaces: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      emoji: z.string().min(1),
      favorite: z.boolean().optional(),
      collapsed: z.boolean().optional(),
      lists: z.array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          marker: z.string().min(1),
          favorite: z.boolean().optional(),
          collapsed: z.boolean().optional(),
        }),
      ),
    }),
  ),
  teams: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        emoji: z.string().min(1),
        color: z.string().min(1),
        memberIds: z.array(z.string().min(1)).optional(),
      }),
    )
    .optional(),
  members: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        email: z.string().email().or(z.literal("")).optional(),
        role: z.string().min(1),
        area: z.string().min(1),
        active: z.boolean(),
        color: z.string().min(1).optional(),
        teamId: z.string().min(1).optional(),
      }),
    )
    .optional(),
  notificationPrefs: z
    .object({
      desktopAlerts: z.boolean().optional(),
      emailDigest: z.boolean().optional(),
      dueSoon: z.boolean().optional(),
      meetingSync: z.boolean().optional(),
    })
    .optional(),
  favorites: z.array(z.string().min(1)).optional(),
  collapsedSpaces: z.array(z.string().min(1)).optional(),
  collapsedLists: z.array(z.string().min(1)).optional(),
  spaceOrder: z.array(z.string().min(1)).optional(),
  listOrder: z.array(z.string().min(1)).optional(),
  activeList: z.string().min(1).optional(),
  activeSpaceId: z.string().min(1).optional(),
  view: z.enum(["list", "board", "calendar", "gantt", "table"]).optional(),
  groupBy: z.enum(["status", "priority", "assignee", "none"]).optional(),
  filterPriority: z.enum(["all", "urgent", "high", "normal", "low"]).optional(),
  sortBy: z.enum(["manual", "due", "priority"]).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: PRODUCTION_BLOCKED_MESSAGE }, { status: 503 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_filters")
    .select("filters")
    .eq("user_id", session.id)
    .eq("name", WORKSPACE_CONFIG_NAME)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ workspace: null, warning: error.message });
  }

  const parsed = WorkspaceSchema.safeParse(data?.filters);
  return NextResponse.json({ workspace: parsed.success ? parsed.data : null });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = WorkspaceSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido.", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: PRODUCTION_BLOCKED_MESSAGE }, { status: 503 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("task_filters")
    .upsert(
      {
        user_id: session.id,
        name: WORKSPACE_CONFIG_NAME,
        filters: parsed.data,
        is_default: false,
      },
      { onConflict: "user_id,name" },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ workspace: parsed.data });
}
