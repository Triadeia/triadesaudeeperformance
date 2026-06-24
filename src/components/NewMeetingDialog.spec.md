# NewMeetingDialog — UX Specification

> Modal de criação de nova reunião disparado pelo botão `"+ Nova Reunião"`
> no `MeetingsList`. Suporta 3 fontes: upload de arquivo, link YouTube/URL pública,
> ou entrada manual de transcrição.
> Status: **Spec-only** (sem implementação).

---

## 1. Propósito & Critério de Sucesso

**Job-to-be-done:** "Quando termino uma reunião (ou recebo um arquivo dela), quero registrá-la no sistema com mínimo atrito e iniciar a transcrição+análise por IA em < 30 segundos."

**Definition of done (UX):**
- Usuário cria reunião e dispara transcrição em ≤ 3 passos (abrir → escolher fonte → submeter).
- Validação de tamanho de arquivo é client-side (não esperar upload completar pra descobrir que passou do limite).
- Upload mostra progresso real (% + velocidade + tempo restante).
- Após submit, dialog fecha e usuário vai direto pra `MeetingDetail` em modo `transcribing` (feedback imediato).
- Tudo acessível por teclado: `Esc` fecha, `Cmd/Ctrl + Enter` submete.

---

## 2. Trigger & Entrada

| Origem | Componente | Comportamento |
|---|---|---|
| Botão `"+ Nova Reunião"` no `PageHeader` de `/app/reunioes` | `<button>` verde `bg-emerald-600` | Abre dialog centralizado |
| Atalho global | `N` (quando workspace tem foco e usuário não está em input) | Mesmo efeito |
| Empty state do `MeetingsList` | CTA "Criar primeira reunião" | Mesmo efeito |
| Chat de comando | "Cadastra reunião com Paula amanhã às 10h" | Pré-preenche título/data antes de abrir |

---

## 3. Wireframe (ASCII) — passo único com tabs internas

```
+-------------------------------------------------------------------+
|  [escuro 60% — overlay com blur sutil]                            |
|                                                                   |
|   +---------------------------------------------------------+     |
|   |  Nova reunião                                       [x] |     |
|   |  Capture e a Triade transcreve + extrai inteligência.   |     |
|   +---------------------------------------------------------+     |
|   |                                                         |     |
|   |  Título *                                               |     |
|   |  [ Ex.: Sprint Review · Plataforma TSP             ]    |     |
|   |                                                         |     |
|   |  +---------------+  +-----------------------------+     |     |
|   |  | Data/Hora     |  | Participantes               |     |     |
|   |  | [📅 22/06 16h]|  | [@ adicionar...           ▾]|     |     |
|   |  +---------------+  +-----------------------------+     |     |
|   |                                                         |     |
|   |  Descrição (opcional)                                   |     |
|   |  [ Contexto, agenda, links relevantes...           ]    |     |
|   |                                                         |     |
|   |  ─── Fonte do conteúdo ──────────────────────────       |     |
|   |  [ Upload ] [ Link/YouTube ] [ Colar texto ] [ Drive ]  |     |
|   |                                                         |     |
|   |   ┌──── (área dinâmica por tab) ────────────────┐       |     |
|   |   │                                              │       |     |
|   |   │       (ver 3.1 / 3.2 / 3.3 / 3.4)            │       |     |
|   |   │                                              │       |     |
|   |   └──────────────────────────────────────────────┘       |     |
|   |                                                         |     |
|   |  Modelo de IA: [ Gemini Pro 1.5 ▾ ]                     |     |
|   |  ☑ Iniciar transcrição automaticamente após o upload    |     |
|   |                                                         |     |
|   +---------------------------------------------------------+     |
|   |                       [ Cancelar ]   [ Salvar e Transcrever ]|
|   +---------------------------------------------------------+     |
|                                                                   |
+-------------------------------------------------------------------+
```

### 3.1 Tab "Upload"

```
   ┌──────────────────────────────────────────────────┐
   │  ⬆ Arraste o arquivo aqui ou [Escolher arquivo] │
   │                                                  │
   │  Áudio (.mp3 .wav .m4a) ou Vídeo (.mp4 .mov)    │
   │  Até 500 MB · Duração até 4 horas               │
   └──────────────────────────────────────────────────┘
```

Durante upload:
```
   ┌──────────────────────────────────────────────────┐
   │  📎 sprint-review-22jun.mp3   (142 MB)           │
   │  [████████████░░░░░░░░░░░░░░] 48%                │
   │  Velocidade: 4.2 MB/s · Restam ~18s              │
   │                                  [Cancelar upload]│
   └──────────────────────────────────────────────────┘
```

### 3.2 Tab "Link/YouTube"

```
   ┌──────────────────────────────────────────────────┐
   │  URL                                              │
   │  [ https://youtube.com/watch?v=...            ]   │
   │                                                  │
   │  Suportamos: YouTube, Vimeo, Google Drive       │
   │  (público), Loom, Tella, qualquer .mp3/.mp4.    │
   │                                                  │
   │  [ ✓ Validar link ]                              │
   └──────────────────────────────────────────────────┘
```

Após validar: preview com thumbnail + duração detectada.

### 3.3 Tab "Colar texto"

```
   ┌──────────────────────────────────────────────────┐
   │  Cole a transcrição completa                     │
   │  ┌──────────────────────────────────────────┐    │
   │  │ [00:00] Nilton: Pessoal, vamos começar...│    │
   │  │ [00:34] Paula: Antes disso, queria...    │    │
   │  │ ...                                       │    │
   │  └──────────────────────────────────────────┘    │
   │  Dica: timestamps `[mm:ss]` são detectados.      │
└──────────────────────────────────────────────────┘
```

### 3.4 Tab "Drive"

```
   ┌──────────────────────────────────────────────────┐
   │  ⚠ Drive não conectado.                          │
   │  [ Conectar Google Drive ]                       │
   └──────────────────────────────────────────────────┘
```

OU (se já conectado):

```
   ┌──────────────────────────────────────────────────┐
   │  ✓ Conectado como nilton@triadesaude.com         │
   │                                                  │
   │  Selecionar arquivo do Drive:                    │
   │  [🔎 Buscar...                              ]    │
   │                                                  │
   │  📁 Reuniões 2026                                │
   │    🎵 sprint-review-22jun.mp3       142 MB ●     │
   │    🎵 strategy-call-19jun.mp3       89 MB        │
   │    🎥 onboarding-paula.mp4          312 MB       │
   │                                                  │
   │  [ Selecionar arquivo marcado ]                  │
   └──────────────────────────────────────────────────┘
```

Detalhes em [GoogleDriveConnect.spec.md](./GoogleDriveConnect.spec.md).

---

## 4. Props (contrato sugerido)

```ts
type NewMeetingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: { id: string; name: string; avatarUrl?: string }[];
  isDriveConnected: boolean;
  defaultModel?: "gemini-pro" | "gpt-4o" | "claude-sonnet";
  defaults?: Partial<{
    title: string;
    date: string;            // ISO yyyy-mm-dd
    time: string;            // HH:mm
    description: string;
    participantIds: string[];
    source: "upload" | "url" | "paste" | "drive";
  }>;
  onSubmit: (payload: NewMeetingPayload) => Promise<{
    ok: boolean;
    error?: string;
    meetingId?: string;
  }>;
  onUploadFile: (file: File, onProgress: (pct: number) => void) =>
    Promise<{ ok: boolean; uploadId?: string; error?: string }>;
};

type NewMeetingPayload = {
  title: string;
  date: string;
  time?: string;
  description?: string;
  participantIds: string[];
  source: "upload" | "url" | "paste" | "drive";
  uploadId?: string;          // se source === "upload"
  url?: string;               // se source === "url"
  pastedTranscript?: string;  // se source === "paste"
  driveFileId?: string;       // se source === "drive"
  model: "gemini-pro" | "gpt-4o" | "claude-sonnet";
  startTranscriptionImmediately: boolean;
};
```

---

## 5. Validação

| Regra | Mensagem inline (pt-BR) |
|---|---|
| Título vazio | "Dê um nome à reunião antes de continuar." |
| Título > 140 chars | "Tente resumir em até 140 caracteres." |
| Data no futuro distante (> 30d) | "Data muito no futuro. Confirma?" (warning, não bloqueia) |
| Nenhuma fonte selecionada/preenchida | "Escolha como o conteúdo será enviado." |
| Arquivo > 500 MB | "Arquivo muito grande. Use até 500 MB ou envie via Drive." |
| Formato não suportado | "Formato não suportado. Use mp3, wav, m4a, mp4 ou mov." |
| URL inválida | "Não consegui acessar essa URL. Verifique se é pública." |
| Texto colado < 100 chars | "Transcrição muito curta. Cole o conteúdo completo." |
| Drive não conectado (tab Drive) | "Conecte o Drive antes de selecionar arquivo." |

Validação dispara **on blur** (sutil) e **on submit** (bloqueante).

---

## 6. Estados do Componente

| Estado | Visual | Comportamento |
|---|---|---|
| `closed` | Não renderiza | — |
| `open` | Fade-in 150ms; foco no campo Título | Body com `overflow:hidden` |
| `validating` | Botão submit desabilitado | Mensagens inline em `aria-live="polite"` |
| `uploading` | Botão submit mostra progresso global; tabs disabled exceto a atual | Não permite fechar (mostra confirmação se Esc) |
| `submitting` | Botão "Salvar e Transcrever" → spinner + "Salvando..." | Campos disabled |
| `error` | Banner `bg-red-50 text-red-700` no topo do form | Mantém valores; foco volta ao campo problemático |
| `success` | Dialog fecha em 200ms; toast verde "Reunião criada, transcrevendo..." | Redireciona para `/app/reunioes/{newId}?tab=transcript` |

---

## 7. Upload — comportamento detalhado

1. **Drag & drop** ou **botão**: aceita um arquivo por vez (multi pode vir em v2).
2. **Validação client-side imediata**: extensão + tamanho. Erros mostram sem subir nada.
3. **Upload em chunks** (resumable, ex: `tus.io`-style ou Supabase Storage `resumable`):
   - Tolera perda de conexão; retoma do último chunk.
   - Progresso real (não fake).
4. **Cancelar upload** aborta XHR/fetch e libera slot no servidor.
5. **Pós-upload**: `uploadId` fica armazenado no estado; ao submeter o form, vai no payload.
6. Se usuário trocar de tab durante upload: avisa "Upload em andamento. Trocar de fonte cancela. Continuar?".

---

## 8. Seletor de Modelo IA

Dropdown padrão (`<select>` nativo OK em v1) com opções:

| Valor | Label visível | Tooltip |
|---|---|---|
| `gemini-pro` | Gemini Pro 1.5 (recomendado) | "Excelente para reuniões em PT-BR, 1M tokens de contexto" |
| `gpt-4o` | OpenAI GPT-4o | "Bom para reuniões curtas e estruturadas" |
| `claude-sonnet` | Claude Sonnet | "Análise crítica e síntese de longa duração" |

Default é configurável em `/app/configuracoes` (preferência do workspace).

---

## 9. Integração

```tsx
// MeetingsList.tsx
<button onClick={() => setDialogOpen(true)} className="flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white">
  <CalendarPlus className="size-4" /> Nova Reunião
</button>

<NewMeetingDialog
  open={dialogOpen}
  onOpenChange={setDialogOpen}
  participants={employees}
  isDriveConnected={driveStatus.connected}
  defaultModel={workspaceSettings.defaultAiModel}
  onUploadFile={uploadToStorage}
  onSubmit={async (payload) => {
    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) {
      router.push(`/app/reunioes/${data.meetingId}?tab=transcript`);
      return { ok: true, meetingId: data.meetingId };
    }
    return { ok: false, error: data.error };
  }}
/>
```

---

## 10. Acessibilidade (WCAG 2.1 AA)

- **Role:** `role="dialog"` + `aria-modal="true"` + `aria-labelledby="new-meeting-title"`.
- **Focus trap:** padrão; `Tab` cicla dentro.
- **Foco inicial:** campo Título.
- **Foco de retorno:** ao fechar, volta ao botão "+ Nova Reunião".
- **Esc:** fecha (se uploading, pede confirmação).
- **Cmd/Ctrl + Enter:** submete.
- **Tabs internas (Upload/Link/Paste/Drive):** `role="tablist"` + `role="tab"` + `aria-selected`.
- **Upload zone:** `<button>` real (não `<div>`), `aria-label="Arraste ou clique para escolher arquivo"`.
- **Progresso:** `<progress>` nativo com `aria-valuetext="48%, restam 18 segundos"`.
- **Erros:** `aria-invalid="true"` + `aria-describedby` apontando para mensagem.
- **Required:** asterisco visual `*` + `aria-required="true"`.
- **Contraste:** todos os pares atingem 4.5:1 mínimo.
- **Screen reader:** ao submeter com sucesso, anunciar via `aria-live="polite"`: "Reunião criada. Iniciando transcrição."

---

## 11. Open Questions

1. **Multi-arquivo no upload?** Anexos extras (slides, atas paralelas) — v2 via tab "Anexos" depois.
2. **Modelo "auto" que escolhe IA por duração/idioma?** — v2.
3. **Templates de reunião** (Sprint Review, 1:1, All-Hands) com prompts customizados? — v2.
4. **Salvar como rascunho** se usuário fechar a meio? — Recomendo v2 com `localStorage`.
5. **Webhook/integração Calendar** para criar reunião automaticamente após evento real? — v3.

---

## 12. Métricas de UX

- Tempo médio entre abrir e submeter (alvo: ≤ 30s sem upload, ≤ 2min com upload).
- Taxa de abandono (abrir e fechar sem criar) — esperado < 25%.
- Distribuição de fontes (Upload vs Link vs Paste vs Drive) — informa onde investir.
- Taxa de erro de upload (alvo: < 3%).
- % de reuniões com `startTranscriptionImmediately = true` (sinal de confiança).
