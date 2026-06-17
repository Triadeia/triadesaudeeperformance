import type { LucideIcon } from "lucide-react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-5 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-emerald-700">{eyebrow}</p>
        <h1 className="font-heading text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">{title}</h1>
        <p className="muted mt-2 max-w-2xl text-sm leading-6">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function MetricCard({ label, value, note, icon: Icon, tone = "green" }: { label: string; value: string | number; note: string; icon: LucideIcon; tone?: "green" | "amber" | "red" | "blue" }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700",
  };
  return (
    <div className="reveal p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="muted text-xs font-bold uppercase tracking-[0.08em]">{label}</p>
          <p className="mt-2 font-heading text-3xl font-semibold">{value}</p>
        </div>
        <div className={`grid size-10 place-items-center rounded-xl ${tones[tone]}`}><Icon className="size-5" /></div>
      </div>
      <p className="muted mt-4 text-xs font-medium">{note}</p>
    </div>
  );
}

export function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "green" | "amber" | "red" | "blue" | "slate" }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700",
    slate: "bg-slate-100 text-slate-600",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${tones[tone]}`}>{children}</span>;
}
