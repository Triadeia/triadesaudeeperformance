# MeetingDetail — UX Specification

> Página de detalhe de uma reunião (`/app/reunioes/[id]`) com transcrição,
> análise por IA, link para Drive e ações (exportar/compartilhar).
> Substitui/expande o `MeetingWorkspace` atual (`meeting-workspace.tsx`).
> Status: **Spec-only** (sem implementação).

---

## 1. Propósito & Critério de Sucesso

**Job-to-be-done:** "Quando entro numa reunião, quero ver imediatamente o resumo executivo, navegar pela transcrição com timestamps, validar decisões e tarefas extraídas pela IA, e compartilhar o resultado com o time em PDF — tudo sem trocar de página."

**Definition of done (UX):**
- "Time-to-insight": resumo + decisões visíveis acima da dobra ≤ 1s após o load.
- Transcrição navegável com busca + jump para timestamps (se áudio existir).
- Painel de IA mostra estado em tempo real (Processando / Pronto / Erro) sem necessidade de F5.
- Exportar PDF em < 5s; share gera link público assinado (opcional, com expiração).
- Tudo acessível por teclado e leitor de tela.

---

## 2. Hierarquia / Layout

```
HEADER (sticky)
  └─ breadcrumb: Reuniões  /  {meeting.title}
  └─ Título grande + tags + (data · hora · participants)
  └─ Ações: [▶ Reprocessar IA] [📤 Compartilhar] [⬇ Exportar PDF]

TABS  (sticky abaixo do header)
  [Visão Geral] [Transcrição] [Decisões] [Tarefas] [Riscos] [Oportunidades] [Anexos] [Chat]

CONTEÚDO (muda por tab)

ASIDE direita fixa (desktop ≥ xl)
  └─ AIAnalysisPanel    (ver AIAnalysisPanel.spec.md)
  └─ GoogleDriveCard    (link / file info)
  └─ Participantes (avatares + papel)
```

> Mobile (< lg): aside vira **bottom-sheet** acionada por botão flutuante "Análise IA".

---

## 3. Wireframe (ASCII) — Visão Geral

```
+--------------------------------------------------------------------------------+
|  Reuniões  /  Sprint Review · Plataforma TSP                                   |
|                                                                                |
|  [#produto] [#squad-painel] [#urgente]                                         |
|  Sprint Review · Plataforma TSP                                                |
|  22 jun 2026 às 16h00 · Nilton, Paula, Vinicius, +3                            |
|                                                                                |
|             [▶ Reprocessar IA] [📤 Compartilhar] [⬇ Exportar PDF]              |
+--------------------------------------------------------------------------------+
| [Visão Geral][Transcrição][Decisões][Tarefas][Riscos][Oportunidades][Chat]     |
+--------------------------------------------------------------------------------+
| MAIN (col esquerda 2/3)                       | ASIDE (col direita 1/3)         |
|                                               |                                 |
| ┌─ Resumo executivo ─────────────────────┐    | ┌─ Análise IA ────────────┐   |
| │ Em uma frase: alinhamos métricas Q3 e  │    | │ Modelo: Gemini Pro 1.5  │   |
| │ definimos owner do release v2.1...     │    | │ Status: ✓ Pronto       │   |
| └────────────────────────────────────────┘    | │ Confiança: 92%          │   |
|                                               | │ [Reprocessar] [Trocar▾] │   |
| ┌─ Leitura estratégica ──────────────────┐    | └─────────────────────────┘   |
| │ Risco de atraso em integração ClickUp; │    |                                 |
| │ oportunidade de antecipar onboarding...│    | ┌─ Google Drive ──────────┐   |
| └────────────────────────────────────────┘    | │ 📁 Arquivo original     │   |
|                                               | │ sprint-review-22jun.mp3 │   |
| ┌─ Decisões (8) ─────────────────────────┐    | │ 142 MB · 1h 12min        │   |
| │ ☑ Adotar Vercel para staging           │    | │ [↗ Abrir no Drive]      │   |
| │ ☑ Pausar feature X até semana 26       │    | └─────────────────────────┘   |
| │ ☐ Definir SLA com Paula até 25/06      │    |                                 |
| │ ... +4                                  │    | ┌─ Participantes (6) ─────┐   |
| │                          [Ver todas →] │    | │ 🟢 Nilton    (líder)    │   |
| └────────────────────────────────────────┘    | │ 🟢 Paula     (produto)  │   |
|                                               | │ 🟡 Vinicius  (eng)      │   |
| ┌─ Tarefas geradas (12) ─────────────────┐    | │ 🟢 Beatriz   (design)   │   |
| │ [→ Tasks] Subir staging Vercel         │    | │ ...                     │   |
| │   Assignee: Nilton · Prazo: 25/06       │    | └─────────────────────────┘   |
| │ [→ Tasks] Spec ClickUp adapter         │    |                                 |
| │   Assignee: Vinicius · Prazo: 27/06     │    |                                 |
| │ ...                                    │    |                                 |
| └────────────────────────────────────────┘    |                                 |
+--------------------------------------------------------------------------------+
```

---

## 4. Tab: Transcrição

Substitui o textarea simples atual (`meeting-workspace.tsx` linha 92) por um leitor estruturado:

```
+-------------------------------------------------------------------+
|  [🔎 Buscar na transcrição...]         [▶ Reproduzir] [Velocidade ▾]
+-------------------------------------------------------------------+
|  ┌──────────┬───────────────────────────────────────────────┐    |
|  │ 00:00:12 │ Nilton                                        │    |
|  │          │ "Pessoal, vamos começar pela revisão do       │    |
|  │          │  release v2.1..."                              │    |
|  ├──────────┼───────────────────────────────────────────────┤    |
|  │ 00:00:34 │ Paula                                         │    |
|  │          │ "Antes disso, quero levantar um bloqueio..."  │    |
|  ├──────────┼───────────────────────────────────────────────┤    |
|  │ 00:01:08 │ Vinicius                                      │    |
|  │          │ "Concordo, e proponho que..."                 │    |
|  └──────────┴───────────────────────────────────────────────┘    |
|                                                                   |
|  Status: ●Transcrevendo... 3min 12s (de ~1h 12min)               |
|  [████████░░░░░░░░░░░░░░░░░░░░░░] 18%                            |
+-------------------------------------------------------------------+
```

**Comportamentos:**
- Cada bloco tem timestamp clicável → reproduz áudio nesse ponto (se houver).
- Busca highlight: matches em `bg-yellow-200`; setas `↑↓` para navegar entre matches.
- Speaker tem chip de cor consistente com o avatar do participante.
- Quando ainda em `transcribing`, mostrar barra de progresso e blocos aparecem incrementalmente (server-sent events ou polling).
- Estado `error` na transcrição: banner vermelho com `[Tentar novamente]`.

**Modos:**
- "Transcrição literal" (default)
- "Transcrição limpa" (sem hesitações, edição leve por IA — opt-in)

---

## 5. Tab: Decisões / Tarefas / Riscos / Oportunidades

Cards uniformes, com mesma anatomia visual (consistência):

```
┌─ DECISÃO #3 ─────────────────────────────────────────────┐
│ ☑  Adotar Vercel para ambiente de staging                │
│                                                           │
│  Contexto: Vinicius levantou que Render está instável.   │
│  Owner: Nilton                                           │
│  Prazo: 25/06                                            │
│  Confiança IA: 88%                                       │
│                                                           │
│  [✎ Editar] [🗑 Descartar] [→ Virar tarefa]              │
└──────────────────────────────────────────────────────────┘
```

- Cards rounded-xl, shadow-sm, hover:shadow-md (padrão do projeto).
- Cores de borda esquerda por categoria:
  - Decisão: `border-l-4 border-emerald-500`
  - Tarefa: `border-l-4 border-[var(--navy)]`
  - Risco: `border-l-4 border-red-500`
  - Oportunidade: `border-l-4 border-blue-500`
- Confiança IA: pill ao lado do título, somente quando < 90% (alertar revisão humana).
- Ações inline: editar abre dialog leve; descartar pede confirmação (1 clique = undo via toast).
- "Virar tarefa" envia decisão direto para `/app/tarefas` com pré-preenchimento, e cria backlink na reunião.

---

## 6. Header — Ações principais

| Botão | Comportamento |
|---|---|
| `▶ Reprocessar IA` | Abre confirmação ("Isso vai sobrescrever decisões/tarefas não editadas manualmente. Continuar?"). Em seguida, dispara `/api/meetings/{id}/process`. Status do AIAnalysisPanel vai para "Processando..." |
| `📤 Compartilhar` | Dialog com opções: (a) **Link interno** (qualquer membro do workspace), (b) **Link público assinado** com expiração (7d / 30d / sem expiração — admin only), (c) **Email** para participantes |
| `⬇ Exportar PDF` | Gera PDF (background job). Toast: "Preparando PDF... Você será notificado." Quando pronto, download automático + entry no canto inferior |

Botões secundários (overflow menu `⋮`): Duplicar, Mover para outro workspace, Excluir.

---

## 7. Props (contrato sugerido)

```ts
type MeetingDetailProps = {
  meeting: {
    id: string;
    title: string;
    date: string;          // ISO
    time?: string;
    durationSec?: number;
    participants: Participant[];
    tags: string[];
    status: MeetingStatus;
    source: "upload" | "youtube" | "drive" | "manual";
    driveFileId?: string;
    driveUrl?: string;
    transcript?: TranscriptBlock[];   // pode chegar parcial durante processing
    summary?: { executive: string; strategic: string };
    decisions?: Decision[];
    actionItems?: ActionItem[];
    risks?: Risk[];
    opportunities?: Opportunity[];
    aiModel?: "gemini-pro" | "gpt-4o" | "claude-sonnet";
    aiConfidence?: number;             // 0..1
  };
  initialTab?: "overview" | "transcript" | "decisions" | "tasks" | "risks" | "opportunities" | "attachments" | "chat";
  onReprocess: () => Promise<void>;
  onShare: (config: ShareConfig) => Promise<{ url: string }>;
  onExportPdf: () => Promise<void>;
  onDecisionConvertToTask: (decisionId: string) => Promise<void>;
};

type TranscriptBlock = {
  id: string;
  startSec: number;
  endSec: number;
  speakerId: string;
  speakerName: string;
  text: string;
  confidence?: number;
};
```

---

## 8. Estados do Componente

| Estado | Visual | Comportamento |
|---|---|---|
| `loading` (initial) | Skeleton de header + dois blocos grandes + aside | `aria-busy="true"` |
| `transcribing` | Transcrição parcial visível + progresso animado | Auto-refresh polling 3s |
| `processing-ai` | Resumo/Decisões mostram skeleton; AIAnalysisPanel mostra "Analisando..." | Disable botão "Reprocessar" |
| `ready` | Tudo renderizado | — |
| `partial` | Transcrição OK mas IA falhou | Banner amarelo: "Transcrição pronta, análise IA falhou. [Tentar novamente]" |
| `error` | Banner vermelho no topo | Botão "Recarregar" + link "Reportar problema" |
| `share-link-copied` | Toast verde 3s | — |
| `pdf-generating` | Toast persistente com mini-spinner | Substituído por toast de download quando pronto |

---

## 9. Tabs — comportamento

- Tabs **sticky** logo abaixo do header. Sombra sutil ao começar scroll.
- Tab ativa tem `bg-[var(--navy)] text-white` (padrão atual do projeto).
- URL atualiza com `?tab=transcript` (deep-linkable).
- Mudança de tab é instantânea (sem fetch novo — todos os dados já vêm do server na primeira request).
- Contador no label quando aplicável: "Decisões (8)", "Tarefas (12)", "Riscos (3)".

---

## 10. Integração com Drive (resumo)

O **card** "Google Drive" no aside mostra metadados do arquivo original quando `meeting.source === "drive"` ou `driveFileId` estiver setado:

- Ícone do tipo do arquivo (.mp3, .mp4, .docx).
- Nome, tamanho, duração.
- `[↗ Abrir no Drive]` — abre em nova aba (`target="_blank" rel="noreferrer"`).
- Quando NÃO há link Drive ainda: card mostra "Conectar ao Drive" → leva para `GoogleDriveConnect`.

Detalhes do widget em [GoogleDriveConnect.spec.md](./GoogleDriveConnect.spec.md).

---

## 11. Acessibilidade (WCAG 2.1 AA)

- **Header**: `<h1>` é o título da reunião; breadcrumb tem `aria-label="Trilha de navegação"`.
- **Tabs**: `role="tablist"`, cada tab `role="tab"` com `aria-selected`, painel `role="tabpanel"`.
- **Transcrição**:
  - Cada bloco tem `<button>` interno para timestamp com `aria-label="Reproduzir a partir de 00:01:08, fala de Vinicius"`.
  - Speaker tem cor + label (não confiar só em cor).
  - Busca anuncia "5 resultados encontrados" via `aria-live="polite"`.
- **Decisões/Tarefas/etc**: checkbox `<input type="checkbox">` real, label clicável.
- **Aside flutuante (mobile)**: bottom-sheet com focus trap, `aria-modal="true"`.
- **Ações destrutivas** (Descartar, Excluir, Reprocessar): confirmação modal com foco no botão "Cancelar".
- **Live regions**: progresso de transcrição/IA via `aria-live="polite"`.
- **Reduced motion**: desabilitar animações de progresso e fade entre tabs se `prefers-reduced-motion`.

---

## 12. Integração com Tasks workspace

Quando "Virar tarefa" é acionado numa decisão/risco:

```ts
POST /api/tasks
{
  title: decision.title,
  description: `Gerada a partir da reunião "${meeting.title}" (${meeting.date}).`,
  meetingId: meeting.id,
  decisionId: decision.id,
  assignee: decision.ownerId,
  due: decision.deadline,
  area: "Reuniões"  // ou derivado de tags
}
```

A reunião mantém um **back-reference** visual: a decisão exibe pill `→ Tarefa #1234` clicável. Em `/app/tarefas`, a task mostra origem: "Originada de Reunião 22 jun".

---

## 13. Open Questions

1. **Áudio embedded player?** v1 só link pro Drive; v2 mini-player no aside.
2. **Edição colaborativa da transcrição?** Sugere-se v3 (CRDT é caro).
3. **Versionamento de análises IA** (manter histórico ao reprocessar)? Recomendo v2.
4. **Multi-idioma na transcrição** (PT/EN mixed)? Validar com STT atual.
5. **Highlights/anotações do usuário** sobre a transcrição? v2.

---

## 14. Métricas de UX

- Tempo até primeira interação com decisões (alvo: < 10s após load).
- Taxa de conversão "decisão → tarefa".
- % de transcrições com busca usada (sinaliza utilidade).
- Taxa de uso "Reprocessar IA" (alta = baixa confiança no resultado, sinal de melhoria).
- NPS qualitativo da página (formulário leve no overflow menu).
