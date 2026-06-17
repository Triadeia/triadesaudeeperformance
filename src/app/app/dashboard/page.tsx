import Link from "next/link";
import { ArrowUpRight, Award, BookOpenText, BrainCircuit, CalendarDays, CheckCircle2, Clock3, Dumbbell, FileText, ListTodo, Target, Users } from "lucide-react";
import { getDashboardData } from "@/lib/repositories";
import { documents, students } from "@/lib/data";
import { Badge, MetricCard, PageHeader } from "@/components/page-parts";

export default async function DashboardPage() {
  const { meetings, projects, tasks } = await getDashboardData();
  const open = tasks.filter((task) => !["Concluída", "Cancelada"].includes(task.status));
  const completed = tasks.filter((task) => task.status === "Concluída");

  return (
    <div>
      <PageHeader eyebrow="Triade Saúde e Performance" title="Você não busca resultado. Você se torna o resultado." description="Painel central para método, alunos, comunidade, brandbook, oferta e operação do Código TSP." />
      <section className="panel grid overflow-hidden sm:grid-cols-2 xl:grid-cols-4 [&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:border-[var(--border)] sm:[&>*:not(:last-child)]:border-r xl:[&>*:not(:last-child)]:border-b-0">
        <MetricCard label="Membros monitorados" value={students.length} note="5 exemplos pre-carregados" icon={Users} />
        <MetricCard label="Ciclos ativos" value={3} note="Fundacao, Performance e Corrida" icon={Dumbbell} tone="blue" />
        <MetricCard label="Documentos base" value={documents.length} note="Acervo TSP catalogado" icon={BookOpenText} tone="green" />
        <MetricCard label="Tarefas abertas" value={open.length} note={`${completed.length} concluidas nesta esteira`} icon={ListTodo} tone="amber" />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-6">
          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--border)] p-5">
              <div><h2 className="font-heading text-lg font-semibold">Próximas prioridades</h2><p className="text-xs text-slate-500">Ordenadas por impacto no movimento e no painel</p></div>
              <Link href="/app/tarefas" className="text-sm font-bold text-emerald-700">Ver tarefas</Link>
            </div>
            <div className="divide-y divide-slate-100">
              {tasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center gap-4 p-4">
                  <div className="grid size-9 place-items-center rounded-xl bg-slate-100 text-xs font-extrabold">{task.score}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{task.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{task.project} · {task.assignee}</p>
                  </div>
                  <Badge tone={task.priority === "Urgente" ? "red" : "amber"}>{task.priority}</Badge>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="panel p-5">
              <div className="mb-5 flex items-center justify-between"><h2 className="font-heading font-semibold">Últimas decisões</h2><CalendarDays className="size-5 text-emerald-600" /></div>
              <div className="space-y-4">
                {meetings.map((meeting) => (
                  <Link key={meeting.id} href={`/app/reunioes/${meeting.id}`} className="block rounded-xl border border-slate-100 p-3 transition hover:border-emerald-200 hover:bg-emerald-50/30">
                    <p className="text-sm font-bold">{meeting.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{meeting.date} · {meeting.participants.length} participantes</p>
                  </Link>
                ))}
              </div>
            </div>
            <div className="panel p-5">
              <div className="mb-5 flex items-center justify-between"><h2 className="font-heading font-semibold">Roadmap Triade</h2><Target className="size-5 text-emerald-600" /></div>
              <div className="space-y-4">
                {projects.slice(0, 4).map((project) => (
                  <div key={project.id}>
                    <div className="mb-2 flex justify-between text-xs"><span className="font-bold">{project.name}</span><span>{project.progress}%</span></div>
                    <div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${project.progress}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="overflow-hidden rounded-[1.5rem] bg-[var(--navy)] p-6 text-white shadow-xl shadow-slate-900/10">
            <div className="mb-8 flex items-center justify-between"><div className="grid size-11 place-items-center rounded-2xl bg-emerald-400 text-[var(--navy)]"><BrainCircuit /></div><Badge tone="green">Código TSP</Badge></div>
            <p className="text-sm font-bold text-emerald-300">Direção estratégica</p>
            <h2 className="mt-2 font-heading text-2xl font-semibold">A gente não treina aqui. A gente reprograma.</h2>
            <p className="mt-4 text-sm leading-6 text-slate-300">O painel deve organizar Identidade, Movimento e Método para que cada aluno vire Membro Tríade, com rito, acompanhamento e prova de evolução.</p>
            <Link href="/app/marca/movimento" className="mt-6 flex items-center gap-2 text-sm font-bold text-emerald-300">Abrir manifesto <ArrowUpRight className="size-4" /></Link>
          </div>
          <div className="panel p-5">
            <h2 className="font-heading font-semibold">Resumo da semana</h2>
            <div className="mt-5 space-y-4">
              {[
                [CheckCircle2, "Código TSP catalogado", "text-emerald-600"],
                [FileText, "8 documentos estratégicos", "text-blue-600"],
                [Clock3, "3 ciclos de transformação", "text-amber-600"],
                [Award, "Gamificação em modelagem", "text-violet-600"],
              ].map(([Icon, text, color]) => {
                const ItemIcon = Icon as typeof CheckCircle2;
                return <div key={String(text)} className="flex items-center gap-3 text-sm font-semibold"><ItemIcon className={`size-5 ${color}`} />{String(text)}</div>;
              })}
            </div>
          </div>
          <Link href="/app/marca" className="panel panel-interactive block p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-emerald-700">Brandbook TSP</p>
                <h2 className="mt-3 font-heading text-xl font-semibold">Identidade · Movimento · Método</h2>
                <p className="muted mt-2 text-sm leading-6">Primal branding, Código TSP, comunidade, gamificação e linguagem de alta performance.</p>
              </div>
              <BookOpenText className="size-5 text-emerald-600" />
            </div>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold">Abrir sistema <ArrowUpRight className="size-4" /></span>
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <div className="panel overflow-hidden">
          <div className="border-b border-[var(--border)] p-5">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-emerald-700">Comunidade</p>
            <h2 className="mt-2 font-heading text-xl font-semibold">Membros Tríade em exemplo</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {students.map((student) => (
              <div key={student.name} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="font-bold">{student.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{student.archetype} · {student.goal}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={student.points > 650 ? "green" : student.points > 450 ? "amber" : "blue"}>{student.points} pts</Badge>
                  <span className="text-xs font-bold text-slate-500">{student.cycle}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel p-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-emerald-700">Acervo</p>
          <h2 className="mt-2 font-heading text-xl font-semibold">Documentos importados para a base</h2>
          <div className="mt-5 space-y-3">
            {documents.slice(0, 6).map((document) => (
              <div key={document.title} className="rounded-xl border border-[var(--border)] p-3">
                <p className="text-sm font-bold">{document.title}</p>
                <p className="mt-1 text-xs text-slate-500">{document.type} · {document.tags.join(", ")}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
