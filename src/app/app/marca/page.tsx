import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowRight,
  CheckCircle2,
  Copy,
  FileText,
  Megaphone,
  Palette,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";

const logoAssets = [
  {
    name: "Logo principal branco",
    usage: "Fundos escuros, vídeos, stories e peças de impacto.",
    preview: "/brand/triade-branco-transparente.png",
    png: "/brand/triade-branco-transparente.png",
    svg: "/brand/triade-branco.svg",
    tone: "dark",
  },
  {
    name: "Logo principal preto",
    usage: "Fundos claros, documentos, propostas e materiais impressos.",
    preview: "/brand/triade-preto-transparente.png",
    png: "/brand/triade-preto-transparente.png",
    svg: "/brand/triade-preto.svg",
    tone: "light",
  },
  {
    name: "Selo Triade",
    usage: "Ritos, comunidade, gamificação, checkpoints e marca de membro.",
    preview: "/brand/selo-triade-branco-transparente.png",
    png: "/brand/selo-triade-branco-transparente.png",
    svg: "/brand/selo-triade-branco.svg",
    tone: "light",
  },
  {
    name: "TSP branco",
    usage: "Avatar, favicon social, espaços compactos e aplicações premium.",
    preview: "/brand/tsp-branco-transparente.png",
    png: "/brand/tsp-branco-transparente.png",
    svg: "/brand/tsp-branco.svg",
    tone: "dark",
  },
  {
    name: "TSP preto",
    usage: "Aplicações compactas sobre fundo claro.",
    preview: "/brand/tsp-preto-transparente.png",
    png: "/brand/tsp-preto-transparente.png",
    svg: "/brand/tsp-preto.svg",
    tone: "light",
  },
];

const palette = [
  { name: "Amarelo Foco", hex: "#FFCD41", role: "Energia, vitalidade, impulso inicial e foco." },
  { name: "Azul Confiança", hex: "#285AAA", role: "Técnica, orientação, método e concentração." },
  { name: "Laranja Motivação", hex: "#F05F23", role: "Calor humano, movimento e transformação prática." },
  { name: "Preto Estrutura", hex: "#231E1E", role: "Autoridade, contraste e presença premium." },
  { name: "Cinza Tagline", hex: "#6B7280", role: "Sobriedade, leitura e equilíbrio operacional." },
  { name: "Branco Respiro", hex: "#FFFFFF", role: "Clareza, espaço e aplicação institucional." },
];

const pillars = [
  ["Essência", "Acolher. Orientar. Transformar."],
  ["Personalidade", "Humana sem ser frágil. Técnica sem ser fria. Enérgica sem ser agressiva."],
  ["Promessa", "Professor presente, método aplicado e resultado sustentável."],
  ["Movimento", "Você não busca resultado. Você se torna o resultado."],
];

const voiceRules = [
  "Frases claras, assertivas e sem exagero.",
  "Verbos de movimento: aparecer, progredir, alinhar, sustentar, transformar.",
  "Presença acolhedora e técnica ao mesmo tempo.",
  "Confrontar o padrão errado sem humilhar a pessoa.",
];

const doRules = [
  "Manter a área de proteção de um módulo quadrado ao redor da marca.",
  "Usar a versão branca em fundos escuros e a versão preta em fundos claros.",
  "Garantir que a tagline SAÚDE E PERFORMANCE continue legível.",
  "Aplicar amarelo, azul e laranja como sistema de significado, não decoração aleatória.",
];

const dontRules = [
  "Não distorcer, condensar, girar ou reconstruir o logotipo.",
  "Não trocar a ordem dos três módulos cromáticos.",
  "Não aplicar a marca sobre fundos sem contraste suficiente.",
  "Não prometer cura, resultado universal ou substituição de acompanhamento médico.",
];

const movementCards = [
  ["Identidade", "Membro Triade é alguém que assume controle da própria biologia, rotina e comportamento."],
  ["Código TSP", "Identidade, movimento e método: ser, pertencer e executar."],
  ["Rito", "Apareça. Sempre. Cada presença é um voto na versão que está sendo construída."],
  ["Prova", "Checkpoint, evolução documentada e autorização antes de qualquer história pública."],
];

export default function BrandbookHome() {
  return (
    <article className="brand-guidelines">
      <section className="brand-mark-hero reveal">
        <div className="brand-mark-hero-copy">
          <span className="brand-kicker">Guidelines oficiais / Triade Saúde e Performance</span>
          <h1>Marca, movimento e logomarcas em uma única página.</h1>
          <p>
            Sistema vivo para usar a identidade da Triade com consistência: essência, paleta,
            voz, símbolo, regras de aplicação e arquivos prontos para download.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#logomarcas" className="brand-action">
              Baixar logomarcas <ArrowRight className="size-4" />
            </a>
            <Link href="/app/movimento" className="brand-action border-white/15 bg-white/8 text-white">
              Abrir movimento
            </Link>
          </div>
        </div>
        <div className="brand-mark-showcase" aria-label="Logo Triade">
          <img src="/brand/triade-branco-transparente.png" alt="Triade Saúde e Performance" />
          <div className="brand-stack-colors" aria-hidden="true">
            <span style={{ backgroundColor: "#FFCD41" }} />
            <span style={{ backgroundColor: "#285AAA" }} />
            <span style={{ backgroundColor: "#F05F23" }} />
          </div>
        </div>
      </section>

      <nav className="brand-nav mt-5" aria-label="Navegação das guidelines">
        {[
          ["#essencia", "Essência"],
          ["#logomarcas", "Logomarcas"],
          ["#paleta", "Paleta"],
          ["#voz", "Voz"],
          ["#movimento", "Movimento"],
          ["#uso", "Uso correto"],
        ].map(([href, label]) => (
          <a key={href} href={href}>{label}</a>
        ))}
      </nav>

      <section id="essencia" className="mt-8 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="panel p-6">
          <p className="brand-kicker">Introdução à marca</p>
          <h2 className="font-heading text-3xl font-semibold sm:text-4xl">Corpo, mente e prática como um único sistema funcional.</h2>
          <p className="muted mt-5 leading-7">
            A Triade não nasce como studio de treinamento tradicional. A marca existe para
            estruturar percursos reais de saúde e performance com método, clareza e presença.
            Seus três módulos verticais representam pilares interdependentes, contínuos e em
            adaptação.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {pillars.map(([title, text]) => (
            <article key={title} className="panel p-5">
              <ShieldCheck className="size-5 text-[var(--triade-blue)]" aria-hidden="true" />
              <h3 className="mt-5 font-heading text-lg font-semibold">{title}</h3>
              <p className="muted mt-2 text-sm leading-6">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="logomarcas" className="mt-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="brand-kicker">Área de logomarca</p>
            <h2 className="font-heading text-3xl font-semibold sm:text-4xl">Arquivos transparentes em PNG e SVG.</h2>
          </div>
          <a className="brand-action brand-action-secondary" href="/brand/foco-confianca-motivacao.png" download>
            Paleta original <ArrowDownToLine className="size-4" />
          </a>
        </div>
        <div className="logo-asset-grid">
          {logoAssets.map((asset) => (
            <article key={asset.name} className="panel logo-asset-card">
              <div className={`logo-preview logo-preview-${asset.tone}`}>
                <img src={asset.preview} alt={asset.name} />
              </div>
              <div className="p-5">
                <h3 className="font-heading text-lg font-semibold">{asset.name}</h3>
                <p className="muted mt-2 text-sm leading-6">{asset.usage}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <a className="asset-download" href={asset.png} download>
                    PNG <ArrowDownToLine className="size-4" />
                  </a>
                  <a className="asset-download" href={asset.svg} download>
                    SVG <ArrowDownToLine className="size-4" />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="paleta" className="mt-12">
        <div className="mb-5">
          <p className="brand-kicker">Paleta cromática</p>
          <h2 className="font-heading text-3xl font-semibold">Foco, confiança e motivação.</h2>
        </div>
        <div className="palette-grid">
          {palette.map((color) => (
            <article key={color.hex} className="panel palette-card">
              <div className="palette-swatch" style={{ backgroundColor: color.hex }} />
              <div>
                <h3 className="font-heading font-semibold">{color.name}</h3>
                <p className="mt-1 font-mono text-xs font-bold">{color.hex}</p>
                <p className="muted mt-3 text-sm leading-6">{color.role}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="voz" className="mt-12 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="panel p-6">
          <Copy className="size-6 text-[var(--triade-orange)]" aria-hidden="true" />
          <p className="brand-kicker mt-6">Identidade verbal</p>
          <h2 className="font-heading text-3xl font-semibold">Direto, calmo, sólido.</h2>
          <p className="muted mt-4 leading-7">
            A voz da Triade é simples, firme e intencional. Ela não grita, não exagera e não
            infantiliza. Ela orienta, confronta o padrão errado e convida para uma decisão.
          </p>
        </div>
        <div className="grid gap-3">
          {voiceRules.map((rule) => (
            <div key={rule} className="panel flex items-start gap-3 p-4">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[var(--triade-blue)]" />
              <p className="text-sm font-bold leading-6">{rule}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="movimento" className="movement-manifesto mt-12">
        <Megaphone className="mb-8 size-7 text-[var(--triade-yellow)]" aria-hidden="true" />
        <blockquote>Você não busca resultado. Você se torna o resultado.</blockquote>
        <p className="mt-6 max-w-3xl leading-7">
          A Triade não vende acesso a treino. Ela instala uma identidade: Membro Triade,
          alguém que aparece mesmo sem vontade, segue método e transforma comportamento em
          resultado sustentável.
        </p>
        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {movementCards.map(([title, text]) => (
            <div key={title} className="movement-mini-card">
              <Sparkles className="size-4 text-[var(--triade-yellow)]" aria-hidden="true" />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
        <Link href="/app/movimento" className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-[var(--triade-yellow)]">
          Publicação completa do movimento <ArrowRight className="size-4" />
        </Link>
      </section>

      <section id="uso" className="mt-12 grid gap-5 lg:grid-cols-2">
        <div className="panel p-6">
          <Palette className="size-6 text-[var(--triade-blue)]" aria-hidden="true" />
          <h2 className="mt-6 font-heading text-2xl font-semibold">Faça</h2>
          <div className="mt-5 space-y-3">
            {doRules.map((rule) => (
              <div key={rule} className="flex gap-3 text-sm font-semibold leading-6">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[var(--triade-blue)]" />
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel p-6">
          <FileText className="size-6 text-[var(--triade-orange)]" aria-hidden="true" />
          <h2 className="mt-6 font-heading text-2xl font-semibold">Evite</h2>
          <div className="mt-5 space-y-3">
            {dontRules.map((rule) => (
              <div key={rule} className="flex gap-3 text-sm font-semibold leading-6">
                <XCircle className="mt-0.5 size-5 shrink-0 text-[var(--triade-orange)]" />
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </article>
  );
}
