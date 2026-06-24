import { getMeetings } from "@/lib/repositories";
import { PageHeader } from "@/components/page-parts";
import { MeetingsList } from "@/components/MeetingsList";

export default async function MeetingsPage() {
  const meetings = await getMeetings();
  return (
    <div>
      <PageHeader
        eyebrow="Memória da empresa"
        title="Reuniões"
        description="Centralize transcrições, decisões, riscos e planos de ação."
      />
      <MeetingsList meetings={meetings} />
    </div>
  );
}
