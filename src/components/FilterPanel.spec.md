# FilterPanel — UX Specification

> Painel de filtros multi-dimensional para o `TasksWorkspace`.
> Status: **Spec-only** (sem implementação ainda).

---

## 1. Propósito & Critério de Sucesso

**Job-to-be-done:** "Quando estou olhando 50+ tarefas e preciso focar em algo específico (ex.: 'só urgentes do Nilton em aberto'), quero combinar filtros rapidamente, ver o efeito em tempo real, e salvar combinações que uso recorrentemente."

**Definition of done (UX):**
- Aplicar 1 filtro em 1 clique; combinar 4 filtros em ≤ 8 cliques.
- Resultado da lista atualiza em **tempo real** (debounce 150ms entre clique e re-render).
- Contador visível: "Mostrando 7 de 52 tarefas".
- Filtro salvo é nomeado pelo usuário e aparece como chip clicável no topo.
- Estado persistido em URL (`?status=urgent&assignee=nilton`) — shareable.

---

## 2. Decisão de Forma: Painel Lateral vs. Dropdown

[AUTO-DECISION] Painel lateral direito (drawer) → **escolhido** (reason: 4 dimensões de filtro + date range não cabem confortavelmente em dropdown; painel permite scan visual de todos os filtros ativos; consistente com `CalendarView` que também usa drawer lateral).

**Trigger:** botão "Filtros" no topo do workspace (linha 54 atual) — abre drawer da direita.

**Estado vazio (drawer fechado, sem filtros ativos):** botão neutro `border border-[var(--border)] bg-white`.
**Estado ativo (drawer fechado, com filtros aplicados):** botão `bg-emerald-50 text-emerald-700 border-emerald-200` + badge contador `(3)`.

---

## 3. Wireframe (ASCII)

### 3.1 Drawer aberto

```
+------------------------------------------+
| Filtros                              [x] |
| Mostrando 7 de 52 tarefas                |
+------------------------------------------+
| FILTROS SALVOS                           |
| [Urgentes Nilton] [Bloqueadas] [+ Salvar]|
+------------------------------------------+
|                                          |
| STATUS                       [Limpar]    |
| [✓] Backlog                  (4)         |
| [✓] A Fazer                  (8)         |
| [ ] Em andamento             (12)        |
| [ ] Em revisão               (3)         |
| [✓] Bloqueada                (2)         |
| [ ] Concluída                (18)        |
| [ ] Cancelada                (5)         |
|                                          |
+------------------------------------------+
|                                          |
| RESPONSÁVEL                  [Limpar]    |
| [ Buscar...                  ]           |
| [✓] Nilton                   (15)        |
| [ ] Carol                    (9)         |
| [ ] Will Trindade            (7)         |
| [ ] Copy & Conteudo          (8)         |
| [ ] Professor TSP            (5)         |
| [ ] Nutri Performance        (8)         |
|                                          |
+------------------------------------------+
|                                          |
| PROJETO                      [Limpar]    |
| [ Buscar...                  ]           |
| [ ] Painel TSP               (6)         |
| [ ] Brandbook TSP            (4)         |
| [ ] Codigo TSP               (8)         |
| ... (collapse se > 6 itens, "Ver todos") |
|                                          |
+------------------------------------------+
|                                          |
| PRIORIDADE                   [Limpar]    |
| [✓] Urgente                  (6)         |
| [ ] Alta                     (18)        |
| [ ] Média                    (15)        |
| [ ] Baixa                    (13)        |
|                                          |
+------------------------------------------+
|                                          |
| DATA DE PRAZO                [Limpar]    |
| De:    [📅 dd/mm/aaaa     ]              |
| Até:   [📅 dd/mm/aaaa     ]              |
|                                          |
| Atalhos: [Esta semana] [Próx 7d]         |
|          [Atrasadas]   [Sem prazo]       |
|                                          |
+------------------------------------------+
| [ Limpar tudo ]            [ Aplicar ]   |
+------------------------------------------+
```

**Dimensões:**
- Largura drawer: `w-[380px]` desktop; `w-full` mobile (full screen).
- Header sticky com contador atualizando em tempo real.
- Footer sticky com 2 botões.
- Scroll interno só do conteúdo.

### 3.2 Chips de filtros ativos (acima da lista de tarefas)

Quando filtros estão aplicados E drawer fechado, mostrar barra de chips:

```
Filtros: [Status: A Fazer ×] [Responsável: Nilton ×] [Urgente ×]  [Limpar tudo]
```

Cada chip é um `<button>` com `×` que remove só aquele filtro. "Limpar tudo" remove todos.

---

## 4. Comportamento Real-Time

| Interação | Atualização da lista |
|---|---|
| Click em checkbox | Imediato (sem debounce) — toggle visual + re-filter |
| Digitar em "Buscar responsável" | Debounce 150ms — só filtra a lista do drawer, não a tarefas |
| Selecionar data range | Debounce 300ms (espera ambos os campos) |
| Click em atalho ("Esta semana") | Imediato, preenche os date pickers |
| "Aplicar" | **Não é necessário** — apenas fecha o drawer; toda mudança já foi aplicada |
| "Limpar" (por seção) | Imediato |
| "Limpar tudo" | Imediato + confirmação se > 3 filtros ativos: "Limpar todos os 5 filtros?" |

**Lógica de combinação:**
- Dentro da mesma dimensão (ex.: Status): **OR** ("A Fazer" OU "Bloqueada").
- Entre dimensões: **AND** (Status=AFazer **E** Responsável=Nilton **E** Urgente).
- Padrão Linear/Asana — mental model familiar.

**Contagens (números entre parênteses):**
- São **dinâmicas**, refletem quantas tarefas restariam se aquela opção fosse adicionada ao filtro atual.
- Opções com contagem `0` ficam visualmente desabilitadas (`opacity-40 cursor-not-allowed`) mas ainda clicáveis (caso queira limpar outros filtros).

---

## 5. Filtros Salvos

### Criar
- Botão `[+ Salvar]` no topo do drawer (visível só quando há ≥ 1 filtro ativo).
- Abre mini-prompt inline: "Nome deste filtro: [___________] [Salvar] [Cancelar]".
- Validação: nome obrigatório, máx 40 chars, único por usuário.
- Persistência: `localStorage` v1 → migrar para Supabase em v2 (sincroniza entre devices).

### Usar
- Filtros salvos aparecem como chips no topo do drawer.
- Click aplica todos os filtros daquele preset (substituindo os ativos? ou somando?).
- [AUTO-DECISION] Click **substitui** filtros ativos → reduz confusão; se quiser somar, basta editar depois (reason: comportamento padrão em Linear/Notion, evita "filtros frankenstein" inesperados).

### Gerenciar
- Hover no chip mostra `×` para deletar.
- Long-press / right-click → menu: Renomear, Duplicar, Deletar.

---

## 6. Estados do Componente

| Estado | Visual | Comportamento |
|---|---|---|
| `closed` | Botão "Filtros" no workspace | — |
| `closed-with-active` | Botão verde com badge "(3)" | Mostra barra de chips acima da lista |
| `open` | Drawer slide-in da direita 240ms | Foco no primeiro checkbox de Status |
| `searching` (busca interna no drawer) | Lista filtrada do select; "Nenhum responsável encontrado" se vazio | — |
| `no-results` (filtros muito restritivos) | Lista de tarefas vazia + ilustração + texto: "Nenhuma tarefa corresponde aos filtros. [Limpar tudo]" | Botão sugere ajuste |
| `saving-filter` | Input expandido com botões Salvar/Cancelar | Validação inline |
| `error-saving` | Toast: "Não conseguimos salvar o filtro. Tente novamente." | — |

---

## 7. Props (contrato sugerido)

```ts
type FilterPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // dados base para construir as opções e contagens
  tasks: TaskItem[];
  employees: { id: string; name: string }[];
  projects: { id: number; name: string }[];

  // estado controlado
  filters: TaskFilters;
  onFiltersChange: (next: TaskFilters) => void;

  // filtros salvos
  savedFilters: SavedFilter[];
  onSaveFilter: (name: string, filters: TaskFilters) => Promise<void>;
  onDeleteSavedFilter: (id: string) => Promise<void>;
};

type TaskFilters = {
  status: TaskStatus[];           // [] = todos
  assignees: string[];            // ids
  projects: string[];             // ids ou nomes
  priorities: ("Urgente" | "Alta" | "Média" | "Baixa")[];
  dueFrom?: string;               // ISO YYYY-MM-DD
  dueTo?: string;                 // ISO YYYY-MM-DD
  noDueDate?: boolean;            // atalho "Sem prazo"
};

type SavedFilter = {
  id: string;
  name: string;
  filters: TaskFilters;
  createdAt: string;
};
```

---

## 8. Lógica de Filtragem (pseudocódigo)

```ts
function applyFilters(tasks: TaskItem[], f: TaskFilters): TaskItem[] {
  return tasks.filter((t) => {
    if (f.status.length && !f.status.includes(t.status)) return false;
    if (f.assignees.length && !f.assignees.includes(t.assignee)) return false;
    if (f.projects.length && !f.projects.includes(t.project)) return false;
    if (f.priorities.length && !f.priorities.includes(t.priority)) return false;
    if (f.noDueDate && t.due) return false;
    if (f.dueFrom && (!t.due || t.due < f.dueFrom)) return false;
    if (f.dueTo && (!t.due || t.due > f.dueTo)) return false;
    return true;
  });
}
```

**Performance:** memoizar com `useMemo([tasks, filters])`. Para > 1000 tarefas considerar mover para Web Worker; hoje (~50 tarefas) não é problema.

---

## 9. Integração com TasksWorkspace

```tsx
// Em tasks-workspace.tsx:
const [filterOpen, setFilterOpen] = useState(false);
const [filters, setFilters] = useState<TaskFilters>(emptyFilters);
const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(loadFromLocalStorage());

const filteredTasks = useMemo(() => applyFilters(tasks, filters), [tasks, filters]);
const activeCount = countActiveFilters(filters);

// Botão Filtros (substitui linha 54 atual):
<button
  onClick={() => setFilterOpen(true)}
  className={`flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold ${
    activeCount > 0
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
      : "border border-[var(--border)] bg-white"
  }`}
>
  <SlidersHorizontal className="size-4" />
  Filtros
  {activeCount > 0 && <span className="ml-1 rounded-full bg-emerald-600 px-1.5 text-[10px] text-white">{activeCount}</span>}
</button>

// Barra de chips acima da lista (quando activeCount > 0):
{activeCount > 0 && <ActiveFilterChips filters={filters} onChange={setFilters} />}

// Lista usa filteredTasks ao invés de tasks:
{filteredTasks.map(...)}

// Drawer:
<FilterPanel
  open={filterOpen}
  onOpenChange={setFilterOpen}
  tasks={tasks}
  employees={employees}
  projects={projects}
  filters={filters}
  onFiltersChange={setFilters}
  savedFilters={savedFilters}
  onSaveFilter={async (name, f) => { /* localStorage v1 */ }}
  onDeleteSavedFilter={async (id) => { /* ... */ }}
/>
```

**Importante:** o `filteredTasks` também é o que alimenta o `CalendarView` e o kanban. Filtro é global — uma fonte de verdade.

---

## 10. URL Sync (shareable filters)

Sincronizar `filters` com `searchParams` da URL:
- `?status=A_Fazer,Urgente&assignee=nilton,carol&priority=Urgente&dueFrom=2026-06-20`
- Usa `useSearchParams` do Next.js + `router.replace` (não `push`, para não poluir history).
- Ao carregar a página com URL com filtros, hidrata o estado.
- Botão "Copiar link com filtros" no rodapé do drawer (v2).

---

## 11. Acessibilidade (WCAG 2.1 AA)

- **Drawer:** `role="dialog"` + `aria-modal="false"` (não-bloqueante — usuário pode interagir com a lista mesmo com drawer aberto), `aria-labelledby` para o título "Filtros".
- **Esc:** fecha drawer.
- **Focus trap:** **NÃO** trap (drawer não-modal). Tab cicla naturalmente.
- **Foco inicial:** primeiro checkbox de Status.
- **Foco de retorno:** botão "Filtros" que originou.
- **Checkboxes:** `<input type="checkbox">` nativo com `<label>` associado. `aria-describedby` para o contador "(15)".
- **Grupos:** cada seção é `<fieldset>` com `<legend>` (visualmente como heading mas semanticamente correto).
- **Busca dentro de seção (responsável/projeto):** `role="searchbox"` + `aria-label="Buscar responsável"`.
- **Atalhos de data:** `<button>` reais, não divs.
- **Anúncios live:** contador "Mostrando X de Y tarefas" em `aria-live="polite"` — leitor de tela informa mudança após cada filtro aplicado.
- **Chips removíveis:** botões com `aria-label="Remover filtro Status: A Fazer"`.
- **Filtros salvos:** lista navegável por teclado; `Enter` aplica, `Delete` remove (com confirm).
- **Contraste:** badge verde no botão Filtros — testar `bg-emerald-600` com texto branco em fundo verde claro do botão pai. Ajustar para `bg-emerald-700` se necessário.
- **Reduced motion:** desabilitar animação do drawer slide.

---

## 12. Mobile / Responsive

- < 768px: drawer ocupa tela inteira, com header sticky de fechar.
- Date pickers: `type="date"` nativo (melhor em mobile).
- Touch targets: `min-h-[44px]` em todos os checkboxes.
- Chips de filtros ativos: horizontal scroll no mobile.

---

## 13. Open Questions

1. **Filtros por tag/label?** — Schema atual não tem tags em tasks. v2.
2. **Filtro "Sem responsável"?** — Adicionar como opção especial no select Responsável. Considerar v1.
3. **Operadores avançados ("não é", "contém")?** — Out of scope. v3.
4. **Filtros compartilhados entre time?** — v2 quando migrar para Supabase.
5. **Histórico de filtros recentes?** — v2.

---

## 14. Métricas de UX

- % de sessões que usam filtros (alvo: > 40% após 30 dias).
- Filtros mais usados (instrumentar para informar defaults).
- Quantidade média de filtros aplicados por sessão.
- Taxa de criação de "filtros salvos" (sinal de power user).
- Tempo entre abrir drawer e fechar (alvo: < 12s para combinação típica).
