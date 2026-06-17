import { CalendarDays, CheckCircle2, Cloud, ExternalLink, ListChecks } from "lucide-react";
import { Badge, PageHeader } from "@/components/page-parts";

const integrations = [
  { name: "Google Workspace", description: "Drive, Docs e Calendar em modo somente leitura.", icon: Cloud, status: "Preparada", action: "Conectar Google" },
  { name: "ClickUp", description: "Envio de tarefas, mapeamento de listas e logs de sincronização.", icon: ListChecks, status: "Mock seguro", action: "Conectar ClickUp" },
  { name: "Google Calendar", description: "Eventos, participantes e anexos relacionados a reuniões.", icon: CalendarDays, status: "Preparada", action: "Configurar" },
];

export default function IntegrationsPage() {
  return <div><PageHeader eyebrow="Ecossistema" title="Integrações" description="Conexões isoladas por adapters, com escopos mínimos e sem tokens no código." /><div className="grid gap-5 lg:grid-cols-3">{integrations.map((integration) => <article key={integration.name} className="panel p-6"><div className="flex items-center justify-between"><div className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><integration.icon /></div><Badge tone="green">{integration.status}</Badge></div><h2 className="mt-6 font-heading text-xl font-semibold">{integration.name}</h2><p className="mt-3 min-h-16 text-sm leading-6 text-slate-500">{integration.description}</p><button className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] text-sm font-bold hover:bg-slate-50">{integration.action}<ExternalLink className="size-4" /></button></article>)}</div><div className="mt-6 flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800"><CheckCircle2 className="mt-0.5 size-5 shrink-0" /><p>OAuth real exige Client ID, Client Secret, callback HTTPS e consentimento do administrador. O painel não solicita nem armazena senha Google.</p></div></div>;
}
