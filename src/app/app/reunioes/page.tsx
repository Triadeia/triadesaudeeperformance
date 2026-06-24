<<<<<<< HEAD
import { MeetingsList } from "@/components/MeetingsList";

export default function MeetingsPage() {
  return <MeetingsList />;
=======
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
>>>>>>> 59b2649fbc9d8fc283a5fdc1aa06150c2b0912d8
}
