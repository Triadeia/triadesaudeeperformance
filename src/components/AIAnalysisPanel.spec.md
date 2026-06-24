# AIAnalysisPanel — UX Specification

> Painel lateral/inline que controla e exibe a análise IA de uma reunião:
> seleção de modelo, status do processamento, e resultados estruturados
> (decisões, action items, summary, tags automáticas).
> Aparece no aside direito de `MeetingDetail` (desktop) ou como bottom-sheet (mobile).
> Status: **Spec-only** (sem implementação).

---

## 1. Propósito & Critério de Sucesso

**Job-to-be-done:** "Quando abro uma reunião, quero ver imediatamente o que a IA extraiu (decisões, action items, resumo), confiar no resultado (com nível de confiança visível), e reprocessar com outro modelo se algo parecer impreciso."

**Definition of done (UX):**
- Estado da IA é **glanceable** em < 1s (Processando / Pronto / Erro).
- Resultados aparecem progressivamente (streaming) quando possível — não esperar tudo terminar.
- Trocar de modelo é 1 clique + 1 confirmação.
- Confiança da IA é mostrada quando < 90% (sinal pra revisão humana).
- Action items têm assignee + deadline editáveis inline.
- Tags automáticas podem ser aceitas/rejeitadas com 1 clique.

---

## 2. Anatomia do Painel

```
┌─ Análise IA ────────────────────────────┐
│                                          │
│  HEADER                                  │
│  ┌────────────────────────────────────┐  │
│  │ ✨ Análise IA                      │  │
│  │ Modelo: [Gemini Pro 1.5      ▾]   │  │
│  │ Status: ● Pronto · Conf. 92%      │  │
│  │ [Reprocessar] [Histórico ▾]       │  │
│  └────────────────────────────────────┘  │
│                                          │
│  SECTIONS (colapsáveis)                  │
│  ┌────────────────────────────────────┐  │
│  │ ▾ Resumo (2-3 linhas)              │  │
│  ├────────────────────────────────────┤  │
│  │ ▾ Decisões (8)                     │  │
│  ├────────────────────────────────────┤  │
│  │ ▾ Action Items (12)                │  │
│  ├────────────────────────────────────┤  │
│  │ ▸ Riscos (3)                       │  │
│  ├────────────────────────────────────┤  │
│  │ ▸ Oportunidades (5)                │  │
│  ├────────────────────────────────────┤  │
│  │ ▾ Tags automáticas                 │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

---

## 3. Wireframe (ASCII) — Estado: PROCESSANDO

```
┌─ Análise IA ────────────────────────────┐
│ Modelo: Gemini Pro 1.5                  │
│                                          │
│  [✨ animado]                            │
│  Analisando reunião...                  │
│                                          │
│  ✓ Transcrição concluída (1h 12min)     │
│  ⟳ Identificando decisões...            │
│  ○ Extraindo action items                │
│  ○ Detectando riscos                     │
│  ○ Gerando resumo                        │
│                                          │
│  Tempo decorrido: 0:42                  │
│  [████████░░░░░░░░░░░░] estimado 1:30   │
│                                          │
│  [Cancelar análise]                      │
└──────────────────────────────────────────┘
```

**Comportamentos:**
- Steps com ícones animados: `✓` (feito), `⟳ pulsing` (atual), `○` (pendente).
- Barra de progresso baseada em ETA do backend (não fake).
- Botão "Cancelar análise" só visível se durar > 30s.
- Streaming: assim que "Decisões" termina, painel já popula seção Decisões e marca ✓.

---

## 4. Wireframe — Estado: PRONTO (expandido)

```
┌─ Análise IA ────────────────────────────┐
│ Modelo: Gemini Pro 1.5    ● Pronto · 92%│
│ Última análise: 22/06 17:48              │
│ [Reprocessar] [Trocar modelo ▾]         │
│                                          │
├──────────────────────────────────────────┤
│ ▾ Resumo                                 │
│                                          │
│ Sprint Review revisou release v2.1,      │
│ alinhou métricas Q3 e definiu owner do   │
│ deploy. Risco mais comentado: integração │
│ ClickUp em atraso de 2 semanas.          │
├──────────────────────────────────────────┤
│ ▾ Decisões (8)                          │
│                                          │
│ ☑ Adotar Vercel para staging            │
│   [Ver contexto na transcrição →]        │
│                                          │
│ ☑ Pausar feature X até semana 26        │
│   [Ver contexto →]                       │
│                                          │
│ ☐ Definir SLA com Paula até 25/06       │
│   ⚠ Confiança 68% — revisar             │
│   [Ver contexto →]   [Editar] [Descartar]│
│                                          │
│ [Ver todas as 8 →]                       │
├──────────────────────────────────────────┤
│ ▾ Action Items (12)                     │
│                                          │
│ ┌─ Subir staging Vercel ──────────────┐ │
│ │ 👤 [Nilton           ▾]              │ │
│ │ 📅 [25/06            ]               │ │
│ │ [→ Criar tarefa] [✎] [🗑]            │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ ┌─ Spec ClickUp adapter ──────────────┐ │
│ │ 👤 [Vinicius         ▾]              │ │
│ │ 📅 [27/06            ]               │ │
│ │ [→ Criar tarefa] [✎] [🗑]            │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ [Ver todos os 12 →]                      │
├──────────────────────────────────────────┤
│ ▸ Riscos (3)                             │
├──────────────────────────────────────────┤
│ ▸ Oportunidades (5)                      │
├──────────────────────────────────────────┤
│ ▾ Tags automáticas                       │
│                                          │
│ Sugeridas pela IA:                       │
│ [#urgente ✓] [#follow-up ✓]              │
│ [#produto ✓] [#estratégia ✗]             │
│                                          │
│ Adicionar manualmente: [+ tag        ]   │
└──────────────────────────────────────────┘
```

---

## 5. Wireframe — Estado: ERRO

```
┌─ Análise IA ────────────────────────────┐
│ ⚠ Falha na análise                       │
│                                          │
│ O modelo Gemini Pro 1.5 retornou erro:   │
│ "Rate limit excedido"                    │
│                                          │
│ A transcrição foi salva com sucesso.     │
│                                          │
│ [Tentar novamente]                       │
│ [Trocar para OpenAI GPT-4o]              │
│ [Detalhes técnicos ▾]                    │
└──────────────────────────────────────────┘
```

---

## 6. Seletor de Modelo

Dropdown com tooltip explicativo:

```
┌─ Modelo de IA ─────────────────────┐
│ ● Gemini Pro 1.5    (atual)        │
│   "Excelente para PT-BR, 1M tokens"│
│                                     │
│   GPT-4o                            │
│   "Bom para reuniões curtas"       │
│                                     │
│   Claude Sonnet 4.5                 │
│   "Análise crítica profunda"        │
│                                     │
│ ─────────────────                   │
│ Comparar modelos →                  │
└─────────────────────────────────────┘
```

**Comportamento ao trocar:**
1. Modal de confirmação: "Trocar para GPT-4o reprocessará toda a análise. Custo estimado: ~$0.12. Continuar?"
2. Se confirmar → estado vira `PROCESSANDO` com novo modelo.
3. Histórico do modelo anterior fica preservado em `[Histórico ▾]`.

### Histórico de análises

```
┌─ Histórico ────────────────────────┐
│ ● Gemini Pro 1.5  22/06 17:48 ✓    │
│   GPT-4o          22/06 17:20 ✓    │
│   Gemini Pro 1.5  22/06 17:05 ⚠    │
│                                     │
│ [Restaurar análise selecionada]     │
└─────────────────────────────────────┘
```

---

## 7. Confiança da IA (UX da incerteza)

Cada item extraído (decisão, action item, etc) tem um campo `confidence` 0..1 retornado pelo modelo.

| Faixa | Tratamento visual |
|---|---|
| ≥ 90% | Sem indicador (silêncio = alta confiança) |
| 70-89% | Pill amarela pequena: `⚠ Conf. 78%` ao lado do título |
| < 70% | Borda amarela no item + texto explícito: "Revise — confiança baixa" |

**Princípio:** não inundar com porcentagens; só mostrar quando ajuda.

A **confiança global** no header é média ponderada das seções principais.

---

## 8. Tags automáticas

A IA sugere 3-8 tags. Cada uma tem 3 estados:

| Estado | Visual | Ação |
|---|---|---|
| Sugerida (pendente) | `[#urgente]` cinza-claro com `✓ ✗` ao lado | aceitar/rejeitar |
| Aceita | `[#urgente]` cor da tag · `✓` | click para desfazer |
| Rejeitada | `[#urgente]` riscada · cinza | click para reativar |

Tags aceitas viram parte do `meeting.tags` e aparecem na lista e no header.

---

## 9. Action Items — edição inline

Cada action item permite editar **assignee** e **deadline** sem sair do painel:

- Assignee: combobox com autocomplete de profiles do workspace.
- Deadline: input `type="date"` nativo (fallback `dd/mm/aaaa` texto).
- `[→ Criar tarefa]` envia para `/app/tarefas` e mostra link reverso no card: `→ Tarefa #1234`.
- `[✎]` abre edição completa em dialog (título + descrição + área + prioridade).
- `[🗑]` descarta com toast undo 5s.

---

## 10. Props (contrato sugerido)

```ts
type AIAnalysisPanelProps = {
  meetingId: string;
  status: "idle" | "transcribing" | "processing" | "ready" | "error" | "partial";

  model: "gemini-pro" | "gpt-4o" | "claude-sonnet";
  availableModels: { id: string; label: string; description: string; estimatedCostUsd?: number }[];

  // resultados (parciais ou completos)
  result?: {
    summary: string;
    confidence: number;            // 0..1, média ponderada
    decisions: AIItem[];
    actionItems: AIActionItem[];
    risks: AIItem[];
    opportunities: AIItem[];
    suggestedTags: AITag[];
    generatedAt: string;
  };

  // streaming progress
  progress?: {
    stage: "transcribing" | "summary" | "decisions" | "action_items" | "risks" | "opportunities" | "tags" | "done";
    stagesCompleted: string[];
    elapsedSec: number;
    estimatedTotalSec?: number;
  };

  errorMessage?: string;

  // histórico
  history?: AnalysisRun[];

  // callbacks
  onChangeModel: (modelId: string) => Promise<void>;
  onReprocess: () => Promise<void>;
  onCancelProcessing: () => Promise<void>;
  onUpdateActionItem: (id: string, patch: Partial<AIActionItem>) => Promise<void>;
  onConvertActionItemToTask: (id: string) => Promise<void>;
  onAcceptTag: (tag: string) => Promise<void>;
  onRejectTag: (tag: string) => Promise<void>;
  onAddTag: (tag: string) => Promise<void>;
  onRestoreHistoryRun: (runId: string) => Promise<void>;
};

type AIItem = {
  id: string;
  text: string;
  confidence: number;
  sourceBlocks?: string[];      // ids de TranscriptBlock pra "Ver contexto"
};

type AIActionItem = AIItem & {
  assigneeId?: string;
  assigneeName?: string;
  deadline?: string;            // ISO yyyy-mm-dd
  taskId?: string;              // se já foi convertido em tarefa
};

type AITag = {
  text: string;
  confidence: number;
  status: "suggested" | "accepted" | "rejected";
};

type AnalysisRun = {
  id: string;
  model: string;
  startedAt: string;
  finishedAt?: string;
  status: "ready" | "error";
  confidence?: number;
};
```

---

## 11. Estados do Componente (resumido)

| Estado | Visual | Comportamento |
|---|---|---|
| `idle` | "Nenhuma análise ainda" + botão "Analisar com IA" | Inicia processo |
| `transcribing` | Step "Transcrevendo" ativo; demais pendentes | Polling 3s |
| `processing` | Steps progridem; seções aparecem incrementalmente | Stream/polling |
| `partial` | Algumas seções ✓, uma ✗ | Banner: "X falhou. Tentar novamente?" |
| `ready` | Tudo populado, header verde | — |
| `error` | Estado de erro completo (seção 5) | — |
| `reprocessing` | Sobrepõe ao estado ready com indicador "Reprocessando..." | Antiga análise fica visível até a nova chegar |

---

## 12. Acessibilidade (WCAG 2.1 AA)

- **Painel:** `<section aria-label="Análise por IA">`.
- **Status header:** `aria-live="polite"` anuncia mudanças ("Análise concluída com 92% de confiança").
- **Steps de progresso:** `<ol>` semântico; cada step com `aria-current="step"` no atual.
- **Seções colapsáveis:** `<button aria-expanded="true|false" aria-controls="...">`.
- **Confiança baixa:** ícone `⚠` com `aria-label="Confiança baixa, revisar"`.
- **Tags:** `role="group"` com cada chip tendo `aria-pressed` se for toggle.
- **Action items:** `<form>` real (ou contenteditable acessível); assignee combobox com `aria-autocomplete="list"`.
- **Trocar modelo:** modal de confirmação com foco no "Cancelar".
- **Cancelar análise:** botão sempre alcançável por teclado.
- **Reduced motion:** desabilitar pulse/animações de progresso se `prefers-reduced-motion`.

---

## 13. Integração com MeetingDetail

```tsx
// Em MeetingDetail (desktop):
<aside className="hidden xl:block w-[380px] sticky top-24 self-start space-y-6">
  <AIAnalysisPanel
    meetingId={meeting.id}
    status={meeting.status}
    model={meeting.aiModel ?? workspaceSettings.defaultAiModel}
    availableModels={availableModels}
    result={meeting.aiResult}
    progress={meeting.aiProgress}
    history={meeting.analysisHistory}
    onChangeModel={...}
    onReprocess={...}
    onConvertActionItemToTask={...}
    // ...
  />
  <GoogleDriveConnect variant="compact" ... />
</aside>

// Mobile (< xl): bottom sheet
<button className="fixed bottom-4 right-4 lg:hidden ... bg-emerald-600">
  ✨ Análise IA
</button>
<BottomSheet open={sheetOpen}>
  <AIAnalysisPanel {...sameProps} />
</BottomSheet>
```

---

## 14. Open Questions

1. **Custo da IA visível pro usuário?** Tooltip "≈ $0.04 nesta análise"? — Recomendo só admin.
2. **Comparar 2 modelos lado a lado?** v2 — view dividida.
3. **Prompt customizado por workspace?** ("Sempre extrair também próximos passos para o cliente X") — v2.
4. **Citações inline na transcrição:** click numa decisão highlight os blocos da fonte — sim, v1.5.
5. **Feedback do usuário (thumb up/down) por item** para fine-tuning futuro — v2.
6. **Limite de re-análises por dia** (anti-abuso) — definir com produto.

---

## 15. Métricas de UX

- Tempo médio até primeira interação com action items (alvo: < 30s após status `ready`).
- Taxa de conversão "action item → tarefa" (alvo: > 60%).
- Taxa de reprocessamento (alta = baixa qualidade do modelo padrão).
- Taxa de aceitação de tags sugeridas (alvo: > 70%).
- Distribuição de uso por modelo (informa default ideal).
- Taxa de rejeição de itens (alta = ajustar prompt).
