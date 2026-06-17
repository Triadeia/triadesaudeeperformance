import { AlertTriangle, CheckCircle2, Clock3, XCircle } from "lucide-react";
import type { BrandSection } from "@/lib/brandbook";

export function BrandSpecimens({ slug }: { slug: BrandSection["slug"] }) {
  if (slug === "cores") return <ColorSpecimens />;
  if (slug === "tipografia") return <TypeSpecimens />;
  if (slug === "layout") return <LayoutSpecimens />;
  if (slug === "componentes") return <ComponentSpecimens />;
  if (slug === "tabelas") return <TableSpecimen />;
  return null;
}

function ColorSpecimens() {
  const colors = [
    ["Verde de evolução", "var(--primary)", "Checkpoint concluído, missão validada e progresso"],
    ["Navy premium", "var(--navy)", "Navegação, autoridade e foco operacional"],
    ["Âmbar de energia", "var(--amber)", "Prioridade, desafio e chamada para ação"],
    ["Vermelho de risco", "var(--destructive)", "Recaída, dor, ausência crítica ou alerta de saúde"],
  ];
  return (
    <section id="especimes">
      <h2>Tokens vivos</h2>
      <p className="mt-3">Os espécimes usam as variáveis do tema ativo. Alterne o tema no topo e observe a adaptação sem perder semântica.</p>
      <div className="specimen-grid mt-7">
        {colors.map(([name, color, use]) => (
          <article key={name} className="specimen">
            <div className="token-swatch" style={{ background: color }} />
            <h3 className="mt-4">{name}</h3>
            <p className="mt-2 text-sm">{use}</p>
            <code className="muted mt-4 block text-xs">{color}</code>
          </article>
        ))}
      </div>
    </section>
  );
}

function TypeSpecimens() {
  return (
    <section id="especimes">
      <h2>Espécimes tipográficos</h2>
      <div className="mt-7 space-y-4">
        <article className="specimen">
          <span className="brand-index-number">Sora 650 / Display</span>
          <p className="mt-5 font-heading text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">Você se torna o resultado.</p>
        </article>
        <article className="specimen">
          <span className="brand-index-number">Plus Jakarta Sans / Interface</span>
          <p className="mt-5 max-w-2xl text-lg leading-8">Informação de aluno precisa ser lida rápido por professor, gestor e vendedor, sem expor dados sensíveis.</p>
        </article>
        <article className="specimen">
          <span className="brand-index-number">Mono / Identificadores</span>
          <p className="mt-5 font-mono text-lg">TSP-CICLO-02-CHECKPOINT-2026</p>
        </article>
      </div>
    </section>
  );
}

function LayoutSpecimens() {
  return (
    <section id="especimes">
      <h2>Escala e composição</h2>
      <div className="specimen mt-7 space-y-4">
        {[4, 8, 12, 16, 24, 32, 48, 64].map((size) => (
          <div key={size} className="grid grid-cols-[48px_1fr_50px] items-center gap-4">
            <code className="text-xs">{size / 4}</code>
            <span className="h-3 rounded-full bg-[var(--primary)]" style={{ width: `${Math.min(size * 5, 100)}%` }} />
            <span className="muted text-xs">{size}px</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ComponentSpecimens() {
  const states = [
    [CheckCircle2, "Missão concluída", "Treino, rotina ou checkpoint validado.", "text-emerald-600"],
    [AlertTriangle, "Precisa de ajuste", "Aluno exige revisão de rota ou reforço de acompanhamento.", "text-amber-600"],
    [Clock3, "Em ciclo", "Processo de transformação ainda em andamento.", "text-blue-600"],
    [XCircle, "Risco de recaída", "Acionar professor, ajustar plano e retomar vínculo.", "text-red-600"],
  ] as const;
  return (
    <section id="especimes">
      <h2>Estados operacionais</h2>
      <div className="specimen-grid mt-7">
        {states.map(([Icon, title, text, color]) => (
          <article key={title} className="specimen">
            <Icon className={`size-6 ${color}`} aria-hidden="true" />
            <h3 className="mt-5">{title}</h3>
            <p className="mt-2 text-sm">{text}</p>
          </article>
        ))}
      </div>
      <div className="specimen mt-4 flex flex-wrap gap-3">
        <button className="brand-action">Registrar checkpoint</button>
        <button className="brand-action brand-action-secondary">Ver evolução</button>
        <button className="theme-option">Cancelar</button>
      </div>
    </section>
  );
}

function TableSpecimen() {
  return (
    <section id="especimes">
      <h2>Tabela operacional</h2>
      <div className="panel mt-7 overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <thead className="surface-soft">
            <tr>
              {["Membro", "Ciclo", "Professor", "Estado", "Próxima ação"].map((item) => <th key={item} className="p-4 text-xs font-extrabold uppercase tracking-wider">{item}</th>)}
            </tr>
          </thead>
          <tbody>
            {[
              ["Ricardo Amaral", "Fundação", "Professor TSP", "Precisa de ajuste", "Agendar checkpoint"],
              ["Antônio Braga", "Performance", "Will", "Consistente", "Novo desafio"],
              ["Carla Souza", "Alta Performance", "Professor TSP", "Pronta", "Prova semanal"],
            ].map((row) => <tr key={row[0]} className="border-t border-[var(--border)]">{row.map((cell) => <td key={cell} className="p-4">{cell}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}
