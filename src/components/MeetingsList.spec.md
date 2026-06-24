# MeetingsList — UX Specification

> Lista principal da nova aba **Reuniões** no app Triade.
> Substitui o `page.tsx` atual de `/app/reunioes` (que hoje é uma lista estática inline).
> Status: **Spec-only** (sem implementação).

---

## 1. Propósito & Critério de Sucesso

**Job-to-be-done:** "Quando eu (ou um membro do time) faço uma reunião importante, preciso encontrar rapidamente as últimas reuniões, ver o status do processamento por IA, e abrir o detalhe de qualquer uma em menos de 2 cliques."

**Definition of done (UX):**
- Lista carrega ≤ 250ms (até 100 reuniões mais recentes; demais via paginação/infinite scroll).
- Status de cada reunião é **glanceable** (cor + label) sem ler texto.
- Botão "+ Nova Reunião" sempre visível (sticky no header da página).
- Filtros básicos (status, participante, intervalo de datas) acessíveis em 1 clique.
- Estado **vazio** convida o usuário à primeira reunião (CTA + explicação do valor da IA).

---

## 2. Hierarquia da Página

```
PageHeader
  eyebrow: "Memória da empresa"
  title:   "Reuniões"
  description: "Centralize transcrições, decisões, riscos e planos de ação."
  action:  <button> + Nova Reunião  (verde emerald-600, abre NewMeetingDialog)

ValueStrip (3 cards — só visível quando empty OR primeiro acesso)
  [📎 Importe a transcrição] [✨ Gere inteligência] [👥 Conecte execução]

FilterBar
  [🔎 Buscar...] [Status ▾] [Participante ▾] [Período ▾] [Ordenar ▾]

MeetingsTable / MeetingsCards
  (toggle de view: tabela densa OU grid de cards)

Pagination / Load more
```

---

## 3. Wireframe (ASCII)

### 3.1 View padrão — Tabela

```
+----------------------------------------------------------------------------+
| Memória da empresa                                                         |
| Reuniões                                          [ + Nova Reunião ]       |
| Centralize transcrições, decisões, riscos e planos de ação.                |
+----------------------------------------------------------------------------+

[🔎 Buscar reunião...        ]  [Status: Todos ▾]  [Período ▾]  [Cards|Tabela]

+----------------------------------------------------------------------------+
| REUNIÃO                          | PARTICIPANTES | DATA       | STATUS    |
+----------------------------------------------------------------------------+
| Sprint Review · Plataforma TSP   | 6 pessoas     | 22 jun 16h | ●Processada|
| #produto #squad-painel           |               |            |            |
+----------------------------------------------------------------------------+
| Onboarding · Dra. Paula          | 3 pessoas     | 21 jun 09h | ●Processando|
| #onboarding #professores         |               |            |            |
+----------------------------------------------------------------------------+
| Estratégia 2026 · Liderança      | 4 pessoas     | 19 jun 14h | ●Processada|
| #estratégia #liderança           |               |            |            |
+----------------------------------------------------------------------------+
| Reunião com fornecedor X         | 2 pessoas     | 18 jun 10h | ●Erro     |
| #financeiro                      |               |            | (revisar) |
+----------------------------------------------------------------------------+

[ Carregar mais 24 reuniões ]
```

### 3.2 View alternativa — Cards (grid 3 col desktop)

```
+----------------------+   +----------------------+   +----------------------+
| ●Processada          |   | ●Processando         |   | ●Erro                |
| Sprint Review        |   | Onboarding Dra Paula |   | Reunião fornecedor X |
| Plataforma TSP       |   |                      |   |                      |
|                      |   |                      |   |                      |
| 👥 6 · 📅 22 jun 16h |   | 👥 3 · 📅 21 jun 09h|   | 👥 2 · 📅 18 jun 10h |
| #produto #squad      |   | #onboarding          |   | #financeiro          |
|                      |   |                      |   |                      |
| ▸ 8 decisões         |   | ▸ Aguardando IA      |   | ▸ Reprocessar        |
| ▸ 12 tarefas         |   |                      |   |                      |
+----------------------+   +----------------------+   +----------------------+
```

**Especificações visuais:**
- Card: `panel rounded-xl shadow-sm hover:shadow-md p-5 transition`.
- Header do card = badge de status + título em `font-heading font-semibold`.
- Metadados: linha com ícones `Users`, `CalendarDays` em `text-slate-500 text-sm`.
- Tags: `<Badge>` (componente do projeto, `page-parts.tsx`).
- Footer do card: micro-stats (decisões, tarefas) — só aparecem quando `status === "Processada"`.

### 3.3 Estado vazio (primeira vez)

```
+----------------------------------------------------------------------------+
|                                                                            |
|                              🎙️                                            |
|                                                                            |
|             Nenhuma reunião registrada por aqui ainda.                     |
|                                                                            |
|     Capture a primeira para que a Triade comece a aprender com seu time.   |
|                                                                            |
|                   [ + Criar primeira reunião ]                             |
|                                                                            |
|     Você pode importar um áudio, colar transcrição ou conectar Drive.      |
|                                                                            |
+----------------------------------------------------------------------------+
```

---

## 4. Status (badges) — taxonomia

| Status interno | Label PT-BR | Cor (Badge tone) | Ícone | Quando |
|---|---|---|---|---|
| `draft` | Rascunho | `slate` | `FileEdit` | criada, sem áudio/transcrição |
| `uploading` | Enviando | `amber` | `UploadCloud` | upload em progresso |
| `transcribing` | Transcrevendo | `blue` | `Mic` | STT em execução |
| `processing` | Processando IA | `blue` | `Sparkles` (pulse) | LLM analisando |
| `ready` | Processada | `green` | `CheckCircle2` | análise concluída |
| `error` | Erro | `red` | `AlertTriangle` | falha em qualquer etapa, mostra tooltip "ver detalhes" |

> **Coerência com Design System:** já existe `<Badge tone="green">` / `tone="amber"` em `page-parts.tsx`. Adicionar `tone="blue"` / `tone="red"` / `tone="slate"` se ainda não existirem (decisão menor — aprovar com Yuna).

---

## 5. Filtros (FilterBar)

| Filtro | Tipo | Default | Comportamento |
|---|---|---|---|
| Busca | input texto | "" | busca em `title`, `participants[].name`, `tags[]`, `transcript` (server-side) |
| Status | `<select>` multi | "Todos" | filtra por badge — chips persistem na URL |
| Participante | combobox autocomplete | — | lista de profiles do workspace |
| Período | preset: Hoje / 7d / 30d / 90d / Personalizado | "30d" | personalizado abre date-range picker |
| Ordenar | `<select>` | "Mais recente" | "Mais antiga", "Mais decisões", "Mais tarefas geradas" |
| View toggle | botão | "Tabela" desktop / "Cards" mobile | persistido em `localStorage` |

Filtros aplicam-se via querystring (`?status=ready&q=onboarding`) para deep-link.

---

## 6. Props (contrato sugerido)

```ts
type Meeting = {
  id: string;
  title: string;
  date: string;          // ISO yyyy-mm-dd
  time?: string;         // HH:mm
  participants: { id: string; name: string; avatarUrl?: string }[];
  status: "draft" | "uploading" | "transcribing" | "processing" | "ready" | "error";
  tags: string[];
  driveFileId?: string;  // se origem é Drive
  driveUrl?: string;
  source: "upload" | "youtube" | "drive" | "manual";
  // só quando ready:
  stats?: { decisions: number; actionItems: number; risks: number };
  errorMessage?: string;
};

type MeetingsListProps = {
  meetings: Meeting[];
  total: number;          // para paginação
  isLoading: boolean;
  filters: {
    q?: string;
    status?: Meeting["status"][];
    participantId?: string;
    range?: { from: string; to: string };
    sort?: "recent" | "oldest" | "most-decisions" | "most-tasks";
  };
  onFiltersChange: (next: MeetingsListProps["filters"]) => void;
  onLoadMore: () => void;
  onNewMeeting: () => void;        // abre NewMeetingDialog
};
```

---

## 7. Estados do Componente

| Estado | Visual | Comportamento |
|---|---|---|
| `loading` | Skeleton de 6 linhas (table) ou 6 cards | Spinner não bloqueante |
| `empty` (filtros ativos sem resultado) | Ilustração + "Nenhuma reunião com esses filtros" + botão "Limpar filtros" | — |
| `empty` (zero reuniões no workspace) | Onboarding (seção 3.3) | CTA grande |
| `populated` | Tabela/cards normal | linha/card é `<Link href="/app/reunioes/{id}">` |
| `processing-row` | linha com pulse sutil + badge azul | Auto-refresh a cada 5s via SWR/polling enquanto houver reunião com status `processing` ou `transcribing` |
| `error-row` | borda-l vermelha + tooltip ao hover na badge | Click no badge abre detalhe com botão "Reprocessar" |

---

## 8. Integração com AppShell (Sidebar)

O sidebar (`app-shell.tsx`) **já tem "Reuniões"** no grupo "Operação" (linha 34) — mantido como está.

**Mudança necessária no shell (relacionada à task de remoção):**
- Remover entrada `{ href: "/app/projetos", label: "Ciclos & Programas", icon: FolderKanban }` do grupo "Operação".
- Garantir que `pathname.startsWith("/app/reunioes")` continua dando `is-active` corretamente (já funciona).

---

## 9. Polling & Realtime

Reuniões com status `transcribing` ou `processing` precisam refletir progresso sem refresh manual:

- **v1:** polling com SWR (`refreshInterval: 5000`) **apenas** quando há ao menos uma reunião em estado intermediário visível na tela. Quando tudo for `ready`/`error`, intervalo cai pra `0`.
- **v2:** Supabase Realtime (`postgres_changes` em `meetings` filtrado por `workspace_id`).

Status muda → badge faz fade + número de stats anima count-up.

---

## 10. Acessibilidade (WCAG 2.1 AA)

- **Tabela:** `<table>` semântica com `<thead>`/`<tbody>`, `<th scope="col">`.
- **Cards:** cada card é `<article>` envolvendo `<Link>`; `aria-label` inclui título + status + data.
- **Status:** badge tem `aria-label` explícito ("Status: Processada"), não confiar só em cor.
- **Filtros:** cada filtro tem `<label>` visível; resultados anunciados em `aria-live="polite"`: "12 reuniões encontradas".
- **Foco:** linha/card focável via `Tab`; `Enter` abre detalhe.
- **Skeleton:** `aria-busy="true"` durante loading.
- **Erro:** ícone `AlertTriangle` tem `aria-label="Reunião com erro de processamento"`.

---

## 11. Open Questions

1. **Agrupar por data?** (Hoje, Esta semana, Mês passado...) — Recomendo v2; v1 mantém lista plana ordenada.
2. **Bulk actions?** (selecionar várias e exportar/excluir) — v2.
3. **Preview hover?** Mostrar 3 primeiras decisões num popover ao passar mouse no card? — Tentador, mas valida depois.
4. **Pinned/Favoritas?** — Sim, mas v2.
5. **Mostrar avatar dos participantes (stack)?** — Sim na view Cards; verificar se há `avatarUrl` no schema atual.

---

## 12. Métricas de UX

- Tempo médio entre abrir lista e abrir detalhe (alvo: ≤ 8s).
- % de reuniões abertas via card vs. via search.
- Taxa de retorno semanal à página (engagement).
- Tempo até primeira reunião processada (após criar a conta).
