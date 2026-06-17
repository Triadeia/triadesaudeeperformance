import Link from "next/link";
import { ArrowRight, BookOpenText, Component, Megaphone, ShieldCheck } from "lucide-react";
import { brandSections } from "@/lib/brandbook";

export default function BrandbookHome() {
  return (
    <div>
      <section className="brand-hero reveal">
        <div className="brand-hero-content">
          <span className="brand-kicker">Triade Saúde e Performance</span>
          <h1 className="brand-title">Identidade, movimento e método para quem decidiu se tornar o resultado.</h1>
          <p className="brand-lead">Brandbook vivo para o Código TSP: narrativa, produto, comunidade, gamificação, oferta, documentos e operação.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/app/marca/diretorio" className="brand-action">Explorar diretório <ArrowRight className="size-4" /></Link>
            <Link href="/app/marca/movimento" className="brand-action border-white/15 bg-white/8 text-white">Abrir movimento</Link>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          [ShieldCheck, "Saúde com responsabilidade", "Copy forte, prova real e cuidado com promessas."],
          [Component, "Produto e método juntos", "Dashboard, brandbook e comunidade usando a mesma arquitetura TSP."],
          [BookOpenText, "Acervo utilizável", "Documentos, ICPs, ofertas, ritos e rotinas fáceis de encontrar."],
        ].map(([Icon, title, text]) => {
          const ItemIcon = Icon as typeof ShieldCheck;
          return (
            <article key={String(title)} className="panel p-5">
              <ItemIcon className="size-5 text-emerald-600" aria-hidden="true" />
              <h2 className="mt-5 font-heading text-lg font-semibold">{String(title)}</h2>
              <p className="muted mt-2 text-sm leading-6">{String(text)}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="brand-kicker">Sistema completo</p>
            <h2 className="font-heading text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Do manifesto ao checkpoint do aluno.</h2>
          </div>
          <Link href="/app/marca/diretorio" className="muted hidden text-sm font-bold sm:flex">Ver todos os itens</Link>
        </div>
        <div className="brand-section-grid">
          {brandSections.map((section, index) => (
            <Link key={section.slug} href={`/app/marca/${section.slug}`} className="brand-index-card panel panel-interactive">
              <div className="flex items-start justify-between">
                <span className="brand-index-number">{String(index + 1).padStart(2, "0")} / {section.group}</span>
                <section.icon className="muted size-5" aria-hidden="true" />
              </div>
              <h2>{section.shortTitle}</h2>
              <p>{section.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="movement-manifesto mt-12">
        <Megaphone className="mb-8 size-7 text-emerald-300" aria-hidden="true" />
        <blockquote>Você não busca resultado. Você se torna o resultado.</blockquote>
        <p className="mt-6 max-w-2xl leading-7">A Triade não vende acesso a treino. Ela instala uma identidade: Membro Triade, alguém que executa, assume controle e transforma comportamento em resultado sustentável.</p>
        <Link href="/app/marca/movimento" className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-emerald-300">Conhecer o movimento <ArrowRight className="size-4" /></Link>
      </section>
    </div>
  );
}
