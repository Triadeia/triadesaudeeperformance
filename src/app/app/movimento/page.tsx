import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  FileText,
  Flag,
  Quote,
  ShieldCheck,
} from "lucide-react";
import {
  belongingRituals,
  impactPhrases,
  journeyStages,
  memberIdentity,
  movementArchetypes,
  movementBeliefs,
  movementEnemies,
  movementPurpose,
  movementSource,
  movementVocabulary,
  socialInitiatives,
  triadeOath,
} from "@/lib/movimento";

const anchors = [
  ["propósito", "Propósito"],
  ["inimigo", "Inimigo"],
  ["manifesto", "Manifesto"],
  ["crencas", "Crenças"],
  ["identidade", "Identidade"],
  ["linguagem", "Linguagem"],
  ["jornada", "Jornada"],
  ["expansao", "Expansão"],
  ["juramento", "Juramento"],
];

export default function MovimentoPage() {
  return (
    <article>
      <section className="brand-hero reveal">
        <div className="brand-hero-content">
          <span className="brand-kicker">Área exclusiva / Movimento</span>
          <h1 className="brand-title">Apareça. Sempre.</h1>
          <p className="brand-lead">{movementSource.quote}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#manifesto" className="brand-action">
              Ler manifesto <ArrowRight className="size-4" />
            </a>
            <Link href="/app/marca" className="brand-action border-white/15 bg-white/8 text-white">
              Voltar ao brandbook
            </Link>
          </div>
        </div>
      </section>

      <nav className="brand-nav mt-5" aria-label="Navegação do movimento">
        {anchors.map(([id, label]) => (
          <a key={id} href={`#${id}`}>{label}</a>
        ))}
      </nav>

      <section id="propósito" className="mt-8 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="panel p-6">
          <p className="brand-kicker">Propósito do movimento</p>
          <h2 className="font-heading text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Não somos um lugar para malhar. Somos o ponto de ruptura.</h2>
          <p className="muted mt-5 leading-7">A Triade existe para construir pessoas, não apenas físicos. A área de Movimento concentra causa, inimigo, manifesto, linguagem, ritos, jornada e expansão cultural.</p>
          <div className="mt-6 rounded-2xl bg-[var(--muted)] p-4">
            <p className="text-sm font-bold">Fonte oficial</p>
            <p className="muted mt-1 text-sm">{movementSource.title}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {movementPurpose.map((item) => (
            <article key={item.title} className="panel p-5">
              <ShieldCheck className="size-5 text-emerald-600" aria-hidden="true" />
              <h3 className="mt-5 font-heading text-lg font-semibold">{item.title}</h3>
              <p className="muted mt-2 text-sm leading-6">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="inimigo" className="mt-12">
        <div className="mb-5">
          <p className="brand-kicker">Inimigo em comum</p>
          <h2 className="font-heading text-3xl font-semibold tracking-[-0.045em]">O movimento cresce quando nomeia o que combate.</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {movementEnemies.map((enemy) => (
            <article key={enemy.group} className="panel p-5">
              <enemy.icon className="size-5 text-amber-600" aria-hidden="true" />
              <h3 className="mt-5 font-heading text-xl font-semibold">{enemy.group}</h3>
              <ul className="mt-5 space-y-3">
                {enemy.items.map((item) => (
                  <li key={item} className="flex gap-3 text-sm font-semibold">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section id="manifesto" className="movement-manifesto mt-12">
        <Quote className="mb-8 size-7 text-emerald-300" aria-hidden="true" />
        <blockquote>Nós não existimos para te dar um treino.</blockquote>
        <p className="mt-6 max-w-3xl leading-7">Qualquer lugar faz isso. O mundo está cheio de sequências de exercícios, protocolos de dieta e vídeos de motivação. O problema nunca foi falta de informação. O problema foi sempre o mesmo: você continuou sendo a mesma pessoa que sabia o que fazer e não fazia.</p>
        <p className="mt-4 max-w-3xl leading-7">Nós existimos para mudar quem você acredita que é. Porque você não vai sustentar um novo corpo com uma identidade velha.</p>
        <p className="mt-6 text-sm font-extrabold uppercase tracking-[0.14em] text-emerald-300">Seja Triade. Apareça. Sempre.</p>
      </section>

      <section id="crencas" className="mt-12">
        <div className="mb-5">
          <p className="brand-kicker">10 crenças fundamentais</p>
          <h2 className="font-heading text-3xl font-semibold tracking-[-0.045em]">A doutrina que dá consistência à cultura.</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {movementBeliefs.map((belief, index) => (
            <div key={belief} className="panel flex items-start gap-4 p-4">
              <span className="brand-index-number mt-1 text-emerald-700">{String(index + 1).padStart(2, "0")}</span>
              <p className="text-sm font-bold leading-6">{belief}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="identidade" className="mt-12 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="brand-kicker">Identidade dos membros</p>
          <h2 className="font-heading text-3xl font-semibold tracking-[-0.045em]">Membro Triade é uma identidade, não uma matrícula.</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {memberIdentity.map((item) => (
            <article key={item.title} className="panel p-5">
              <h3 className="font-heading text-lg font-semibold">{item.title}</h3>
              <p className="muted mt-3 text-sm leading-6">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-5">
          <p className="brand-kicker">Arquétipos</p>
          <h2 className="font-heading text-3xl font-semibold tracking-[-0.045em]">Força, método, jornada e construção.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {movementArchetypes.map((item) => (
            <article key={item.title} className="panel p-5">
              <item.icon className="size-5 text-emerald-600" aria-hidden="true" />
              <h3 className="mt-5 font-heading text-lg font-semibold">{item.title}</h3>
              <p className="muted mt-2 text-sm leading-6">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="linguagem" className="mt-12 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="panel p-6">
          <p className="brand-kicker">Vocabulário próprio</p>
          <h2 className="font-heading text-2xl font-semibold tracking-[-0.035em]">Palavras que transformam serviço em cultura.</h2>
          <div className="mt-6 divide-y divide-slate-100">
            {movementVocabulary.map(([term, description]) => (
              <div key={term} className="grid gap-2 py-4 sm:grid-cols-[180px_1fr]">
                <p className="font-heading font-semibold">{term}</p>
                <p className="muted text-sm leading-6">{description}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="panel p-6">
          <p className="brand-kicker">Frases de impacto</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {impactPhrases.map((phrase) => (
              <span key={phrase} className="rounded-full border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-xs font-extrabold">{phrase}</span>
            ))}
          </div>
          <div className="mt-8">
            <p className="brand-kicker">Rituais</p>
            <div className="mt-3 space-y-3">
              {belongingRituals.map((ritual) => (
                <div key={ritual.title} className="rounded-2xl border border-[var(--border)] p-4">
                  <p className="font-bold">{ritual.title}</p>
                  <p className="muted mt-1 text-sm leading-6">{ritual.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="jornada" className="mt-12">
        <div className="mb-5">
          <p className="brand-kicker">Jornada de transformação</p>
          <h2 className="font-heading text-3xl font-semibold tracking-[-0.045em]">Do adormecido ao multiplicador.</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {journeyStages.map((stage, index) => (
            <article key={stage.name} className="panel p-5">
              <span className="brand-index-number">{String(index + 1).padStart(2, "0")} / {stage.phase}</span>
              <h3 className="mt-8 font-heading text-xl font-semibold">{stage.name}</h3>
              <p className="muted mt-3 text-sm leading-6">{stage.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="expansao" className="mt-12">
        <div className="mb-5">
          <p className="brand-kicker">Movimento social</p>
          <h2 className="font-heading text-3xl font-semibold tracking-[-0.045em]">Iniciativas que ampliam pertencimento e prova.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {socialInitiatives.map((initiative) => (
            <article key={initiative.title} className="panel p-5">
              <initiative.icon className="size-5 text-emerald-600" aria-hidden="true" />
              <h3 className="mt-5 font-heading text-lg font-semibold">{initiative.title}</h3>
              <p className="muted mt-2 text-sm leading-6">{initiative.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="juramento" className="mt-12 grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="panel p-6">
          <Flag className="size-6 text-emerald-600" aria-hidden="true" />
          <p className="brand-kicker mt-6">Juramento Triade</p>
          <h2 className="font-heading text-3xl font-semibold tracking-[-0.045em]">Eu escolho. Eu me comprometo. Eu sou Triade.</h2>
          <Link href="/app/base-inteligencia" className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-emerald-700">
            Abrir base de inteligência <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="movement-manifesto">
          <BookOpenText className="mb-7 size-6 text-emerald-300" aria-hidden="true" />
          <div className="space-y-4">
            {triadeOath.map((line) => (
              <p key={line} className="max-w-3xl text-lg leading-8">{line}</p>
            ))}
          </div>
          <div className="mt-8 flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <FileText className="mt-0.5 size-5 shrink-0 text-emerald-300" />
            <p className="text-sm leading-6">Documento completo salvo no acervo do projeto para consulta, expansão e próximas versões do painel.</p>
          </div>
        </div>
      </section>
    </article>
  );
}

