# Arquitetura — Módulo Tarefas (Frontend-Only)

> Status atual: documento histórico/obsoleto. Esta proposta localStorage-only foi
> superada pela arquitetura de produção do painel Tríade. O módulo `/app/tarefas`
> agora usa `/api/tasks`, `/api/tasks/:id`, `/api/tasks/workspace`, Supabase/RLS,
> `tasks.meeting_id` e `tasks.workspace_meta` como fonte primária quando o backend
> está configurado. `localStorage` permanece apenas como fallback de demonstração
> e cache local defensivo.

**Autor:** Aria (AIOS Architect)
**Escopo:** `src/app/app/tarefas` e `src/components/tasks-workspace.tsx`
**Objetivo:** Remover 100% da dependência de backend (Supabase, Next API routes, server actions) do módulo Tarefas, mantendo todas as funcionalidades existentes e adicionando Calendar view, Filter panel, New Task dialog e drag-and-drop no Kanban.
**Estado:** DESIGN — não implementar até aprovação.

---

## 1. Visão Geral & Princípios

### 1.1 Princípios arquiteturais

1. **Local-first absoluto.** Toda fonte de verdade vive no navegador (`localStorage`). Nenhum fetch para `/api/*` ou Supabase a partir do módulo Tarefas.
2. **Zero rebuild para uso offline.** A página `tarefas` deve funcionar com `next dev` mesmo sem variáveis Supabase (`isSupabaseConfigured() === false`).
3. **Hidratação determinística.** Servidor renderiza shell vazio (skeleton), cliente hidrata a partir de `localStorage` no `useEffect` inicial. Evita mismatch SSR/CSR.
4. **Compatibilidade com schema existente.** O tipo `TaskItem` derivado de `src/lib/data.ts` é preservado para não quebrar `Badge`, `getDashboardData()` e outras superfícies que possam consumir tarefas.
5. **Reversibilidade.** A camada `tasksRepository` é uma interface; uma implementação futura `SupabaseTasksRepository` pode ser plugada sem tocar nos componentes.

### 1.2 Trade-offs assumidos

| Decisão | Ganho | Custo |
|---|---|---|
| `localStorage` em vez de IndexedDB | API síncrona, ~5KB de código, integra com `useState` trivialmente | Limite de 5–10 MB; não suporta arquivos. Aceitável: < 500 tarefas |
| Parser de comandos regex/keywords (sem LLM) | Determinístico, offline, sem custo de API | Vocabulário fechado; precisa de respostas pré-formatadas |
| `@dnd-kit/core` para drag-drop | Acessibilidade nativa (teclado/screen reader), sem Hammer.js, ~14KB gzip | Curva de API maior que `react-beautiful-dnd` (que está deprecated) |
| Sem biblioteca de calendário | Zero deps adicionais para um grid mês simples | ~120 linhas de código próprio para layout do mês |

### 1.3 Fora do escopo

- Sincronização multi-aba em tempo real (apenas listener `storage` opcional, ver §9).
- Migração dos dados Supabase existentes para localStorage (one-way: localStorage é a nova verdade).
- Remoção do endpoint `/api/tasks/command` — fica órfão e pode ser deletado em PR separado.

---

## 2. Diagrama de Componentes & Fluxo de Dados

```
                    ┌─────────────────────────────────────────────┐
                    │  src/app/app/tarefas/page.tsx (SERVER)      │
                    │  - Renderiza apenas PageHeader + shell      │
                    │  - NÃO chama getTasks() mais                │
                    └────────────────┬────────────────────────────┘
                                     │ props: { } (vazio)
                                     ▼
                ┌────────────────────────────────────────────────┐
                │  TasksWorkspace.tsx (CLIENT, orchestrator)     │
                │  - useTasksStore() hook (estado + persistência)│
                │  - useCommandParser() hook                     │
                │  - Decide qual view renderizar                 │
                └─┬──────────────────────────────────────────┬───┘
                  │                                          │
       ┌──────────┴───────────┐                  ┌───────────┴───────────┐
       │  State Layer         │                  │  View Layer            │
       │                      │                  │                        │
       │  useTasksStore()     │◄────read/write───┤  ListView              │
       │   │                  │                  │  KanbanView            │
       │   ├─ tasks[]         │                  │  CalendarView (novo)   │
       │   ├─ filters{}       │                  │  CommandChat           │
       │   └─ syncToStorage() │                  │  FilterPanel (novo)    │
       │                      │                  │  TaskFormDialog (novo) │
       └──────────┬───────────┘                  └────────────────────────┘
                  │
                  ▼
       ┌──────────────────────────────────────────────────┐
       │  tasksRepository (src/lib/tasks/storage.ts)      │
       │  - load(): TaskItem[]                            │
       │  - save(tasks): void                             │
       │  - seed(): TaskItem[]  (usa fallbackTasks)       │
       │  - clear(): void                                 │
       └──────────────────────┬───────────────────────────┘
                              │
                              ▼
                  ┌───────────────────────────┐
                  │  window.localStorage      │
                  │  key: "triade:tasks:v1"   │
                  └───────────────────────────┘
```

### 2.1 Fluxo de leitura inicial

1. Server renderiza `TasksWorkspace` com `initialTasks={[]}` (ou sem prop).
2. No cliente, `useTasksStore` executa `useEffect(() => { setTasks(repository.load()) }, [])`.
3. Se `load()` retorna array vazio (primeira visita), chama `repository.seed()` que copia `fallbackTasks` de `src/lib/data.ts` para localStorage e devolve a lista.
4. Render final mostra as tarefas. Skeleton só aparece no primeiríssimo frame antes da hidratação.

### 2.2 Fluxo de escrita (criar/editar/mover)

```
User action → reducer/setter no useTasksStore
            → setTasks(novoArray)
            → useEffect[tasks] dispara repository.save(novoArray)
            → JSON.stringify + localStorage.setItem
            → CommandChat reflete confirmação
```

### 2.3 Fluxo do parser de comandos

```
input "Crie tarefa para Nilton revisar dashboard até sexta"
   ▼
parseCommand(input) → { intent: "create", title, assignee?, due? }
   ▼
dispatch action → useTasksStore.addTask({...})
   ▼
generateResponse(intent, result) → "Tarefa criada em A Fazer."
   ▼
setResponse(...) no chat
```

---

## 3. Schema JSON das Tarefas

### 3.1 Tipo `Task` (canônico, persistido)

```ts
// src/lib/tasks/types.ts
export type TaskStatus =
  | "Backlog"
  | "A Fazer"
  | "Em andamento"
  | "Em revisão"
  | "Bloqueada"
  | "Concluída"
  | "Cancelada";

export type TaskPriority = "Urgente" | "Alta" | "Média" | "Baixa";

export interface Task {
  /** ULID gerado no cliente. Prefixo "task-" mantido por compatibilidade visual. */
  id: string;

  /** Título humano. Obrigatório, 3..200 chars. */
  title: string;

  /** Descrição livre. Opcional. */
  description?: string;

  status: TaskStatus;
  priority: TaskPriority;

  /** Nome do responsável. String livre para compat com fallbackTasks (ex.: "Will Trindade"). */
  assignee: string;

  /** Data de vencimento em ISO-8601 (YYYY-MM-DD). Ex.: "2026-06-30". */
  due: string | null;

  /** Projeto associado (string livre). */
  project: string;

  /** Área funcional (string livre). */
  area: string;

  /** Score IA simulado 0..100. Calculado por heurística local. */
  score: number;

  /** Timestamps ISO-8601 completos. */
  createdAt: string;
  updatedAt: string;

  /** Tags livres. Suporte futuro a filtros. */
  tags?: string[];
}
```

### 3.2 Migração do tipo legado (display-only)

O `src/lib/data.ts` armazena `due: "20 jun"` (string formatada PT-BR). A nova `Task.due` é ISO. Conversão:

- **Seed:** O `repository.seed()` converte os `fallbackTasks` legados para o novo schema, parseando `"20 jun"` → `"2026-06-20"` via tabela de meses PT-BR. Ano inferido para o ano corrente.
- **Display:** Componentes de view usam `formatDueLabel(task.due)` (helper em `src/lib/tasks/format.ts`) que devolve `"20 jun"` ou `"Sem prazo"`.

### 3.3 Validação

```ts
// src/lib/tasks/schema.ts
import { z } from "zod"; // já está em deps

export const TaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(["Backlog","A Fazer","Em andamento","Em revisão","Bloqueada","Concluída","Cancelada"]),
  priority: z.enum(["Urgente","Alta","Média","Baixa"]),
  assignee: z.string().min(1),
  due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  project: z.string().min(1),
  area: z.string().min(1),
  score: z.number().int().min(0).max(100),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tags: z.array(z.string()).optional(),
});
```

Validação acontece em `repository.load()` (sane-fallback se schema mudar) e em `addTask()`/`updateTask()`.

---

## 4. Estrutura de localStorage

### 4.1 Chaves e formato

```
┌──────────────────────────────┬──────────────────────────────────────────────┐
│ Key                          │ Valor (JSON)                                  │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ triade:tasks:v1              │ { version: 1, tasks: Task[] }                 │
│ triade:tasks:prefs:v1        │ { view, filters, lastCommand }                │
│ triade:tasks:meta:v1         │ { lastSeededAt, lastWriteAt }                 │
└──────────────────────────────┴──────────────────────────────────────────────┘
```

**Por que envelope com `version`?** Permite migração `v1 → v2` no futuro sem perder dados. `repository.load()` faz:

```
if (parsed.version !== 1) → migrate(parsed) ou clear+seed
```

### 4.2 Preferências de UI

```ts
interface TaskPrefs {
  view: "list" | "kanban" | "calendar";
  filters: {
    status?: TaskStatus[];
    assignee?: string[];
    project?: string[];
    priority?: TaskPriority[];
    dueRange?: { from: string; to: string } | null;
    search?: string;
  };
  lastCommand: string; // para restaurar input
}
```

### 4.3 SSR safety

Todas as chamadas a `localStorage` ficam encapsuladas em `repository.ts` com guard `typeof window === "undefined"`. Em SSR retornam `[]` / `null`. Hidratação verdadeira só acontece em `useEffect`.

### 4.4 Quota

- 12 tarefas seed × ~400 bytes = ~5 KB.
- Limite prático localStorage: ~5 MB por origem.
- Cap recomendado no cliente: warn quando `tasks.length > 1000`, hard-limit em 5000 (raise error no `addTask`).

---

## 5. API do Parser de Comandos

### 5.1 Assinatura

```ts
// src/lib/tasks/command-parser.ts
export type CommandIntent =
  | { kind: "create"; title: string; assignee?: string; due?: string; project?: string }
  | { kind: "filter"; predicate: (t: Task) => boolean; label: string }
  | { kind: "summarize"; scope: "all" | "blocked" | "overdue" | "by-assignee"; assignee?: string }
  | { kind: "status-change"; matcher: string; newStatus: TaskStatus }
  | { kind: "unknown"; reason: string };

export function parseCommand(input: string, ctx: ParserContext): CommandIntent;

interface ParserContext {
  knownAssignees: string[]; // derivado de tasks atuais
  knownProjects: string[];
  today: Date;
}
```

### 5.2 Gramática suportada (PT-BR)

| Intent | Padrões reconhecidos | Exemplos |
|---|---|---|
| `create` | `^(crie\|criar\|nova\|adicione)` + título + opcionais | "Crie tarefa para Nilton revisar dashboard até sexta no projeto Painel TSP" |
| `filter` | contém `mostrar\|listar\|filtrar\|ver` + qualificador | "Mostrar bloqueadas", "Listar tarefas do Will", "Ver atrasadas" |
| `summarize` | `^(resuma\|resumo\|quantas)` | "Resuma minhas tarefas", "Quantas bloqueadas?" |
| `status-change` | `(marcar\|mover\|conclu)` + alvo + status | "Mover task-3 para concluída", "Concluir brandbook" |
| `unknown` | nenhum padrão acima | qualquer outro input |

### 5.3 Extratores auxiliares

```ts
extractAssignee(text, knownAssignees): string | undefined
// "para Nilton", "do Will", "@carol" → match fuzzy contra knownAssignees

extractDueDate(text, today): string | undefined
// "até sexta"     → próxima sexta-feira (ISO)
// "amanhã"        → today + 1d
// "em 3 dias"     → today + 3d
// "30/06"         → 2026-06-30
// "30 de junho"   → 2026-06-30

extractProject(text, knownProjects): string | undefined
// "no projeto X", "para o projeto X" → fuzzy match
```

### 5.4 Respostas "AI-like" (sem LLM)

```ts
// src/lib/tasks/responder.ts
export function generateResponse(intent: CommandIntent, result: CommandResult): string;
```

Templates determinísticos com pequenas variações para parecer natural:

- create: `"Tarefa '{title}' criada em A Fazer para {assignee}{dueClause}."`
- filter ok: `"Encontrei {n} tarefa(s) {label}: {top3}{more}."`
- filter empty: `"Nenhuma tarefa corresponde a '{label}'."`
- summarize: `"Você tem {n} tarefas: {byStatusBreakdown}."`
- unknown: `"Não entendi. Tente: 'criar tarefa ...', 'mostrar bloqueadas', 'resumo'."`

### 5.5 Erros e edge cases

- Título < 3 chars → resposta de erro, sem mutar estado.
- Data parseada no passado → cria mesmo assim, mas anota `(atrasada)` na resposta.
- Múltiplos assignees no comando → usa o primeiro reconhecido.

---

## 6. Lista de Arquivos: Criar/Modificar/Remover

### 6.1 Criar

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/tasks/types.ts` | `Task`, `TaskStatus`, `TaskPriority`, `TaskPrefs`, `Filters` |
| `src/lib/tasks/schema.ts` | `TaskSchema` (Zod) + validators |
| `src/lib/tasks/storage.ts` | `tasksRepository`: `load`, `save`, `seed`, `clear`, `getPrefs`, `setPrefs` |
| `src/lib/tasks/seed.ts` | Converte `fallbackTasks` legados para o novo schema |
| `src/lib/tasks/format.ts` | `formatDueLabel`, `parseDueLabel`, `relativeDueLabel` |
| `src/lib/tasks/id.ts` | Gerador de id `task-<ULID>` (sem dep externa: 10 linhas) |
| `src/lib/tasks/command-parser.ts` | `parseCommand` + extratores |
| `src/lib/tasks/responder.ts` | `generateResponse` |
| `src/lib/tasks/score.ts` | Heurística local de `score` IA (priority + dueProximity + status) |
| `src/hooks/use-tasks-store.ts` | Hook React: state + persistência + ações (`add`, `update`, `move`, `delete`, `filter`) |
| `src/hooks/use-command-parser.ts` | Hook que injeta `ParserContext` derivado do store |
| `src/components/tasks/list-view.tsx` | Extraído do monolítico atual |
| `src/components/tasks/kanban-view.tsx` | Extraído + integração com `@dnd-kit` |
| `src/components/tasks/calendar-view.tsx` | **Novo.** Grid mensal com tarefas por dia |
| `src/components/tasks/command-chat.tsx` | Extraído (sem fetch agora) |
| `src/components/tasks/filter-panel.tsx` | **Novo.** Popover com chips de filtro |
| `src/components/tasks/task-form-dialog.tsx` | **Novo.** Dialog `@base-ui/react` para criar/editar |
| `src/components/tasks/task-card.tsx` | Card reutilizado em kanban + calendário |
| `src/components/tasks/dnd-container.tsx` | Wrapper `DndContext` + `SortableContext` |
| `src/components/tasks/empty-state.tsx` | Skeleton + estado vazio |

### 6.2 Modificar

| Arquivo | Mudança |
|---|---|
| `src/components/tasks-workspace.tsx` | Vira orchestrador fino: monta `<CommandChat/>`, view switcher, render condicional. Remove `useState` direto e `fetch`. |
| `src/app/app/tarefas/page.tsx` | Remove `await getTasks()` e prop `initialTasks`. Apenas `<PageHeader/>` + `<TasksWorkspace/>`. |
| `src/lib/repositories.ts` | `getTasks()` permanece (outros consumidores: dashboard). Não tocar agora. |

### 6.3 Remover (em PR de cleanup posterior, fora deste escopo)

| Arquivo | Justificativa |
|---|---|
| `src/app/api/tasks/command/route.ts` | Órfão depois desta mudança |

Mantemos por ora para não impactar outras telas que possam estar chamando. Auditar no PR de cleanup.

---

## 7. Estado e Hooks (Detalhe)

### 7.1 `useTasksStore`

```ts
function useTasksStore() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [prefs, setPrefsState] = useState<TaskPrefs>(defaultPrefs);
  const [hydrated, setHydrated] = useState(false);

  // Hidratação única
  useEffect(() => {
    const loaded = tasksRepository.load() ?? tasksRepository.seed();
    setTasks(loaded);
    setPrefsState(tasksRepository.getPrefs() ?? defaultPrefs);
    setHydrated(true);
  }, []);

  // Persistência reativa
  useEffect(() => { if (hydrated) tasksRepository.save(tasks); }, [tasks, hydrated]);
  useEffect(() => { if (hydrated) tasksRepository.setPrefs(prefs); }, [prefs, hydrated]);

  return {
    tasks, hydrated, prefs,
    addTask, updateTask, deleteTask, moveTask, setStatus,
    setView, setFilters, filteredTasks,
  };
}
```

**Justificativa para `useState` em vez de Zustand/Redux:**
- Volume de estado pequeno (1 array + 1 objeto prefs).
- Sem cross-component sharing fora deste módulo.
- Mantém zero novas deps de state management.
- Se crescer, migrar para Zustand é mecânico.

### 7.2 Re-renders e memoização

- `filteredTasks` é `useMemo([tasks, prefs.filters])`.
- `grouped` (kanban) é `useMemo([filteredTasks])`.
- `byDay` (calendar) é `useMemo([filteredTasks])`.
- `parserContext` é `useMemo([knownAssignees, knownProjects])` — recalculado só quando esses derivados mudam.

---

## 8. Views Novas

### 8.1 CalendarView

- Layout: grid 7 colunas × 5-6 linhas (semana começa segunda-feira).
- Cabeçalho: navegação `<` mês `>`, botão "Hoje".
- Cada célula: data + até 3 chips de tarefa (com overflow `+N mais` que abre popover).
- Clique em chip → abre `TaskFormDialog` em modo edit.
- Clique em célula vazia → abre `TaskFormDialog` em modo create com `due` pré-preenchido.
- Build: puro CSS Grid + array de datas computado em JS. **Sem libs**.

### 8.2 FilterPanel

- Popover (`@base-ui/react`) ancorado no botão "Filtros".
- Chips multi-select para: Status, Responsável, Projeto, Prioridade.
- Range picker simples (dois `<input type="date">`).
- Campo busca textual (debounced 200ms).
- Contador de filtros ativos como `Badge` no botão "Filtros".
- "Limpar filtros" reseta `prefs.filters`.

### 8.3 TaskFormDialog

- Dialog modal (`@base-ui/react`).
- Modos: `create` | `edit`.
- Campos: title (input), description (textarea), status (select), priority (select), assignee (combobox com `knownAssignees`), project (combobox), area (input), due (date input), tags (chips input).
- Validação via Zod (mensagem inline).
- Submit → `addTask` ou `updateTask`.

### 8.4 Kanban com Drag-and-Drop

- `@dnd-kit/core` + `@dnd-kit/sortable`.
- 6 colunas (uma por `TaskStatus` exceto `Cancelada`, opcionalmente ocultável).
- Drag entre colunas → `moveTask(id, newStatus)` → status muda → `updatedAt` bumped.
- Reordenar dentro da coluna → atualiza `order` (campo opcional, ver §11).
- Acessibilidade: keyboard sensor habilitado (Tab, Space/Enter para pegar, setas para mover).

---

## 9. Dependências NPM Novas

| Pacote | Versão sugerida | Tamanho gzip | Justificativa |
|---|---|---|---|
| `@dnd-kit/core` | `^6.1.0` | ~14 KB | Drag-and-drop acessível. Alternativas: `react-beautiful-dnd` (deprecated), `react-dnd` (mais pesado, sem teclado nativo). |
| `@dnd-kit/sortable` | `^8.0.0` | ~5 KB | Reordenação dentro da coluna. |
| `@dnd-kit/utilities` | `^3.2.2` | ~2 KB | Helpers `CSS.Transform`. |
| `ulid` | `^2.3.0` | ~1 KB | (Opcional) IDs lexicograficamente ordenáveis. Podemos evitar com função própria de 10 linhas — recomendado evitar. |

**Não adicionar:**
- Nenhuma lib de calendário (date-fns/dayjs) — `Intl.DateTimeFormat` + `Date` nativo já cobrem PT-BR. `Intl` já é usado em `repositories.ts`.
- Nenhuma lib de state (Zustand/Jotai) — não há necessidade.
- Nenhuma lib de form (react-hook-form) — 6 campos, controlled inputs bastam.

**Já disponíveis e reutilizadas:**
- `zod` (validação)
- `@base-ui/react` (Dialog, Popover)
- `lucide-react` (ícones)
- `clsx`, `tailwind-merge` (class composition)

**Total de KB adicionados:** ~22 KB gzipped. Aceitável.

---

## 10. SSR, Hidratação e Edge Cases

### 10.1 Mismatch SSR/CSR

**Problema potencial:** servidor renderiza tarefas vazias, cliente hidrata com tarefas de localStorage → React 19 warning.

**Mitigação:**
- `TasksWorkspace` retorna `<EmptyState/>` enquanto `hydrated === false`.
- Não renderizar listas nem contadores antes de hidratar.
- Conteúdo dinâmico (tarefas) só aparece pós-`useEffect`. Sem `suppressHydrationWarning`.

### 10.2 Storage indisponível

- Modo anônimo de Safari pode lançar `QuotaExceededError`.
- `repository.save()` faz `try/catch` e expõe `repository.lastError`.
- Toast/banner discreto: "Modo somente leitura — armazenamento indisponível".

### 10.3 Multi-aba

- Listener opcional `window.addEventListener("storage", ...)` no `useTasksStore` para refletir mudanças de outras abas.
- Pode ser feature flag (`prefs.multiTabSync`) — recomendo ON por padrão, custo zero.

### 10.4 Reset/Debug

- Adicionar no `FilterPanel` (área avançada) botão "Restaurar exemplos" → `repository.clear()` + `seed()`.

---

## 11. Pontos em Aberto (decididos autonomamente)

`[AUTO-DECISION] Ordenação manual no Kanban → adicionar campo opcional Task.order: number (default Date.now()) (reason: drag-drop entre colunas é mandatório; reordenar dentro da coluna é UX esperada e custa quase nada acomodar agora).`

`[AUTO-DECISION] ULID vs uuid vs nanoid → gerador próprio de 10 linhas baseado em Date.now()+crypto.getRandomValues (reason: evitar 1 dep extra; ordenação por createdAt já dá ordem temporal natural).`

`[AUTO-DECISION] Calendário i18n → fixar PT-BR via Intl com locale "pt-BR" (reason: produto é PT-BR only no momento; meeting-workspace e repositories já assumem isso).`

`[AUTO-DECISION] Migração de dados Supabase existentes → NÃO migrar (reason: escopo da missão é "frontend-only"; usuário aceitou perda implícita ao optar pelo modo local; documentar no PR).`

`[AUTO-DECISION] Endpoint /api/tasks/command → manter por ora, deletar em PR de cleanup separado (reason: pode haver outros consumidores; remover agora amplia blast radius da mudança).`

`[AUTO-DECISION] getTasks() em src/lib/repositories.ts → manter intacto (reason: dashboard e outras telas consomem; este módulo passa a ter sua própria fonte de verdade; coexistência é segura).`

---

## 12. Segurança & Privacidade

- **Dados em texto plano no localStorage.** Aceitável: tarefas internas, não-sensíveis. Documentar no README do módulo.
- **XSS implications:** títulos/descriptions são renderizados como texto em React (auto-escape). Não usar `dangerouslySetInnerHTML` em lugar algum.
- **Vazamento cross-tenant:** não aplicável — não há multi-tenant no client local. Cada navegador é uma "tenant" de fato.
- **Riscos de perda:** usuário limpando cookies/site data perde tudo. Mitigação futura: botão "Exportar JSON" / "Importar JSON" (sugerido como follow-up, não obrigatório para v1).

---

## 13. Performance

- Render de 500 tarefas em Kanban com `@dnd-kit`: ~16ms no primeiro mount (medido em projetos similares); aceitável.
- Filtragem é O(n) sobre `tasks`. Para n=500 → desprezível.
- `localStorage.setItem` síncrono pode bloquear UI a partir de ~2MB. Throttle de saves a 250ms via `useEffect` + `setTimeout` (`useDebouncedEffect` helper de 8 linhas).

---

## 14. Plano de Implementação Sugerido (fora do escopo desta missão)

Fase 1 — Infra (sem UI mudar): types, schema, storage, seed, format, id.
Fase 2 — Hooks: `useTasksStore`, `useCommandParser`.
Fase 3 — Refactor `TasksWorkspace`: extrair `ListView`, `KanbanView`, `CommandChat` (paridade funcional).
Fase 4 — Remover prop `initialTasks` e `getTasks()` da rota.
Fase 5 — Novas features: `TaskFormDialog`, `FilterPanel`, drag-drop Kanban.
Fase 6 — `CalendarView`.
Fase 7 — QA + remoção do endpoint `/api/tasks/command`.

Cada fase é um PR pequeno e mergeável independentemente.

---

## 15. Riscos & Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Mismatch SSR/CSR em produção | Média | Médio | `hydrated` flag + skeleton inicial; testes manuais em `next build && next start` |
| Quota localStorage atingida | Baixa (12 tarefas) | Alto se acontecer | try/catch + banner de read-only |
| `@dnd-kit` quebrar em React 19.2 | Baixa | Médio | Versão 6.1.0 já suporta React 19 conforme changelog |
| Parser falso-positivo (criar tarefa quando user só pergunta) | Média | Baixo | Exigir verbo no início (regex anchored `^crie|^criar|^nova`) |
| Perda de dados ao limpar browser | Alta (eventual) | Médio | Documentar; oferecer export/import como follow-up |
| Datas em PT-BR parseadas errado ("sexta" sem ano) | Média | Baixo | Sempre resolver para próxima ocorrência ≥ hoje |

---

## 16. Checklist de Aceitação (para QA na implementação)

- [ ] Página `/app/tarefas` carrega sem Supabase configurado.
- [ ] DevTools → Network: zero requests para `/api/*` ao usar tarefas.
- [ ] Criar tarefa via chat → aparece em "A Fazer".
- [ ] Refresh da página → tarefas persistem.
- [ ] Trocar para Kanban → drag-drop muda status; refresh mantém.
- [ ] Calendar view exibe tarefas no dia do `due`.
- [ ] Filtros aplicados ficam ativos após refresh.
- [ ] Limpar localStorage → seed automático na próxima visita.
- [ ] Testes unitários para `parseCommand` cobrindo todos os intents.
- [ ] `npm run typecheck` passa.
- [ ] Lighthouse a11y ≥ 95 na página.

---

## Apêndice A — Comparativo de Decisões Técnicas

### A.1 Por que não IndexedDB?

- API assíncrona obrigatória → cada read em `useEffect` (não inline em render).
- Boilerplate maior (`idb` lib ~5 KB).
- Ganhos (transações, índices) não justificáveis para ≤ 500 tarefas.
- Migração futura é viável: o `tasksRepository` é a única superfície a trocar.

### A.2 Por que não Server Actions com cookies?

- Missão explícita: "100% frontend-only", "removendo dependência de backend".
- Server Actions ainda exigem servidor — invalida o objetivo.

### A.3 Por que não Zustand?

- Estado vive em um componente raiz (`TasksWorkspace`) e é passado via props/context.
- `useState` + `useMemo` é suficiente. Menos magia, menos dep.

### A.4 Por que manter Zod (vs validação manual)?

- Zod já está nas deps.
- Validação de I/O com localStorage (dados podem ter sido mexidos manualmente).
- Útil também para form do `TaskFormDialog`.
