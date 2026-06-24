import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

// =====================================================================
// Transcription kick-off
// =====================================================================
// This route is intentionally provider-agnostic. In production we will
// dispatch a job to a Whisper / Gemini / OpenAI worker (handled by the
// n8n side or by a future edge function); for now it accepts either:
//   - { meeting_id, attachment_id, text }   → pre-transcribed text
//   - { meeting_id, attachment_id }         → stub row + queued status
//
// In both cases it writes a row to meeting_transcriptions and flips the
// meeting status appropriately so the UI can react in real time.
// =====================================================================

const inputSchema = z.object({
  meeting_id: z.string().uuid(),
  attachment_id: z.string().uuid().optional(),
  text: z.string().min(1).optional(),
  language: z.string().min(2).max(10).optional(),
  segments: z
    .array(
      z.object({
        start: z.number().nonnegative(),
        end: z.number().nonnegative(),
        text: z.string(),
        speaker: z.string().optional(),
      }),
    )
    .optional(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const raw = await request.json().catch(() => null);
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido.", issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const body = parsed.data;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      status: "queued",
      mode: "demo",
      message: "Supabase não configurado — transcrição simulada.",
    });
  }

  const supabase = await createClient();
  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select("id, organization_id, status")
    .eq("id", body.meeting_id)
    .single();
  if (meetingError || !meeting) {
    return NextResponse.json({ error: "Reunião não encontrada." }, { status: 404 });
  }

  await supabase.from("meetings").update({ status: "transcribing" }).eq("id", meeting.id);

  // CASE A — caller already has the transcript text (n8n worker callback,
  // manual paste, or an inline Whisper run). Persist and mark transcribed.
  if (body.text && body.text.trim()) {
    const provider = process.env.OPENAI_API_KEY ? "openai" : "manual";
    const { data: transcription, error: insertError } = await supabase
      .from("meeting_transcriptions")
      .insert({
        meeting_id: meeting.id,
        organization_id: meeting.organization_id,
        attachment_id: body.attachment_id ?? null,
        text: body.text,
        language: body.language ?? "pt-BR",
        segments: body.segments ?? [],
        provider,
        model: provider === "openai" ? process.env.AI_MODEL || "gpt-4o-mini-transcribe" : null,
        created_by: session.id,
      })
      .select("id")
      .single();

    if (insertError) {
      await supabase.from("meetings").update({ status: "error" }).eq("id", meeting.id);
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    if (body.attachment_id) {
      await supabase
        .from("meeting_attachments")
        .update({ processing_status: "completed" })
        .eq("id", body.attachment_id);
    }

    await supabase.from("meetings").update({ status: "transcribed" }).eq("id", meeting.id);
    return NextResponse.json({
      status: "transcribed",
      transcription_id: transcription.id,
      message: "Transcrição registrada.",
    });
  }

  // CASE B — async job: we mark the attachment as processing and the
  // worker will call back with the text via this same endpoint.
  if (body.attachment_id) {
    await supabase
      .from("meeting_attachments")
      .update({ processing_status: "processing" })
      .eq("id", body.attachment_id);
  }

  return NextResponse.json({
    status: "transcribing",
    transcription_id: null,
    message: "Job de transcrição agendado. Aguarde callback do worker.",
  });
}
