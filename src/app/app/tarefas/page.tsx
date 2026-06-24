import { PageHeader } from "@/components/page-parts";
import { TasksWorkspace } from "@/components/tasks-workspace";

/**
 * Página de tarefas — 100% frontend.
 *
 * O componente cliente `TasksWorkspace` carrega o estado direto do localStorage
 * (com fallback do seed em `src/lib/data.ts`). Sem chamadas a Supabase ou a `/api/tasks/*`.
 */
export default function TasksPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Execução conectada"
        title="Tarefas"
        description="Planeje, priorize e transforme decisões em trabalho rastreável."
      />
      <TasksWorkspace />
    </div>
  );
}
