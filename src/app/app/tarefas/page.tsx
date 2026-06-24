import { PageHeader } from "@/components/page-parts";
import { TasksWorkspace } from "@/components/tasks-workspace";

/**
 * Página de tarefas — 100% frontend.
 *
 * O componente cliente `TasksWorkspace` carrega o estado direto do localStorage
 * (com fallback do seed em `src/lib/data.ts`). Sem chamadas a Supabase ou a `/api/tasks/*`.
 */
=======
"use client";

import { PageHeader } from "@/components/page-parts";
import TasksWorkspace from "@/components/tasks-workspace";

>>>>>>> 59b2649fbc9d8fc283a5fdc1aa06150c2b0912d8
export default function TasksPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Execução conectada"
        title="Tarefas"
        description="Planeje, priorize e transforme decisões em trabalho rastreável."
=======
        description="Planeje, priorize e transforme decisões em trabalho rastreável. Tudo local — seus dados ficam no navegador."
>>>>>>> 59b2649fbc9d8fc283a5fdc1aa06150c2b0912d8
      />
      <TasksWorkspace />
    </div>
  );
}
