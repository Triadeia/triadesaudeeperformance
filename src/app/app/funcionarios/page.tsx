import { UserPlus } from "lucide-react";
import { Badge, PageHeader } from "@/components/page-parts";
import { getEmployees } from "@/lib/repositories";

export default async function EmployeesPage() {
  const employees = await getEmployees();
  return <div><PageHeader eyebrow="Acessos e responsabilidades" title="Funcionários" description="Gerencie perfis, áreas e permissões da organização." action={<button className="flex h-11 items-center gap-2 rounded-xl bg-[var(--navy)] px-4 text-sm font-bold text-white"><UserPlus className="size-4" />Novo funcionário</button>} /><div className="panel overflow-hidden">{employees.map((employee) => <div key={employee.id} className="grid gap-3 border-b border-slate-100 p-5 last:border-0 sm:grid-cols-[1fr_0.6fr_0.5fr_auto] sm:items-center"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-full bg-emerald-100 font-heading font-bold text-emerald-800">{employee.name[0]}</div><div><p className="font-bold">{employee.name}</p><p className="text-xs text-slate-500">{employee.email}</p></div></div><span className="text-sm font-semibold">{employee.area}</span><Badge tone="blue">{employee.role}</Badge><Badge tone={employee.active ? "green" : "red"}>{employee.active ? "Ativo" : "Inativo"}</Badge></div>)}</div></div>;
}
