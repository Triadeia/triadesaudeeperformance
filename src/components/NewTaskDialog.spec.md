# NewTaskDialog — UX Specification

> Modal/Dialog para criação rápida de tarefas a partir do `TasksWorkspace`.
> Status: **Spec-only** (sem implementação ainda).

---

## 1. Propósito & Critério de Sucesso

**Job-to-be-done:** "Quando estou no painel de tarefas e penso em algo que precisa ser feito, quero capturar a tarefa em menos de 15 segundos, sem perder meu contexto visual da lista/kanban."

**Definition of done (UX):**
- Usuário cria tarefa válida em ≤ 3 passos (abrir → preencher título → criar).
- Modal fecha automaticamente após sucesso e a nova tarefa aparece no topo da lista com micro-animação de inserção.
- Erros de validação são inline, em pt-BR, próximos ao campo, e não bloqueiam navegação por teclado.
- Tecla `Esc` fecha; `Cmd/Ctrl + Enter` envia.

---

## 2. Trigger & Entrada

| Origem | Componente | Comportamento |
|---|---|---|
| Botão `"+ Nova tarefa"` no topo do `TasksWorkspace` (linha 55 atual) | `<button>` verde `bg-emerald-600` | Abre dialog centralizado com `<NewTaskDialog open={true} />` |
| Atalho global | `N` (quando workspace tem foco) | Mesmo efeito |
| Chat de comando | "Crie tarefa..." | API resolve sem abrir dialog (fluxo já existente, não conflita) |

---

## 3. Wireframe (ASCII)

```
+------------------------------------------------------------------+
|  [escuro 60% — overlay com blur sutil]                           |
|                                                                  |
|   +--------------------------------------------------------+     |
|   |  Nova tarefa                                       [x] |     |
|   |  Capture rapidamente e organize depois.                |     |
|   +--------------------------------------------------------+     |
|   |                                                        |     |
|   |  Título *                                              |     |
|   |  [ Ex.: Revisar promessa da oferta 2026          ]     |     |
|   |                                                        |     |
|   |  Descrição                                             |     |
|   |  [ Detalhes, links, próximos passos...           ]     |     |
|   |  [                                                ]     |     |
|   |  [                                                ]     |     |
|   |                                                        |     |
|   |  +------------------+  +-----------------------+       |     |
|   |  | Responsável      |  | Prazo                 |       |     |
|   |  | [▼ Selecionar  ] |  | [📅 dd/mm/aaaa      ] |       |     |
|   |  +------------------+  +-----------------------+       |     |
|   |                                                        |     |
|   |  +------------------+  +-----------------------+       |     |
|   |  | Projeto          |  | Área                  |       |     |
|   |  | [▼ Selecionar  ] |  | [▼ Selecionar       ] |       |     |
|   |  +------------------+  +-----------------------+       |     |
|   |                                                        |     |
|   |  Prioridade                                            |     |
|   |  ( ) Baixa  ( ) Média  (•) Alta  ( ) Urgente           |     |
|   |                                                        |     |
|   +--------------------------------------------------------+     |
|   |                       [ Cancelar ]   [ Criar tarefa ]  |     |
|   +--------------------------------------------------------+     |
|                                                                  |
+------------------------------------------------------------------+
```

**Dimensões:**
- Largura: `max-w-[560px]`, padding `p-6`, raio `rounded-[1.5rem]` (harmoniza com cards do projeto).
- Sticky footer separado por `border-t border-[var(--border)]`.
- Spacing vertical entre grupos: `gap-4`.

**Cores (Design System existente):**
- Fundo dialog: `bg-white` (light) / `bg-[var(--navy)]` (dark futuro).
- Botão primário: `bg-emerald-600 text-white hover:bg-emerald-700`.
- Botão secundário: `border border-[var(--border)] bg-white`.
- Foco: `outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30`.

---

## 4. Estados do Componente

| Estado | Visual | Comportamento |
|---|---|---|
| `closed` | Dialog não renderiza no DOM | — |
| `open` | Overlay + dialog com fade-in 150ms; foco automático no campo Título | Body com `overflow:hidden` |
| `validating` | Botão "Criar tarefa" desabilitado quando título vazio | Mensagens inline aparecem em `aria-live="polite"` |
| `submitting` | Botão "Criar tarefa" mostra spinner + texto "Criando..." | Campos ficam `disabled` (não readonly) |
| `error` | Banner `bg-red-50 text-red-700` no topo do form | Foco volta ao Título; mantém valores digitados |
| `success` | Dialog fecha em 200ms; toast verde no canto inferior direito: "Tarefa criada" | Nova task inserida no topo da lista |

---

## 5. Props (contrato sugerido)

```ts
type NewTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // dados para popular selects (vêm do server / fallbackTasks)
  assignees: { id: string; name: string }[];
  projects: { id: number; name: string }[];
  areas: string[];                       // derivado de tasks.area
  // valores opcionais para pré-preenchimento (ex.: criar a partir de um projeto)
  defaults?: Partial<{
    project: string;
    area: string;
    assignee: string;
    priority: "Baixa" | "Média" | "Alta" | "Urgente";
  }>;
  onSubmit: (payload: NewTaskPayload) => Promise<{ ok: boolean; error?: string; task?: TaskItem }>;
};

type NewTaskPayload = {
  title: string;            // obrigatório, trim, 3-140 chars
  description?: string;     // 0-2000 chars
  assignee?: string;        // id de employees
  due?: string;             // ISO "YYYY-MM-DD"
  project?: string;
  area?: string;
  priority: "Baixa" | "Média" | "Alta" | "Urgente"; // default "Média"
};
```

---

## 6. Validação

| Regra | Mensagem inline (pt-BR) |
|---|---|
| Título vazio (ao tentar submeter) | "Dê um título à tarefa antes de criar." |
| Título < 3 caracteres | "O título precisa ter pelo menos 3 caracteres." |
| Título > 140 | "O título ficou longo. Tente resumir em até 140 caracteres." |
| Prazo no passado | "O prazo precisa ser hoje ou no futuro." |
| Erro de servidor | Banner: "Não conseguimos criar a tarefa. Tente novamente em instantes." |

Validação dispara **on blur** (sutil) e **on submit** (bloqueante). Nunca on change — evita ansiedade.

---

## 7. Integração com TasksWorkspace

```tsx
// Em tasks-workspace.tsx, substituir o botão atual (linha 55) por:
<button onClick={() => setDialogOpen(true)} className="ml-auto flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white">
  <Plus className="size-4" /> Nova tarefa
</button>

<NewTaskDialog
  open={dialogOpen}
  onOpenChange={setDialogOpen}
  assignees={employees}
  projects={projects}
  areas={uniqueAreas}
  onSubmit={async (payload) => {
    const res = await fetch("/api/tasks", { method: "POST", body: JSON.stringify(payload) });
    const data = await res.json();
    if (res.ok) {
      setTasks((current) => [data.task, ...current]); // mesma lógica do runCommand
      return { ok: true, task: data.task };
    }
    return { ok: false, error: data.error };
  }}
/>
```

**Importante:** o fluxo do `runCommand` (chat de comando) já cria task otimisticamente. O `NewTaskDialog` deve usar o **mesmo endpoint** `/api/tasks` para garantir consistência.

---

## 8. Acessibilidade (WCAG 2.1 AA)

- **Role:** `role="dialog"` + `aria-modal="true"` + `aria-labelledby` apontando para o `<h2>` do título.
- **Focus trap:** foco fica preso dentro do dialog enquanto aberto. `Tab` cicla entre campos; `Shift+Tab` volta.
- **Foco inicial:** campo Título.
- **Foco de retorno:** ao fechar, foco volta ao botão "+ Nova tarefa" que originou.
- **Esc:** fecha dialog (com confirmação se houver dados não salvos — diff opcional v2).
- **Cmd/Ctrl + Enter:** submete formulário.
- **Labels:** todo `<input>` / `<select>` tem `<label>` visível (não placeholder-as-label).
- **Erros:** `aria-invalid="true"` + `aria-describedby` apontando para mensagem.
- **Required:** `aria-required="true"` no Título; asterisco visual `*` ao lado do label.
- **Date picker:** input nativo `type="date"` por padrão (sem dependency); fallback texto `dd/mm/aaaa`.
- **Select:** preferir `<select>` nativo em mobile; em desktop, Combobox custom só se necessidade real (autocomplete de responsável > 10 itens).
- **Contraste:** todos os pares de cor devem atingir 4.5:1 mínimo. Verde `emerald-600` no branco passa em texto bold.
- **Screen reader:** ao submeter com sucesso, anunciar via `aria-live="polite"`: "Tarefa criada com sucesso."

---

## 9. Open Questions (para próxima iteração)

1. **Rascunho automático?** Salvar título em `localStorage` se usuário fechar acidentalmente? — Recomendo v2.
2. **Anexos?** Upload de arquivo no momento da criação? — Fora de escopo desta v1.
3. **Tarefas recorrentes?** — v2.
4. **Sub-tarefas?** — v2, após decisão do schema.

---

## 10. Métricas de UX para acompanhar

- Tempo médio entre abrir e submeter (alvo: ≤ 15s).
- Taxa de abandono (abrir e fechar sem criar) — esperado < 20%.
- % tarefas criadas via dialog vs. chat de comando.
