import { notFound } from "next/navigation";
import { MeetingDetail } from "@/components/MeetingDetail";
import { getMeetings } from "@/lib/repositories";

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meetings = await getMeetings();
  const meeting = meetings.find((item) => item.id === id);
  if (!meeting) notFound();
  return <MeetingDetail meeting={meeting} />;
}
