import {
  Award,
  BookOpenText,
  Component,
  Dumbbell,
  Flame,
  LayoutGrid,
  Megaphone,
  MessageSquareText,
  Palette,
  ShieldCheck,
  TableProperties,
  Type,
  Users,
} from "lucide-react";

export type BrandSection = {
  slug: string;
  group: "Marca" | "Fundamentos" | "Produto";
  title: string;
  shortTitle: string;
  description: string;
  icon: typeof Palette;
  chapters: Array<{
    id: string;
    title: string;
    lead: string;
    points?: Array<{ title: string; text: string }>;
  }>;
};

export const brandSections: BrandSection[] = [
  {
    slug: "estrategia",
    group: "Marca",
    title: "Não é treino. É reprogramação.",
    shortTitle: "Estratégia",
    description: "Posicionamento, big idea, promessa, inimigo comum e diferenciação da Triade Saúde e Performance.",
    icon: ShieldCheck,
    chapters: [
      {
        id: "big-idea",
        title: "Big idea do movimento",
        lead: "A Triade existe para transformar pessoas que cansaram de recomeçar. O centro da marca é a Reprogramação Metabólica e a Reversão da Identidade Corporal.",
        points: [
          { title: "Promessa central", text: "Transformar corpo, energia e mentalidade com acompanhamento, método e comunidade, sem depender de motivação forçada." },
          { title: "Inimigo comum", text: "O sistema que mantém pessoas fracas, ocupadas, sedentárias, dependentes de soluções rápidas e presas ao padrão errado." },
          { title: "Virada", text: "O aluno deixa de ser cliente de treino e passa a ser Membro Triade: alguém que assume controle da própria biologia, rotina e comportamento." },
        ],
      },
      {
        id: "diferenca",
        title: "Não somos academia convencional",
        lead: "Academia vende acesso. A Triade vende transformação dirigida. O treino é ferramenta, não produto final.",
        points: [
          { title: "Ambiente boutique", text: "Menos lotação, mais presença, técnica, segurança, vínculo e leitura individual." },
          { title: "Professor presente", text: "Acompanhamento próximo para reduzir abandono, corrigir padrão e ajustar rota." },
          { title: "Progresso sustentável", text: "A evolução acontece em ciclos, com checkpoints e reforço de identidade." },
        ],
      },
    ],
  },
  {
    slug: "codigo-tsp",
    group: "Marca",
    title: "Identidade · Movimento · Método.",
    shortTitle: "Código TSP",
    description: "A arquitetura proprietária do Código TSP: ser, pertencer e executar.",
    icon: Flame,
    chapters: [
      {
        id: "pilares",
        title: "Os três pilares da transformação",
        lead: "Nenhum pilar substitui o outro. Sem identidade, o método vira rotina descartável. Sem movimento, falta pertencimento. Sem método, consciência não vira resultado.",
        points: [
          { title: "Identidade", text: "Membro Triade. Define quem a pessoa se torna antes de dizer o que ela faz." },
          { title: "Movimento", text: "Falha do Sistema. Nomeia o inimigo e cria pertencimento coletivo contra padrões sabotadores." },
          { title: "Método", text: "Código TSP. Traduz consciência em ação sistemática: treino, sistema e padrão." },
        ],
      },
      {
        id: "verdades",
        title: "Três verdades que mudam tudo",
        lead: "Essas frases sustentam a comunicação, o onboarding e o ritual de entrada do aluno.",
        points: [
          { title: "Você não está sem disciplina", text: "Você está no padrão errado. O painel precisa mostrar padrão, não só esforço." },
          { title: "Você não precisa de mais motivação", text: "Você precisa de uma nova identidade, repetida em ambiente, rito e acompanhamento." },
          { title: "A gente não treina aqui", text: "A gente reprograma. O treino é o meio concreto de instalar nova identidade." },
        ],
      },
    ],
  },
  {
    slug: "voz",
    group: "Marca",
    title: "Firme, humana e impossível de confundir.",
    shortTitle: "Voz & Copy",
    description: "Tom de comunicação para posts, vendas, WhatsApp, painel, professores e comunidade.",
    icon: MessageSquareText,
    chapters: [
      {
        id: "atributos",
        title: "A voz da Triade",
        lead: "A voz não humilha. Ela confronta o padrão errado, devolve responsabilidade e oferece um caminho acompanhado.",
        points: [
          { title: "Direta", text: "Frases simples, promessa clara e sem enrolação: qual padrão precisa mudar e qual ação vem agora." },
          { title: "Humana", text: "Reconhece vergonha, dor, idade, recaída e medo sem expor ou ridicularizar." },
          { title: "De alta performance", text: "Não vende sofrimento; vende direção, capacidade, autonomia e orgulho." },
        ],
      },
      {
        id: "frases",
        title: "Frases proprietárias",
        lead: "Repetição cria reconhecimento. As frases abaixo devem aparecer em páginas, vídeos, onboarding e comunidade.",
        points: [
          { title: "Você não busca resultado. Você se torna o resultado.", text: "Frase-mãe do Código TSP." },
          { title: "Não é sobre começar. É sobre nunca mais precisar recomeçar.", text: "Resposta à dor da recaída e do efeito sanfona." },
          { title: "Seu corpo ainda pode mais. Só precisa de direção.", text: "Convite para longevidade, performance e recomeço guiado." },
          { title: "Professor presente. Método aplicado. Resultado sustentável.", text: "Pitch curto de diferenciação." },
        ],
      },
      {
        id: "limites",
        title: "Guardrails de promessa",
        lead: "A copy pode ser forte, mas precisa ser responsável. Evitar humilhação, promessa médica absoluta e linguagem que trave tráfego pago sem necessidade.",
      },
    ],
  },
  {
    slug: "cores",
    group: "Fundamentos",
    title: "Performance com presença premium.",
    shortTitle: "Cores & Temas",
    description: "Paleta com preto, branco, verde de performance e tons de energia controlada.",
    icon: Palette,
    chapters: [
      {
        id: "sistema",
        title: "Cor tem função",
        lead: "Preto e navy estruturam autoridade. Branco dá respiro. Verde marca progresso, saúde e checkpoint concluído. Âmbar sinaliza energia, prioridade e chamada.",
      },
      {
        id: "uso",
        title: "Aplicação no painel",
        lead: "O painel deve parecer premium, clínico e operacional: poucos efeitos, alta legibilidade, dados claros, cards densos e navegação estável.",
      },
    ],
  },
  {
    slug: "tipografia",
    group: "Fundamentos",
    title: "Clareza antes de estética fitness.",
    shortTitle: "Tipografia",
    description: "Hierarquia textual para método, dashboard, documentos e conteúdo de movimento.",
    icon: Type,
    chapters: [
      {
        id: "hierarquia",
        title: "Títulos carregam identidade",
        lead: "Títulos devem nomear transformação: reprogramação, identidade, autonomia, performance e pertencimento. Texto operacional deve ser compacto.",
      },
      {
        id: "leitura",
        title: "Leitura de professor e aluno",
        lead: "O painel precisa funcionar para gestor, professor, vendedor e aluno. Evitar jargão excessivo quando a próxima ação precisa ser óbvia.",
      },
    ],
  },
  {
    slug: "layout",
    group: "Fundamentos",
    title: "Um studio digital, não uma landing genérica.",
    shortTitle: "Layout & Espaço",
    description: "Sistema visual para painel empresarial, brandbook, alunos, documentos e rotinas.",
    icon: LayoutGrid,
    chapters: [
      {
        id: "estrutura",
        title: "Operação primeiro",
        lead: "A primeira tela precisa mostrar alunos, ciclos, tarefas, documentos, progresso e alertas. Não usar hero promocional dentro do app.",
      },
      {
        id: "ritmo",
        title: "Ritmo de leitura",
        lead: "Cards curtos para decisão, páginas amplas para doutrina, listas densas para acervo e tabelas para acompanhamento.",
      },
    ],
  },
  {
    slug: "componentes",
    group: "Produto",
    title: "Componentes para acompanhar transformação.",
    shortTitle: "Componentes",
    description: "Cards, missões, checkpoints, rankings, documentos e estados de aluno.",
    icon: Component,
    chapters: [
      {
        id: "contrato",
        title: "Cada componente precisa de estado",
        lead: "Aluno ativo, precisa de checkpoint, em risco de recaída, ciclo concluído, missão pendente e prova autorizada precisam ser estados visuais claros.",
      },
      {
        id: "dados",
        title: "Dado serve à próxima ação",
        lead: "Peso, presença, corrida, dor, sono, alimentação e treino só entram quando ajudam professor, aluno ou gestor a decidir o próximo ajuste.",
      },
    ],
  },
  {
    slug: "gamificacao",
    group: "Produto",
    title: "Pertencimento que reduz recaída.",
    shortTitle: "Gamificação",
    description: "Missões, pontos, ritos, ranking e desafios internos para Membros Triade.",
    icon: Award,
    chapters: [
      {
        id: "principio",
        title: "Ponto não é vaidade",
        lead: "A pontuação reforça consistência, não comparação tóxica. Processo vale tanto quanto performance.",
        points: [
          { title: "Presença", text: "Check-in de treino, corrida, mobilidade e avaliação." },
          { title: "Processo", text: "Sono, alimentação, execução do protocolo e resposta ao professor." },
          { title: "Prova", text: "Checkpoint, medida, depoimento autorizado e marco de evolução." },
        ],
      },
      {
        id: "ritos",
        title: "Ritos de comunidade",
        lead: "Entrada como Membro Triade, desafio semanal, checkpoint mensal, mural de evolução e reconhecimento público autorizado.",
      },
    ],
  },
  {
    slug: "alunos",
    group: "Produto",
    title: "Três jornadas, um mesmo método.",
    shortTitle: "Alunos & ICP",
    description: "Ricardo, Antônio e Carla como arquétipos reais de desejo, dor e transformação.",
    icon: Users,
    chapters: [
      {
        id: "ricardo",
        title: "Ricardo Amaral: recomeço e orgulho",
        lead: "Homem 47-55, cansado, acima do peso, com medo de adoecer e vergonha silenciosa. Quer energia, admiração e direção sem academia fria.",
      },
      {
        id: "antonio",
        title: "Antônio Braga: longevidade ativa",
        lead: "Homem 62, disciplinado, bom pagador, busca autonomia, corrida, performance e respeito aos limites sem ser tratado como frágil.",
      },
      {
        id: "carla",
        title: "Carla Souza: atleta empresária",
        lead: "Mulher 42, forte, competitiva, quer performar mais, subir pódios e ser levada a sério como atleta.",
      },
    ],
  },
  {
    slug: "movimento",
    group: "Marca",
    title: "Membro Triade é uma identidade.",
    shortTitle: "Movimento",
    description: "Manifesto, crenças, símbolos, ritos e comunidade da Triade Saúde e Performance.",
    icon: Megaphone,
    chapters: [
      {
        id: "manifesto",
        title: "Manifesto fundador",
        lead: "A maioria das pessoas não falhou porque é preguiçosa. Falhou porque foi inserida em um sistema projetado para mantê-la fraca, ocupada e dependente.",
      },
      {
        id: "pertencimento",
        title: "Pertencimento ao grupo",
        lead: "Entrar na Triade é atravessar uma fronteira: de cliente que paga treino para Membro que assume controle.",
        points: [
          { title: "Símbolo", text: "Selo Triade como marca de entrada e compromisso." },
          { title: "Rito", text: "Diagnóstico de identidade atual vs. identidade desejada." },
          { title: "Prova", text: "Checkpoint mensal com evolução documentada e consentimento para histórias públicas." },
        ],
      },
      {
        id: "arco",
        title: "Arco narrativo",
        lead: "Conhecer a falha do sistema, assumir nova identidade, executar o Código TSP, provar evolução e puxar outros para o movimento.",
      },
    ],
  },
  {
    slug: "guidelines",
    group: "Marca",
    title: "Força sem irresponsabilidade.",
    shortTitle: "Guidelines",
    description: "Critérios para copy, conteúdo, prova, comunidade, saúde e privacidade.",
    icon: BookOpenText,
    chapters: [
      {
        id: "saude",
        title: "Saúde exige responsabilidade",
        lead: "Nunca prometer cura, resultado universal ou substituição de acompanhamento médico. A Triade fala de método, comportamento, exercício, acompanhamento e evolução sustentável.",
      },
      {
        id: "prova",
        title: "Prova antes de depoimento",
        lead: "Transformações públicas precisam de autorização, contexto, data e cuidado com imagem corporal. A pessoa vem antes da peça.",
      },
      {
        id: "trafego",
        title: "Copy forte com filtro",
        lead: "Termos como vergonha, fracasso e corpo de ex-gordo podem aparecer em materiais internos ou criativos específicos, mas devem ser calibrados para mídia paga e dignidade do aluno.",
      },
    ],
  },
  {
    slug: "tabelas",
    group: "Produto",
    title: "Dados que acompanham ciclos.",
    shortTitle: "Tabelas & Dados",
    description: "Modelos de leitura para alunos, presença, evolução, vendas, documentos e prova.",
    icon: TableProperties,
    chapters: [
      {
        id: "estrutura",
        title: "Compare sem perder contexto",
        lead: "Cada linha deve responder: quem é o aluno, em qual ciclo está, qual risco existe, qual próxima ação e quem é responsável.",
      },
      {
        id: "privacidade",
        title: "Dados sensíveis precisam de cuidado",
        lead: "Informações corporais, saúde, fotos e depoimentos devem ter permissão clara e acesso restrito.",
      },
    ],
  },
  {
    slug: "rotinas",
    group: "Produto",
    title: "Rotina semanal antifalha.",
    shortTitle: "Rotinas",
    description: "Cadência de professor, aluno, vendedor, gestor e comunidade.",
    icon: Dumbbell,
    chapters: [
      {
        id: "semana",
        title: "Semana operacional",
        lead: "Segunda define intenção, terça e quarta sustentam execução, quinta ajusta rota, sexta reconhece progresso e sábado ativa comunidade.",
      },
      {
        id: "professor",
        title: "Rotina do professor",
        lead: "Verificar presença, observar padrão, corrigir técnica, registrar checkpoint e mandar reforço de identidade no WhatsApp.",
      },
    ],
  },
];

export const directoryItems = brandSections.map((section, index) => ({
  id: section.slug,
  href: `/app/marca/${section.slug}`,
  group: section.group,
  category: String(index + 1).padStart(2, "0"),
  name: section.shortTitle,
  description: section.description,
}));

export const assetDirectory = [
  {
    id: "logo-branco",
    href: "/brand/triade-branco-transparente.png",
    group: "Fundamentos",
    category: "Logo PNG",
    name: "Triade branco",
    description: "Logo principal transparente para fundos escuros, stories e apresentações.",
  },
  {
    id: "logo-branco-svg",
    href: "/brand/triade-branco.svg",
    group: "Fundamentos",
    category: "Logo SVG",
    name: "Triade branco SVG",
    description: "Versão SVG para interfaces e materiais digitais.",
  },
  {
    id: "logo-preto",
    href: "/brand/triade-preto-transparente.png",
    group: "Fundamentos",
    category: "Logo PNG",
    name: "Triade preto",
    description: "Logo principal transparente para fundos claros e documentos.",
  },
  {
    id: "logo-preto-svg",
    href: "/brand/triade-preto.svg",
    group: "Fundamentos",
    category: "Logo SVG",
    name: "Triade preto SVG",
    description: "Versão SVG para interfaces e materiais digitais.",
  },
  {
    id: "selo",
    href: "/brand/selo-triade-branco-transparente.png",
    group: "Fundamentos",
    category: "Selo PNG",
    name: "Selo Triade",
    description: "Símbolo transparente para Membro Triade, ritos, gamificação e comunidade.",
  },
  {
    id: "selo-svg",
    href: "/brand/selo-triade-branco.svg",
    group: "Fundamentos",
    category: "Selo SVG",
    name: "Selo Triade SVG",
    description: "Versão SVG do selo para aplicações digitais.",
  },
  {
    id: "tsp-branco",
    href: "/brand/tsp-branco-transparente.png",
    group: "Fundamentos",
    category: "Monograma PNG",
    name: "TSP branco",
    description: "Monograma transparente para avatares e espaços compactos em fundo escuro.",
  },
  {
    id: "tsp-preto",
    href: "/brand/tsp-preto-transparente.png",
    group: "Fundamentos",
    category: "Monograma PNG",
    name: "TSP preto",
    description: "Monograma transparente para avatares e espaços compactos em fundo claro.",
  },
  {
    id: "aplicacao-fachada",
    href: "/brand/applications/fachada-vidro.jpg",
    group: "Fundamentos",
    category: "Aplicação",
    name: "Fachada e vidro",
    description: "Exemplo de marca em ambiente físico com alta leitura e contraste.",
  },
  {
    id: "aplicacao-uniformes",
    href: "/brand/applications/uniformes.jpg",
    group: "Fundamentos",
    category: "Aplicação",
    name: "Uniformes",
    description: "Sistema de roupa para equipe, turmas e experiências presenciais.",
  },
  {
    id: "aplicacao-experience",
    href: "/brand/applications/triade-experience.jpg",
    group: "Marca",
    category: "Experience",
    name: "Triade Experience",
    description: "Braço operacional da marca para vivências presenciais e ativações.",
  },
  {
    id: "aplicacao-paleta",
    href: "/brand/applications/paleta-oficial.jpg",
    group: "Fundamentos",
    category: "Manual",
    name: "Paleta oficial",
    description: "Página do manual com os códigos cromáticos oficiais.",
  },
];

export function getBrandSection(slug: string) {
  return brandSections.find((section) => section.slug === slug);
}
