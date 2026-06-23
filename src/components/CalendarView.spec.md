# CalendarView — UX Specification

> Visualização mensal estilo Google Calendar para tarefas com `due` preenchido.
> Status: **Spec-only** (sem implementação ainda).

---

## 1. Propósito & Critério de Sucesso

**Job-to-be-done:** "Quando preciso entender a carga de trabalho da semana/mês, quero ver as tarefas distribuídas no tempo, identificar gargalos visualmente, e mover algo para outro dia sem abrir cada tarefa."

**Definition of done (UX):**
- Calendário mensal carrega em ≤ 200ms (com até 200 tarefas no mês).
- Drag-drop entre datas funciona com feedback visual claro (preview + cursor + zona de drop highlight).
- Datas com muitas tarefas (> 3) mostram "+N mais" — clicar abre painel lateral com lista do dia.
- Atalhos: `←` `→` para navegar entre meses; `T` para "Hoje".

---

## 2. Layout & Wireframe (ASCII)

### 2.1 Header de navegação

```
+-----------------------------------------------------------------------+
|  [<]  Junho 2026  [>]   [Hoje]            [Mês ▾]   [+ Nova tarefa]   |
+-----------------------------------------------------------------------+
```

- Mês/ano em `font-heading` semibold 2xl.
- Setas: ícone `ChevronLeft`/`ChevronRight` da lucide-react (já usada).
- "Hoje": botão `outline` que volta ao mês atual e destaca o dia.
- Seletor "Mês ▾": v1 apenas Mês; v2 abre menu com Semana/Dia (placeholder visível mas desabilitado).
- "+ Nova tarefa": mesmo botão verde do workspace, abre `NewTaskDialog` com data pré-preenchida = hoje.

### 2.2 Grid mensal (6×7)

```
+--------+--------+--------+--------+--------+--------+--------+
|  SEG   |  TER   |  QUA   |  QUI   |  SEX   |  SAB   |  DOM   |
+--------+--------+--------+--------+--------+--------+--------+
|  26    |  27    |  28    |  29    |  30    |  31    |   1    |
| (mai)  | (mai)  | (mai)  | (mai)  | (mai)  | (mai)  |        |
|        |        |        |        |        |        |        |
+--------+--------+--------+--------+--------+--------+--------+
|   2    |   3    |   4    |   5    |   6    |   7    |   8    |
| ●Brand | ●Drive |        |●Doc-001|●Painel |        |        |
|        |        |        |●ICPs   |        |        |        |
+--------+--------+--------+--------+--------+--------+--------+
|   9    |  10    |  11    |  12    |  13    |  14    |  15    |
| ●Game  |        |●Onboard|        |●Oferta |        |        |
|        |        |        |        |+2 mais |        |        |
+--------+--------+--------+--------+--------+--------+--------+
|  16    |  17    |  18    |  19    |  20*[HOJE]| 21  |  22    |
|        |        |        |        |╔════════╗|     |        |
|        |        |        |        |║●Urgent ║|     |        |
|        |        |        |        |║●Painel ║|     |        |
|        |        |        |        |╚════════╝|     |        |
+--------+--------+--------+--------+--------+--------+--------+
|  23    |  24    |  25    |  26    |  27    |  28    |  29    |
|        |●Bcklog |        |        |        |        |        |
|        |+1 mais |        |        |        |        |        |
+--------+--------+--------+--------+--------+--------+--------+
|  30    |   1    |   2    |   3    |   4    |   5    |   6    |
|        | (jul)  | (jul)  | (jul)  | (jul)  | (jul)  | (jul)  |
+--------+--------+--------+--------+--------+--------+--------+
```

**Detalhes visuais:**
- Célula: `min-h-[110px]` desktop, `min-h-[80px]` tablet, lista vertical empilhada em mobile.
- Borda interna: `border border-[var(--border)]`.
- Dia atual: número em pill `bg-emerald-600 text-white rounded-full size-7 grid place-items-center`.
- Dias de outros meses: opacidade `0.4`, cor `text-slate-400`.
- Fim de semana: fundo `bg-slate-50/50` sutil.
- Tarefas dentro da célula: pílulas finas `h-5 px-2 text-[11px] rounded-md truncate` com bola de cor por prioridade:
  - Urgente: `bg-red-50 text-red-700 border-l-2 border-red-500`
  - Alta: `bg-amber-50 text-amber-700 border-l-2 border-amber-500`
  - Média: `bg-blue-50 text-blue-700 border-l-2 border-blue-500`
  - Baixa: `bg-slate-100 text-slate-600 border-l-2 border-slate-400`
- Máximo 3 visíveis por célula → demais agrupam em `+N mais` (button text-emerald-700).

### 2.3 Painel lateral do dia

Quando usuário clica em uma data (ou em "+N mais"), abre **drawer** lateral direito:

```
+------------------------------+
| 20 jun 2026 · sexta-feira [x]|
+------------------------------+
| 5 tarefas neste dia          |
|                              |
| ● Urgente                    |
|   Publicar painel na Vercel  |
|   Nilton · Painel TSP        |
|                              |
| ● Urgente                    |
|   Construir brandbook        |
|   Nilton · Brandbook TSP     |
|                              |
| ● Alta                       |
|   ...                        |
|                              |
| [+ Nova tarefa para este dia]|
+------------------------------+
```

- Largura: `w-[380px]`.
- Cada item é card clicável que abre detalhe (out-of-scope desta spec).
- Botão verde no rodapé fixo: cria task com `due` pré-preenchido.

---

## 3. Estados do Componente

| Estado | Visual | Comportamento |
|---|---|---|
| `loading` | Skeleton grid com células cinzas pulsando | Spinner não bloqueante |
| `empty` (mês sem tarefas) | Grid normal, mensagem central: "Sem tarefas com prazo em junho. Que tal definir prazos para suas tarefas em aberto?" + CTA "Ver tarefas sem prazo" | — |
| `loaded` | Grid populado | Hover em célula vazia mostra `+` para criar |
| `dragging` | Tarefa sendo arrastada fica `opacity-50`; cursor `grabbing`; células elegíveis ficam `ring-2 ring-emerald-400 bg-emerald-50/50` | Auto-scroll quando arrasta perto da borda |
| `drag-success` | Tarefa "pula" para nova célula com bounce 200ms; toast: "Prazo atualizado para 24 jun" + "Desfazer" 5s | API update otimista |
| `drag-error` | Tarefa volta para origem com shake; toast vermelho: "Não foi possível mover. Tente novamente." | Rollback |
| `day-panel-open` | Drawer entra da direita 240ms | Backdrop opcional (não bloqueante) |

---

## 4. Props (contrato sugerido)

```ts
type CalendarViewProps = {
  tasks: TaskItem[];                   // só tarefas com due válido entram no grid
  currentMonth?: Date;                 // default: new Date()
  onMonthChange?: (date: Date) => void;
  onTaskMove: (taskId: string, newDue: string) => Promise<{ ok: boolean; error?: string }>;
  onTaskClick?: (taskId: string) => void;
  onCreateForDate?: (date: Date) => void;  // abre NewTaskDialog com defaults.due
  loading?: boolean;
};
```

**Filtro core:** internamente, `tasks.filter(t => t.due && isValidDate(t.due))`. Tarefas sem prazo **não aparecem**, mas o componente expõe contador no header:
> "*8 tarefas sem prazo definido* — [Ver lista]"

---

## 5. Drag-and-drop — comportamento detalhado

1. **Início:** pointer down + delay 80ms (evita conflito com click). Cursor vira `grab` → `grabbing`.
2. **Preview:** "ghost" da pílula segue o cursor com leve rotação `-2deg` e sombra `shadow-lg`.
3. **Drop zones:** todas as células do mês visível + setas de navegação `<` `>` (ativam mudança de mês após hover de 800ms).
4. **Drop válido:** célula que aceita = qualquer data ≥ hoje (ou qualquer data se usuário tem permissão admin). Inválidas mostram cursor `not-allowed`.
5. **Drop:** API call otimista (UI atualiza imediato). Em caso de erro do servidor, reverte com toast.
6. **Cancelar:** `Esc` durante drag cancela; tecla deve estar registrada em `keydown` global enquanto `dragging`.
7. **Touch:** suporte mobile via `pointer events` (long-press 250ms inicia drag).

---

## 6. Integração com TasksWorkspace

```tsx
// Em tasks-workspace.tsx, adicionar terceiro view:
const [view, setView] = useState<"list" | "kanban" | "calendar">("list");

// O botão Calendário (linha 53) atualmente é placeholder — conectar:
<button
  onClick={() => setView("calendar")}
  className={`flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold ${
    view === "calendar" ? "bg-[var(--navy)] text-white" : "border border-[var(--border)] bg-white"
  }`}
>
  <CalendarDays className="size-4" /> Calendário
</button>

{view === "calendar" && (
  <CalendarView
    tasks={tasks}
    onTaskMove={async (taskId, newDue) => {
      // otimista
      setTasks(t => t.map(x => x.id === taskId ? { ...x, due: newDue } : x));
      const res = await fetch(`/api/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify({ due: newDue }) });
      if (!res.ok) {
        // rollback
        setTasks(initialTasks);
        return { ok: false };
      }
      return { ok: true };
    }}
    onCreateForDate={(date) => {
      setDialogDefaults({ due: date.toISOString().slice(0, 10) });
      setDialogOpen(true);
    }}
  />
)}
```

**Compartilha estado:** mesma lista `tasks` do workspace. Mudanças no calendário refletem no Lista/Kanban automaticamente.

---

## 7. Acessibilidade (WCAG 2.1 AA)

- **Role grid:** `role="grid"` no container, `role="row"` nas linhas, `role="gridcell"` nas células.
- **Headers:** dias da semana em `<th scope="col">` ou `role="columnheader"` com `aria-label="Segunda-feira"`.
- **Navegação por teclado:**
  - `←` `→` `↑` `↓` movem foco entre células.
  - `Home`/`End` vão para início/fim da semana.
  - `PageUp`/`PageDown` mudam mês.
  - `Enter` ou `Space` abre painel do dia.
  - `T` vai para hoje.
- **Drag por teclado:** célula focada com tarefa permite `Space` para "pegar"; setas movem; `Space` para "soltar"; `Esc` cancela. Anúncio em `aria-live`: "Tarefa Brandbook movida de 20 jun para 24 jun."
- **Foco visível:** ring `ring-2 ring-emerald-400 ring-offset-2`.
- **Pílulas de tarefa:** `role="button"` + `aria-label="Tarefa: Brandbook · Urgente · 20 jun"`.
- **Contraste:** todas as cores de prioridade testadas em fundo branco — passam AA. Em fundo de fim de semana, validar.
- **Drawer:** mesmo padrão do `NewTaskDialog` — focus trap, esc fecha, retorna foco para célula que originou.
- **Sem mouse:** todos os fluxos (criar, mover, abrir dia) acessíveis por teclado.
- **Redução de movimento:** se `prefers-reduced-motion`, desabilitar animações de drop e transição de mês.

---

## 8. Performance

- **Renderização:** memoizar grid por mês (`useMemo`). Mudança de mês não rerendera células fora do viewport.
- **Tasks por célula:** indexar `tasksByDate` em `useMemo({ [yyyy-mm-dd]: TaskItem[] })`.
- **Drag:** usar `transform: translate3d` para preview (GPU-accelerated). Nunca mexer em `top/left`.
- **Mobile:** considerar virtualização se mês tem > 300 tarefas (raro hoje, dado tamanho do time).

---

## 9. Open Questions

1. **Vista semana/dia em v1?** — Recomendo **só mês na v1**. Semana/Dia depois de validar uso.
2. **Tarefas multi-dia (start + end)?** — Schema atual não suporta. Fora de escopo.
3. **Cores por projeto vs. prioridade?** — Toggle no header? v2.
4. **Sincronização com Google Calendar real?** — v3.
5. **Mostrar reuniões (`meetings`) no mesmo calendário?** — Tentador, mas separa concerns. v2 com toggle.

---

## 10. Métricas de UX

- % de tarefas com prazo (alvo: subir após calendário existir — atualmente todas têm).
- Frequência de uso da view Calendário vs. Lista/Kanban.
- Taxa de uso de drag-drop (% de updates de prazo via drag vs. via edição).
- Tempo médio para "encontrar tarefa de uma data específica" (alvo: < 3s).
