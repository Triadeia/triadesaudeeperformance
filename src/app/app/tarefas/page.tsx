"use client";

import { PageHeader } from "@/components/page-parts";
import TasksWorkspace from "@/components/tasks-workspace";

export default function TasksPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Execução conectada"
        title="Tarefas"
        description="Planeje, priorize e transforme decisões em trabalho rastreável. Tudo local — seus dados ficam no navegador."
      />
      <TasksWorkspace />
    </div>
  );
}
