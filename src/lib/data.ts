export type Role = "owner" | "admin" | "manager" | "member" | "viewer";
export type TaskStatus =
  | "Backlog"
  | "A Fazer"
  | "Em andamento"
  | "Em revisão"
  | "Bloqueada"
  | "Concluída"
  | "Cancelada";

export const employees = [
  { id: "will", name: "Will Trindade", email: "will@triade.local", role: "owner" as Role, area: "Metodo & Comunidade", active: true },
  { id: "nilton", name: "Nilton", email: "nilton@triade.local", role: "admin" as Role, area: "Produto Digital", active: true },
  { id: "carol", name: "Carol", email: "carol@triade.local", role: "manager" as Role, area: "Operacao de Alunos", active: true },
  { id: "professor", name: "Professor TSP", email: "professor@triade.local", role: "member" as Role, area: "Treino & Checkpoints", active: true },
  { id: "nutri", name: "Nutri Performance", email: "nutri@triade.local", role: "member" as Role, area: "Nutricao", active: true },
  { id: "copy", name: "Copy & Conteudo", email: "copy@triade.local", role: "member" as Role, area: "Comunicacao", active: true },
];

export const meetings = [
  {
    id: "codigo-tsp",
    title: "Arquitetura do Codigo TSP",
    date: "16 jun 2026",
    time: "09:00",
    participants: ["Will", "Nilton", "Carol"],
    status: "Processada",
    tags: ["Metodo", "Brandbook", "Movimento"],
    summary: "Consolidacao dos tres pilares: Identidade, Movimento e Metodo como base do painel, da comunicacao e da jornada do aluno.",
    strategic: "A Triade nao vende treino. Vende reprogramacao de identidade corporal com acompanhamento, ambiente e progresso mensuravel.",
    decisions: ["Nomear o aluno como Membro Triade", "Usar Codigo TSP como linguagem proprietaria", "Transformar checkpoints em rito de comunidade"],
    risks: ["Promessas agressivas sem prova", "Confundir movimento com academia convencional"],
    opportunities: ["Gamificacao por ciclos", "Acervo de transformacoes autorizadas", "Comunidade fechada de alta performance"],
  },
  {
    id: "oferta-2026",
    title: "Oferta oficial 2026",
    date: "15 jun 2026",
    time: "14:30",
    participants: ["Will", "Carol", "Copy"],
    status: "Processada",
    tags: ["Oferta", "Vendas", "WhatsApp"],
    summary: "Plano anual como decisao principal, com Metodo Triade aplicado, suporte continuo e foco em resultado sustentavel.",
    strategic: "O plano mensal funciona como referencia. A decisao mais inteligente e o anual, porque transformacao exige continuidade.",
    decisions: ["Organizar comparativo de planos", "Criar pitch premium", "Separar prova, promessa e garantia"],
    risks: ["Oferta virar desconto", "Nao documentar objeções reais"],
    opportunities: ["Scripts por persona", "Follow-up por ciclo de identidade", "WhatsApp com linguagem consultiva"],
  },
  {
    id: "comunidade",
    title: "Gamificacao e comunidade",
    date: "14 jun 2026",
    time: "16:00",
    participants: ["Will", "Professor TSP", "Nutri"],
    status: "Revisar",
    tags: ["Comunidade", "Alunos", "Retencao"],
    summary: "Definicao de missoes semanais para manter alunos engajados: presenca, treino, alimentacao, corrida, checkpoint e depoimento autorizado.",
    strategic: "Pertencimento reduz recaida. O aluno precisa sentir que entrou em uma identidade, nao apenas em uma grade de horarios.",
    decisions: ["Criar ranking por consistencia", "Separar pontuacao de performance e pontuacao de processo"],
    risks: ["Competicao excessiva", "Expor dados sensiveis de alunos"],
    opportunities: ["Medalhas internas", "Rituais de entrada", "Turmas por ciclo"],
  },
];

export const tasks = [
  ["Construir brandbook completo da Triade", "Em andamento", "Urgente", "Nilton", "Branding", "Brandbook TSP"],
  ["Publicar painel empresarial na Vercel", "A Fazer", "Urgente", "Nilton", "Produto Digital", "Painel TSP"],
  ["Catalogar logos e manual de marca", "Concluída", "Alta", "Copy & Conteudo", "Branding", "Acervo"],
  ["Criar documentos doutrinarios DOC-001 a DOC-008", "Em andamento", "Urgente", "Copy & Conteudo", "Comunicacao", "Movimento TSP"],
  ["Modelar gamificacao de alunos", "Em andamento", "Alta", "Carol", "Operacao", "Comunidade"],
  ["Criar dashboard de alunos e ciclos", "A Fazer", "Alta", "Nilton", "Produto Digital", "Painel TSP"],
  ["Revisar linguagem de promessa e garantia", "Em revisão", "Alta", "Will Trindade", "Metodo", "Oferta 2026"],
  ["Transformar ICPs em jornadas", "Concluída", "Alta", "Copy & Conteudo", "Inteligencia", "ICP"],
  ["Criar biblioteca de objeções", "A Fazer", "Média", "Carol", "Vendas", "WhatsApp"],
  ["Configurar Drive oficial do acervo", "Backlog", "Alta", "Nilton", "Operacao", "Acervo"],
  ["Criar roteiro de onboarding do Membro Triade", "A Fazer", "Alta", "Professor TSP", "Comunidade", "Codigo TSP"],
  ["Definir matriz de evidencias e depoimentos", "Backlog", "Média", "Will Trindade", "Metodo", "Prova"],
].map(([title, status, priority, assignee, area, project], index) => ({
  id: `task-${index + 1}`,
  title,
  status: status as TaskStatus,
  priority,
  assignee,
  area,
  project,
  due: index % 4 === 0 ? "20 jun" : index % 3 === 0 ? "24 jun" : "30 jun",
  score: 98 - index * 3,
}));

export const projects = [
  ["Painel TSP", "Nilton", 42, "Em andamento"],
  ["Brandbook TSP", "Copy & Conteudo", 55, "Em andamento"],
  ["Codigo TSP", "Will Trindade", 72, "Em revisão"],
  ["Comunidade Membro Triade", "Carol", 35, "Planejamento"],
  ["Oferta 2026", "Will Trindade", 68, "Em revisão"],
  ["WhatsApp e Vendas", "Carol", 31, "Planejamento"],
  ["Acervo e Drive", "Nilton", 20, "Backlog"],
  ["Gamificacao Interna", "Professor TSP", 28, "Planejamento"],
].map(([name, owner, progress, status], index) => ({ id: index + 1, name, owner, progress, status }));

export const documents = [
  { title: "Codigo TSP - Identidade, Movimento e Metodo", type: "Doutrina", tags: ["Metodo", "Movimento"] },
  { title: "Metodo Triade 360 - Jornada de Transformacao", type: "Metodo", tags: ["Ciclos", "Performance"] },
  { title: "Proposta Unica de Valor", type: "Oferta", tags: ["Copy", "PUV"] },
  { title: "Big Idea e Mecanismo Unico", type: "Estrategia", tags: ["Identidade", "Reprogramacao"] },
  { title: "ICPs Ricardo, Antonio e Carla", type: "ICP", tags: ["Alunos", "Personas"] },
  { title: "Ofertas Oficiais 2026", type: "Vendas", tags: ["Planos", "Anual"] },
  { title: "Roteiro de Reels e Hooks", type: "Conteudo", tags: ["Instagram", "Criativos"] },
  { title: "Banco de Objeções e Conversas Convertidas", type: "Vendas", tags: ["WhatsApp", "Objeções"] },
];

export const students = [
  { name: "Ricardo Amaral", archetype: "Reversao de Identidade", cycle: "Fundacao", points: 420, status: "Em ativacao", goal: "Trocar vergonha por orgulho no espelho" },
  { name: "Antonio Braga", archetype: "Longevidade com Performance", cycle: "Performance", points: 680, status: "Consistente", goal: "Correr com autonomia e vitalidade aos 62" },
  { name: "Carla Souza", archetype: "Atleta Empresaria", cycle: "Alta Performance", points: 760, status: "Pronta para desafio", goal: "Subir de nivel sem perder equilibrio" },
  { name: "Membro Fundacao", archetype: "Recomeço guiado", cycle: "Fundacao", points: 310, status: "Precisa de checkpoint", goal: "Criar rotina antifalha" },
  { name: "Membro Corrida", archetype: "Comunidade e Prova", cycle: "Corrida", points: 540, status: "Em evolucao", goal: "Completar o desafio semanal" },
];
