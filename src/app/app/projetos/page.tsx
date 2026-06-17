import { ArrowUpRight, FolderKanban } from "lucide-react";
import { Badge, PageHeader } from "@/components/page-parts";
import { getProjects } from "@/lib/repositories";

export default async function ProjectsPage() {
  const projects = await getProjects();
  return <div><PageHeader eyebrow="Portfólio" title="Projetos e roadmap" description="Acompanhe responsáveis, progresso e próximos marcos." /><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{projects.map((project) => <article key={project.id} className="panel p-5"><div className="flex items-start justify-between"><div className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><FolderKanban /></div><ArrowUpRight className="size-5 text-slate-300" /></div><h2 className="mt-5 font-heading text-lg font-semibold">{project.name}</h2><div className="mt-3 flex items-center justify-between"><span className="text-sm text-slate-500">Responsável: <strong className="text-slate-700">{project.owner}</strong></span><Badge>{String(project.status)}</Badge></div><div className="mt-6"><div className="mb-2 flex justify-between text-xs font-bold"><span>Progresso</span><span>{project.progress}%</span></div><div className="h-2.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${project.progress}%` }} /></div></div></article>)}</div></div>;
}
