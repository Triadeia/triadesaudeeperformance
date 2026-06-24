import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSession } from "@/lib/auth"

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)
  
  const { data, error, count } = await supabase
    .from("meetings")
    .select("*", { count: "exact" })
    .eq("user_id", session.id)
    .order("meeting_date", { ascending: false })
    .range(0, 20)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ meetings: data || [], total: count || 0 })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)
  
  const { data, error } = await supabase
    .from("meetings")
    .insert({
      user_id: session.id,
      title: body.title,
      description: body.description,
      meeting_date: body.meeting_date,
      participants: body.participants || []
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
