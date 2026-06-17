import { PageHeader } from "@/components/page-parts";
import { TasksWorkspace } from "@/components/tasks-workspace";
import { getTasks } from "@/lib/repositories";

export default async function TasksPage() {
  const tasks = await getTasks();
  return <div><PageHeader eyebrow="Execução conectada" title="Tarefas" description="Planeje, priorize e transforme decisões em trabalho rastreável." /><TasksWorkspace initialTasks={tasks} /></div>;
}
