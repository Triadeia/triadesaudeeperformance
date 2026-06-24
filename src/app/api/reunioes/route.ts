import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const createSchema = z.object({
  title: z.string().min(3).max(220),
  description: z.string().max(4000).optional().nullable(),
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
  tags: z.array(z.string().min(1).max(40)).optional().default([]),
  participants: z
    .array(
      z.object({
        profile_id: z.string().uuid().optional().nullable(),
        display_name: z.string().min(1).max(120).optional().nullable(),
        email: z.string().email().optional().nullable(),
      }),
    )
    .optional()
    .default([]),
  source: z.enum(["upload", "google_drive", "link", "youtube"]).optional(),
  source_ref: z.string().max(2000).optional().nullable(),
});

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ meetings: [], mode: "demo" });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const search = url.searchParams.get("search");

  const supabase = await createClient();
  let query = supabase
    .from("meetings")
    .select(
      `id, title, description, starts_at, ends_at, status, tags, created_at, updated_at,
       meeting_participants(id, profile_id, display_name, email, attended),
       meeting_attachments(id, filename, processing_status)`,
    )
    .order("starts_at", { ascending: false, nullsFirst: false });

  if (status) query = query.eq("status", status);
  if (from) query = query.gte("starts_at", from);
  if (to) query = query.lte("starts_at", to);
  if (search) query = query.ilike("title", `%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ meetings: data ?? [] });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const raw = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido.", issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const body = parsed.data;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        meeting: { id: `mock-${Date.now()}`, ...body, status: "draft" },
        mode: "demo",
      },
      { status: 201 },
    );
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", session.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Perfil não encontrado." }, { status: 403 });

  const { data: meeting, error } = await supabase
    .from("meetings")
    .insert({
      organization_id: profile.organization_id,
      title: body.title,
      description: body.description ?? null,
      starts_at: body.starts_at ?? null,
      ends_at: body.ends_at ?? null,
      tags: body.tags ?? [],
      status: "draft",
      created_by: session.id,
    })
    .select("id, title, description, starts_at, ends_at, status, tags, created_at")
    .single();

  if (error || !meeting) {
    return NextResponse.json(
      { error: error?.message ?? "Falha ao criar reunião." },
      { status: 400 },
    );
  }

  if (body.participants.length) {
    const participantsPayload = body.participants.map((participant) => ({
      meeting_id: meeting.id,
      profile_id: participant.profile_id ?? null,
      display_name: participant.display_name ?? null,
      email: participant.email ?? null,
    }));
    await supabase.from("meeting_participants").insert(participantsPayload);
  }

  if (body.source && body.source !== "upload" && body.source_ref) {
    await supabase.from("meeting_attachments").insert({
      meeting_id: meeting.id,
      organization_id: profile.organization_id,
      filename: body.source_ref,
      mime_type: "external/reference",
      size: 0,
      source: body.source,
      source_ref: body.source_ref,
      processing_status: "pending",
      uploaded_by: session.id,
    });
  }

  return NextResponse.json({ meeting }, { status: 201 });
}
