# DESIGN REVIEW MEGA — Reuniões (painel-triade)

> **Mission:** Design Audit da feature "Reuniões" contra o Design System Triade (navy + emerald + slate).
> **Chief:** @design-chief → **Specialist:** @brad-frost (Atomic Design / Design Systems)
> **Date:** 2026-06-23
> **Scope:** Sidebar, Header, MeetingsList, MeetingDetail, TranscribeStatus, AIAnalysisPanel, GoogleDriveConnect, Modal NovaMeeting
> **Reference target:** `https://painel-triade.vercel.app/app/tarefas` (404 sem auth — review feito contra o código-fonte de `TaskList` + `NewTaskDialog`)
> **DS source-of-truth:** `src/app/globals.css` (tokens OKLCH + classes utilitárias `.panel`, `.topbar`, `.sidebar-*`)

---

## 1. SCOREBOARD — Veredicto Visual

| # | Componente | Arquivo | Veredicto | Nota |
|---|---|---|---|---|
| 1 | **Sidebar** (aba Reuniões) | `src/components/app-shell.tsx` | **PASS** | 9.0 / 10 |
| 2 | **Header / Topbar** | `src/components/app-shell.tsx` | **PASS** | 8.5 / 10 |
| 3 | **MeetingsList** | `src/app/app/reunioes/page.tsx` | **CONCERNS** | 6.5 / 10 |
| 4 | **MeetingDetail (Workspace)** | `src/components/meeting-workspace.tsx` | **CONCERNS** | 6.0 / 10 |
| 5 | **TranscribeStatus** | _AUSENTE_ | **FAIL** | — |
| 6 | **AIAnalysisPanel** | _Embutido em MeetingWorkspace (`ListPanel`)_ | **CONCERNS** | 5.5 / 10 |
| 7 | **GoogleDriveConnect** | _AUSENTE_ (apenas input genérico) | **FAIL** | — |
| 8 | **Modal NovaMeeting** | _AUSENTE_ (botão `Nova reunião` sem handler) | **FAIL** | — |

**Pontuação consolidada da feature: 5.2 / 10 → GATEKEEP: `CONCERNS` (com 3 `FAIL` em componentes ausentes).**

> Resumo executivo: o esqueleto navegacional (Sidebar/Header) está **coerente** com o DS. Porém, o fluxo de Reuniões está **incompleto** em relação ao escopo solicitado e o que existe usa **classes hard-coded em vez de tokens** em pontos críticos (botões CTA, navy, bordas, badges de status).

---

## 2. CHECKLIST CONSOLIDADO

| Critério | Sidebar | Header | List | Detail | Transc. | AI Panel | GDrive | Modal |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **Cores via tokens** (`--navy`, `--primary`, `--border`) | OK | OK | PARCIAL | PARCIAL | — | FALHA | — | — |
| **Tipografia consistente** (`.font-heading`, hierarquia) | OK | OK | OK | OK | — | OK | — | — |
| **Espaçamento múltiplo de 4px** | OK | OK | OK | OK | — | OK | — | — |
| **Bordas `rounded-xl` / `rounded-2xl`** coesas | OK | OK | MISTO | MISTO | — | MISTO | — | — |
| **Sombras `shadow-sm`/`shadow-md`** | OK | OK | N/A | N/A | — | N/A | — | — |
| **Ícones `lucide-react` size-4/5/6** | OK (size-18px atípico) | OK | OK | OK | — | size-2 dot ad-hoc | — | — |
| **Buttons**: CTA emerald-600 / Secondary border / Ghost | OK | OK | INCONS. | INCONS. | — | — | — | — |
| **Estados** hover/focus/active/disabled | OK | OK | PARCIAL (só hover) | PARCIAL (só disabled) | — | AUSENTE | — | — |
| **Responsivo** 320 / 680 / 1024 / 1440 | OK | OK | OK | PARCIAL | — | OK | — | — |
| **WCAG AA** (contraste, labels, kbd) | PARCIAL | FALHA (search sem label) | PARCIAL (Link sem `aria-label`) | PARCIAL (tabs sem `role="tablist"`) | — | PARCIAL | — | — |
| **Transições 200ms** | OK | OK | AUSENTE (`hover:bg`) | AUSENTE | — | AUSENTE | — | — |
| **Loading / skeleton** | N/A | N/A | AUSENTE | TEXTUAL ("Processando...") | AUSENTE | AUSENTE | — | — |

Legenda: **OK** = aprovado · **PARCIAL** = aceitável com ressalvas · **INCONS./MISTO** = inconsistência menor · **FALHA** = bloqueante · **AUSENTE** = não implementado · **N/A** = não aplicável.

---

## 3. ACHADOS POR COMPONENTE

### 3.1 Sidebar (`app-shell.tsx:29-113`) — PASS 9.0

**O que está certo**
- A entrada `"Reuniões"` foi adicionada no grupo `"Operação"` com o ícone `CalendarDays` da Lucide — semanticamente correto (`L34`).
- Estado `is-active` usa `var(--primary)` + `box-shadow` derivada de `color-mix` (`globals.css:200-204`) — **excelente uso de tokens**.
- Hover usa `color-mix(in oklch, var(--sidebar-foreground) 8%, transparent)` — respeita o sistema OKLCH.
- Grupo nav já tem `aria-label="Navegação principal"`.

**Concerns (não-bloqueantes)**
- `c1` — `<item.icon className="size-[18px]" />` (L90): tamanho arbitrário fora da escala `size-4/5/6` declarada no DS. **Recomendo `size-5` (20px) ou `size-4` (16px)**.
- `c2` — A logo `<img>` (L68) **não tem `alt` semântico** (`alt=""`) e não usa `next/image` — perde otimização e zera leitura para SR. Se decorativa, OK; se identificadora, precisa `alt="Triade TSP"`.

---

### 3.2 Header / Topbar (`app-shell.tsx:115-129`) — PASS 8.5

**O que está certo**
- `.topbar` class encapsula `background-image`, `border`, `box-shadow` e `backdrop-filter` em CSS (`globals.css:211-218`) — perfeitamente alinhado ao DS.
- Botão mobile menu (`Menu`) tem `aria-label="Abrir menu"`.

**Concerns**
- `c3` — **Input de busca não tem `<label>` nem `aria-label`** (L121). Falha WCAG 2.1 - 1.3.1 / 4.1.2. **Fix:** `<label className="sr-only" htmlFor="topbar-search">Buscar</label>` + `id="topbar-search"`.
- `c4` — `<span className="hidden text-sm font-semibold md:block">{user.name}</span>` (L126) está duplicado com o card de conta na sidebar — verificar se intencional.
- `c5` — Para o novo menu item de Reuniões: **não há novo item no header** (escopo pedia "novo menu item"). Header atualmente é genérico — verificar se a intenção era adicionar uma ação rápida tipo `+ Nova Reunião` na topbar, ou se isso vive apenas na page.

---

### 3.3 MeetingsList (`src/app/app/reunioes/page.tsx`) — CONCERNS 6.5

**O que está certo**
- Usa `PageHeader`, `Badge`, `.panel` — composição com primitives do DS.
- Grid responsivo `grid-cols-[1fr_auto]` → `sm:grid-cols-[1.5fr_0.7fr_0.7fr_auto]`.
- Estado processado/pendente via `Badge` com tons `green`/`amber`.

**Concerns / Inconsistências vs. TaskList (`TaskList.tsx`)**
- `c6` — **Botão `Nova reunião` (L14) usa `bg-[var(--navy)]` puro**, enquanto o padrão CTA do DS é **`bg-emerald-600`** (ver `NewTaskDialog.tsx:277`, `meeting-workspace.tsx:67`). **Inconsistência tonal direta com o `Salvar` da TaskList**. Recomendação: padronizar — **navy = ação neutra/secundária; emerald = CTA primário**. Aqui "Nova reunião" é CTA primário → **deveria ser emerald-600**.
- `c7` — `<Link>` para detalhe da reunião **sem `aria-label`** descrevendo o destino (apenas inner text). Para leitores de tela em modo "lista de links", fica `meeting.title + Badge.status` sem contexto.
- `c8` — `hover:bg-emerald-50/30` — bonito, mas **sem `transition`**. Fica "instantâneo". Adicionar `transition-colors duration-200`.
- `c9` — **Sem estado `loading` nem skeleton** durante `await getMeetings()`. Como é Server Component, isso depende de `loading.tsx` adjacente — verificar se existe `src/app/app/reunioes/loading.tsx`. **FAIL silencioso** se ausente.
- `c10` — **Sem estado vazio**. Se `meetings.length === 0`, renderiza o painel com apenas o header de colunas. Comparar com `TaskList.tsx:17-23` que tem empty state explícito.
- `c11` — Bordas misturadas: `.panel` usa `border-radius: 1.15rem` (~18px) enquanto o botão tem `rounded-xl` (12px) e o `Badge` é `rounded-full`. **Coerente** — porém o header de tabela `border-b border-[var(--border)]` está OK mas o `border-b border-slate-100` das rows (L31) **deveria ser `border-[var(--border)]`** para honrar o tema dark/navy.

---

### 3.4 MeetingDetail / MeetingWorkspace (`meeting-workspace.tsx`) — CONCERNS 6.0

**O que está certo**
- Tabs em chips com estado ativo `bg-[var(--navy)] text-white` (L73) — funciona.
- Painéis `<article className="panel p-6">` — usa o sistema.
- Notice de sucesso com `border-emerald-200 bg-emerald-50` (L71) — consistente com tokens semânticos do DS (Badge `green`).

**Concerns / Bloqueios**

- `c12` — **Tabs sem ARIA `role="tablist" / role="tab" / aria-selected / aria-controls`** (L72-74). Falha WCAG 2.1 - 4.1.2 + falha de pattern Tabs. Para feature que mostra Transcrição/Decisões/Riscos isso é crítico — usuários de teclado e SR ficarão presos.
- `c13` — `tab === "Visão Geral"` etc. comparado por **string em pt-BR como chave** (L76, 90, 97). Frágil a typo / i18n. Deveria ser enum/const tipado.
- `c14` — Dois CTAs no header da página (L67-68): **um emerald-600** ("Gerar inteligência") e **um `bg-[var(--navy)]`** ("Gerar tarefas"). Sem hierarquia visual clara entre eles — ambos parecem primários. Sugestão: **emerald = primary**, **navy outline ou ghost = secondary**.
- `c15` — **`<textarea>` (L92) e `<input>` (L93, 101) sem `<label>` associada nem `aria-label`**. Apenas `placeholder`. WCAG fail.
- `c16` — **Loading state textual** (`"Processando..."` / `"Salvando transcrição"`). Falta spinner consistente. O DS não declara um spinner padrão — **lacuna do sistema**.
- `c17` — **Sem `useTransition` / disabled visual além de `opacity-60`**. Para fetch que pode demorar 30s+ (transcrição/IA), o usuário precisa de feedback visual mais robusto (skeleton no painel de resultado, barra de progresso).
- `c18` — `border border-[var(--border)]` no `<textarea>` e `<input>` — OK. Mas o foco `focus:border-emerald-400` (L92) usa **emerald-400**, enquanto `NewTaskDialog.tsx:326` usa **emerald-500 + ring emerald-500/20**. **Inconsistência de foco entre forms**.
- `c19` — `<button className="rounded-xl bg-emerald-600 px-4 py-2.5 ...">` (L93) — `py-2.5` (10px) é altura ad-hoc; o sistema usa `h-10`/`h-11` (40/44px) nos outros CTAs. **Padronizar `h-10`**.
- `c20` — `meeting.date` e `meeting.time` exibidos como string raw (L64). Sem `<time dateTime="...">`. Acessibilidade/SEO menor.
- `c21` — `ListPanel` colore o dot com `bg-emerald-500` / `bg-red-500` / `bg-blue-500` **hard-coded** (L111). Deveria mapear para tokens semânticos (`--primary`, `--destructive`, `--blue` já existem em `globals.css:36,47`).
- `c22` — Tab "Chat da Reunião" (L97-103): bubble do bot `bg-slate-100` hard-coded — em dark/navy theme passa pelo "bridge" CSS (`globals.css:350-354`), funciona, mas é frágil. **Preferir `surface-soft` ou `bg-muted`**.
- `c23` — `tabs` array (L22) inclui 9 abas e em mobile vira `overflow-x-auto` (L72). Funciona, mas **sem indicador de scroll** (gradient fade nas bordas). UX 320px sofre.

---

### 3.5 TranscribeStatus — **FAIL (AUSENTE)**

Não existe componente `TranscribeStatus` no codebase (verificado via grep recursivo). O feedback de transcrição hoje é apenas o `setNotice(...)` textual em `meeting-workspace.tsx:39`.

**Requisitos do DS para criação:**
- Estados: `idle`, `uploading`, `transcribing`, `done`, `error`.
- Spinner: criar `<Spinner size="sm|md" />` padrão (lacuna do DS — pedir a @brad-frost para tokenizar).
- Progress bar: `bg-muted` track + `bg-primary` fill, `rounded-full`, `h-1.5`.
- Wrapper: `.panel p-5` + `flex items-center gap-3`.
- A11y: `role="status" aria-live="polite"`.

---

### 3.6 AIAnalysisPanel — CONCERNS 5.5 (embutido como `ListPanel` em `meeting-workspace.tsx:110-113`)

`ListPanel` é o que mais se aproxima do que o briefing chama de "AIAnalysisPanel" (cards de Decisions/Risks/Opportunities).

**Concerns**
- `c24` — **Não é um componente extraído** — vive no mesmo arquivo, sem reuso. Para uma feature de IA com múltiplas categorias (decisões, riscos, oportunidades, ações), deveria ser **um componente próprio em `src/components/meetings/AIAnalysisPanel.tsx`** com props tipadas (`category`, `items`, `tone`, `aiConfidence?`).
- `c25` — Não exibe **metadados de IA**: confiança do modelo, modelo usado, timestamp da análise, custo. Recomendação cara-pra-IA: pequeno chip `bg-emerald-50` no canto com "IA · 92% confiança".
- `c26` — Não tem **ação contextual** (ex.: "Converter em tarefa" no item de Decisão, "Atribuir owner" no Risco). Briefing pedia "actions" — está faltando o **call-to-action por item**.
- `c27` — Tom `blue` definido (L111) mas `blue` não está como token semântico CSS — `var(--blue)` existe em `globals.css:47` mas o componente usa `bg-blue-500` Tailwind. **Não usa o token**.

---

### 3.7 GoogleDriveConnect — **FAIL (AUSENTE)**

O `meeting-workspace.tsx:93` tem um `<input placeholder="https://docs.google.com/..." />` + botão "Tentar importar" — **isso não é OAuth, é colagem de URL pública**. Briefing pediu um **OAuth button** real.

**Requisitos do DS para criação:**
- Botão padrão Google: ícone Google oficial + `Conectar Google Drive` em branco com border-slate-200.
- Estados: `disconnected` (CTA), `connecting` (spinner), `connected` (badge verde + email + botão "Desconectar" ghost).
- Wrapper `.panel p-4 flex items-center justify-between`.
- A11y: `aria-describedby` com explicação do escopo OAuth solicitado.
- Tokens: usar `var(--card)` + `var(--border)`; **não usar branco hard-coded**.

---

### 3.8 Modal NovaMeeting — **FAIL (AUSENTE)**

O botão `<button>Nova reunião</button>` em `reunioes/page.tsx:14` **não tem `onClick` nem dialog associado**. Em compensação, `NewTaskDialog.tsx` é uma **referência de ouro**: focus trap, ESC handler, validação Zod, `role="dialog" aria-modal="true"`, focus-trap manual, datalists.

**Recomendação direta:** clonar `NewTaskDialog.tsx` para `src/components/meetings/NewMeetingDialog.tsx` com schema próprio:
- Campos: `title*`, `date*`, `time*`, `participants[]`, `tags[]`, `source` (manual/drive/upload), `description?`.
- Reutilizar `Field`, `inputClass`, `taskToInput` patterns.
- **Mesmo tom CTA emerald-600** (consistência total com tasks).

---

## 4. INCONSISTÊNCIAS SISTÊMICAS (cross-component)

Estes são padrões que precisam ser **resolvidos no DS antes de evoluir a feature** — @brad-frost owns.

| # | Inconsistência | Onde aparece | Recomendação |
|---|---|---|---|
| S1 | **CTA navy vs CTA emerald sem hierarquia** | `reunioes/page.tsx:14` (navy) vs `meeting-workspace.tsx:67` (emerald) vs `NewTaskDialog.tsx:277` (emerald) | Codificar: **emerald = primary, navy = secondary, outline border = tertiary, ghost = quaternary**. Documentar no Brandbook. |
| S2 | **Foco emerald-400 vs emerald-500** | `meeting-workspace.tsx:92` (400) vs `NewTaskDialog.tsx:326` (500) | Padronizar em **emerald-500 + ring emerald-500/20**. |
| S3 | **Altura de botão inconsistente** | `h-10`, `h-11`, `py-2.5` espalhados | Tokenizar: `--btn-h-sm: 32px / --btn-h-md: 40px / --btn-h-lg: 44px`. |
| S4 | **Sem `<Button>` primitive aplicado** | `ui/button.tsx` existe (`base-ui`) mas **NÃO é usado** em `reunioes/page.tsx`, `meeting-workspace.tsx`, `app-shell.tsx`. Tudo é `<button className="...">` ad-hoc | **Adotar `<Button variant="..." size="...">`** em toda a feature — Atomic Design fail. |
| S5 | **Borda `border-slate-100` hard-coded** | `reunioes/page.tsx:31`, `TaskList.tsx:37` | Substituir por `border-[var(--border)]`. O "theme bridge" salva em dark/navy mas é compensação, não padrão. |
| S6 | **Tons `bg-emerald-500` / `bg-red-500` / `bg-blue-500` hard-coded** | `meeting-workspace.tsx:111`, badges em `page-parts.tsx` parcialmente | Mapear para tokens `var(--primary)`, `var(--destructive)`, `var(--blue)`. |
| S7 | **Spinner / Skeleton ausentes no DS** | Todos os componentes async | Criar primitives `<Spinner>` e `<Skeleton>` em `ui/`. |
| S8 | **Tabs sem padrão acessível** | `meeting-workspace.tsx:72` | Adotar `@base-ui/react/tabs` (já está no projeto) ou Radix Tabs. |
| S9 | **Forms sem `<label>`** | `meeting-workspace.tsx:92,93,101`, `app-shell.tsx:121` | Adicionar `<label className="sr-only">` ou `aria-label` obrigatório. |
| S10 | **Transições inconsistentes** | Alguns têm `transition`, outros não | Estabelecer: **toda interação visual = `transition-colors duration-200`** mínimo. |

---

## 5. RECOMENDAÇÕES PRIORIZADAS (top 10 para sprint)

| Prioridade | Item | Esforço | Impacto |
|---|---|---|---|
| **P0** | Criar `NewMeetingDialog` (clone de `NewTaskDialog`) | M | desbloqueia "Nova reunião" |
| **P0** | Trocar CTA `Nova reunião` para `bg-emerald-600` | XS | consistência primária |
| **P0** | Adicionar `<label>` / `aria-label` em todos inputs/textareas | S | WCAG bloqueante |
| **P0** | Implementar `loading.tsx` em `reunioes/` + empty state | S | UX bloqueante |
| **P1** | Refatorar tabs com `@base-ui/react/tabs` (a11y completa) | M | WCAG + UX |
| **P1** | Extrair `AIAnalysisPanel` para componente próprio + ações por item | M | reuso + valor de produto |
| **P1** | Criar primitives `<Spinner>` e `<Skeleton>` no DS | M | desbloqueia P2 |
| **P1** | Implementar `TranscribeStatus` com `aria-live` | M | UX async |
| **P2** | Substituir todos `border-slate-100` por `var(--border)` | XS | dark/navy fidelity |
| **P2** | Padronizar foco `emerald-500 + ring-500/20` em forms | XS | consistência |

---

## 6. GATEKEEP FINAL

```
┌─────────────────────────────────────────────────┐
│  FEATURE: Reuniões (painel-triade)              │
│  STATUS:  CONCERNS  (com 3 FAIL de ausência)    │
│  SCORE:   5.2 / 10                              │
│                                                 │
│  PASS:     Sidebar (9.0), Header (8.5)          │
│  CONCERNS: MeetingsList (6.5), MeetingDetail    │
│            (6.0), AIAnalysisPanel (5.5)         │
│  FAIL:     TranscribeStatus, GoogleDriveConnect,│
│            Modal NovaMeeting (não implementados)│
└─────────────────────────────────────────────────┘
```

**Decisão:** **NÃO LIBERAR** a feature para produção ainda. Bloqueios:
1. Três componentes do escopo **não existem** (P0).
2. Inconsistência de CTA navy vs emerald confunde a hierarquia visual (P0).
3. Forms sem labels = WCAG fail (P0).

**Recomendado:** sprint focada nos 4 itens P0 (~3 dias). Depois reabrir review.

---

## 7. HANDOFF

```
## HANDOFF: @design-chief → @brad-frost (Design Systems)

**Project:** painel-triade — Feature Reuniões
**Phase Completed:** Audit visual + acessibilidade

**Deliverables Transferred:**
- DESIGN-REVIEW-MEGA.md (este arquivo) com 8 componentes scored
- 27 concerns numerados (c1–c27)
- 10 inconsistências sistêmicas (S1–S10)
- 10 prioridades P0/P1/P2

**Context for Next Phase:**
- DS existente em globals.css é sólido (OKLCH + bridges para dark/navy).
- Pontos fracos: ausência de Spinner/Skeleton primitives, Button primitive
  subutilizado, hierarquia CTA emerald-vs-navy não documentada.
- TaskList e NewTaskDialog são "referência de ouro" — replicar padrões.

**Success Criteria:**
1. Todos P0 resolvidos.
2. Re-audit alcança PASS (≥ 8.0) em todos os 8 componentes.
3. `<Spinner>` e `<Skeleton>` adicionados ao DS e documentados no Brandbook.
4. Hierarquia CTA documentada em `documentacao/`.
```

---

_Auditoria executada por: **@design-chief** roteando para **@brad-frost** (Tier 2 — Design Systems Specialist). Metodologia: Atomic Design + WCAG 2.1 AA + token-first._
