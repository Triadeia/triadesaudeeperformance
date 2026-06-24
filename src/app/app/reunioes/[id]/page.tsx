"use client";

import { MeetingDetail } from "@/components/MeetingDetail";

export default function MeetingPage({ params }: { params: { id: string } }) {
  return <MeetingDetail meetingId={params.id} />;
=======
import { notFound } from "next/navigation";
import { MeetingDetail } from "@/components/MeetingDetail";
import { getMeetings } from "@/lib/repositories";

export default async function MeetingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ title?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const meetings = await getMeetings();
  const meeting = meetings.find((item) => item.id === id);
  if (!meeting && id.startsWith("meeting-local-")) {
    return (
      <MeetingDetail
        meeting={{
          id,
          title: query.title || "Nova reunião",
          date: new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date()),
          time: new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date()),
          participants: [],
          status: "draft",
          tags: ["Demo"],
          summary: "Reunião criada no modo demo. Configure o Supabase para persistência definitiva.",
          strategic: "Adicione uma transcrição para gerar análise estratégica.",
          decisions: [],
          risks: [],
          opportunities: [],
        }}
      />
    );
  }
  if (!meeting) notFound();
  return <MeetingDetail meeting={meeting} />;
>>>>>>> 59b2649fbc9d8fc283a5fdc1aa06150c2b0912d8
}
