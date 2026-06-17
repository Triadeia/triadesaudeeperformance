import Link from "next/link";
import { ArrowLeft, ArrowRight, ShieldAlert } from "lucide-react";
import { notFound } from "next/navigation";
import { BrandSpecimens } from "@/components/brandbook-specimens";
import { brandSections, getBrandSection } from "@/lib/brandbook";

export function generateStaticParams() {
  return brandSections.map((section) => ({ slug: section.slug }));
}

export default async function BrandSectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const section = getBrandSection(slug);
  if (!section) notFound();

  const currentIndex = brandSections.findIndex((item) => item.slug === section.slug);
  const previous = brandSections[currentIndex - 1];
  const next = brandSections[currentIndex + 1];

  return (
    <article>
      <header className="brand-hero reveal">
        <div className="brand-hero-content">
          <span className="brand-kicker">{section.group} / {section.shortTitle}</span>
          <h1 className="brand-title">{section.title}</h1>
          <p className="brand-lead">{section.description}</p>
        </div>
      </header>

      <div className="brand-content mt-8">
        <div className="brand-reading">
          {section.slug === "movimento" ? (
            <section className="movement-manifesto">
              <blockquote>ESTE NÃO É UM PROGRAMA DE TREINO.</blockquote>
              <p className="mt-6 max-w-2xl leading-7">É uma mudança de identidade. A Triade existe para romper o padrão errado, reprogramar comportamento e transformar o aluno em Membro Triade.</p>
            </section>
          ) : null}

          {section.chapters.map((chapter, index) => (
            <section key={chapter.id} id={chapter.id}>
              <span className="brand-index-number">{String(index + 1).padStart(2, "0")}</span>
              <h2 className="mt-5">{chapter.title}</h2>
              <p className="mt-5 text-base">{chapter.lead}</p>
              {chapter.points ? (
                <div className="mt-8">
                  {chapter.points.map((point, pointIndex) => (
                    <div key={point.title} className="principle-row">
                      <span>{String(pointIndex + 1).padStart(2, "0")}</span>
                      <div>
                        <h3>{point.title}</h3>
                        <p className="mt-2 text-sm">{point.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ))}

          <BrandSpecimens slug={section.slug} />

          {section.slug === "movimento" ? (
            <section id="manifesto">
              <div className="flex gap-3 rounded-2xl border border-amber-300/40 bg-amber-400/10 p-5">
                <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
                <div>
                  <h3>Guardrail editorial</h3>
                  <p className="mt-2 text-sm">A causa pode ser intensa sem humilhar o aluno. Saúde, corpo, imagem e transformação exigem prova, consentimento e responsabilidade.</p>
                </div>
              </div>
              <div className="movement-manifesto mt-8">
                <blockquote>A gente não treina aqui. A gente reprograma.</blockquote>
                <p className="mt-6 leading-7">O aluno não entra para cumprir uma planilha. Ele entra para abandonar uma identidade que não serve mais e construir um novo padrão físico, mental e social.</p>
                <p className="mt-4 leading-7">Identidade dá direção. Movimento dá pertencimento. Método transforma intenção em execução repetida.</p>
                <p className="mt-4 font-bold text-emerald-300">Execute. Assuma controle. Torne-se o resultado.</p>
              </div>
            </section>
          ) : null}
        </div>

        <aside className="brand-aside panel p-5" aria-label="Nesta página">
          <p className="brand-index-number mb-3">Nesta página</p>
          {section.chapters.map((chapter) => <a key={chapter.id} href={`#${chapter.id}`}>{chapter.title}</a>)}
          {["cores", "tipografia", "layout", "componentes", "tabelas"].includes(section.slug) ? <a href="#especimes">Espécimes</a> : null}
          {section.slug === "movimento" ? <a href="#manifesto">Manifesto</a> : null}
        </aside>
      </div>

      <footer className="mt-8 grid gap-3 border-t border-[var(--border)] pt-6 sm:grid-cols-2">
        {previous ? <Link href={`/app/marca/${previous.slug}`} className="panel panel-interactive flex min-h-20 items-center gap-3 p-4"><ArrowLeft className="size-4" /><div><span className="muted text-xs">Anterior</span><p className="font-bold">{previous.shortTitle}</p></div></Link> : <span />}
        {next ? <Link href={`/app/marca/${next.slug}`} className="panel panel-interactive flex min-h-20 items-center justify-end gap-3 p-4 text-right"><div><span className="muted text-xs">Próximo</span><p className="font-bold">{next.shortTitle}</p></div><ArrowRight className="size-4" /></Link> : null}
      </footer>
    </article>
  );
}
