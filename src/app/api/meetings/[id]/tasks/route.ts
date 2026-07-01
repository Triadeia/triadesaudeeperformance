import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const allowedRoles = new Set(["owner", "admin", "manager"]);

const inputSchema = z.object({
  decision_id: z.string().uuid().optional(),
  title: z.string().min(3).max(220).optional(),
  description: z.string().max(4000).optional().nullable(),
  priority: z.enum(["urgent", "high", "medium", "low"]).optional(),
  area: z.string().min(1).max(120).optional(),
  source_kind: z.enum(["decision", "risk", "opportunity", "action", "manual"]).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!allowedRoles.has(session.role)) {
    return NextResponse.json({ error: "Sem permissão para sincronizar tarefas." }, { status: 403 });
  }

  const { id: meetingId } = await params;
  const raw = await request.json().catch(() => null);
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido.", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      task: {
        id: `demo-task-${Date.now()}`,
        meeting_id: meetingId,
        title: parsed.data.title ?? "Tarefa da reunião",
        description: parsed.data.description ?? "",
        status: "todo",
        priority: parsed.data.priority ?? "medium",
        area: parsed.data.area ?? "Reuniões",
        workspace_meta: {
          source: "meeting",
          source_kind: parsed.data.source_kind ?? "manual",
          decision_id: parsed.data.decision_id ?? null,
        },
      },
      mode: "demo",
    }, { status: 201 });
  }

  const supabase = await createClient();
  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select("id, organization_id, title")
    .eq("id", meetingId)
    .single();
  if (meetingError || !meeting) {
    return NextResponse.json({ error: "Reunião não encontrada." }, { status: 404 });
  }

  let title = parsed.data.title?.trim() ?? "";
  let description = parsed.data.description ?? "";
  if (parsed.data.decision_id) {
    const { data: decision } = await supabase
      .from("meeting_decisions")
      .select("id, title, description, status")
      .eq("id", parsed.data.decision_id)
      .eq("meeting_id", meetingId)
      .maybeSingle();
    if (decision) {
      title = title || decision.title;
      description = description || decision.description || "";
    }
  }

  if (!title) {
    return NextResponse.json({ error: "Título da tarefa obrigatório." }, { status: 422 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", session.id)
    .single();
  if (!profile?.organization_id) {
    return NextResponse.json({ error: "Organização não encontrada." }, { status: 403 });
  }

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      organization_id: profile.organization_id,
      creator_id: session.id,
      user_id: session.id,
      meeting_id: meeting.id,
      title,
      description: description || null,
      status: "todo",
      priority: parsed.data.priority ?? "medium",
      area: parsed.data.area ?? "Reuniões",
      ai_score: 70,
      workspace_meta: {
        source: "meeting",
        source_kind: parsed.data.source_kind ?? (parsed.data.decision_id ? "decision" : "manual"),
        decision_id: parsed.data.decision_id ?? null,
        meeting_title: meeting.title,
      },
    })
    .select("id, title, description, status, priority, area, meeting_id, due_at, ai_score, position, workspace_meta, created_at, updated_at")
    .single();

  if (error || !task) {
    return NextResponse.json(
      { error: error?.message ?? "Falha ao criar tarefa da reunião." },
      { status: 400 },
    );
  }

  return NextResponse.json({ task }, { status: 201 });
}
