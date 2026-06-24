import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { meetings as fallbackMeetings } from "@/lib/data"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ meetings: fallbackMeetings, total: fallbackMeetings.length, mode: "demo" })
  }

  const supabase = await createClient()
  let query = supabase
    .from("meetings")
    .select("*", { count: "exact" })
    .eq("user_id", session.id)
    .order("starts_at", { ascending: false })
    .range(0, 20)

  const status = searchParams.get("status")
  if (status) query = query.eq("status", status)
  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ meetings: data || [], total: count || 0 })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const title = String(body.title || "").trim()
  if (!title) return NextResponse.json({ error: "Título obrigatório." }, { status: 422 })

  const startsAt = body.starts_at || body.meeting_date || new Date().toISOString()
  const participants = Array.isArray(body.participants) ? body.participants : []

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        id: `meeting-local-${Date.now()}`,
        user_id: session.id,
        title,
        description: body.description || null,
        meeting_date: startsAt,
        starts_at: startsAt,
        participants,
        status: "draft",
        tags: [],
        mode: "demo",
      },
      { status: 201 },
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("meetings")
    .insert({
      user_id: session.id,
      title,
      description: body.description || null,
      meeting_date: startsAt,
      starts_at: startsAt,
      participants,
      status: "draft",
      tags: [],
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
