"use client";

import { MeetingDetail } from "@/components/MeetingDetail";

export default function MeetingPage({ params }: { params: { id: string } }) {
  return <MeetingDetail meetingId={params.id} />;
}
