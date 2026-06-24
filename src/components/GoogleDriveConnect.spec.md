# GoogleDriveConnect — UX Specification

> Componente reutilizável para conexão OAuth com Google Drive,
> listagem de arquivos recentes e sincronização de reuniões.
> Aparece em 3 lugares: `/app/integracoes` (card), `NewMeetingDialog` (tab Drive)
> e `MeetingDetail` (aside lateral).
> Status: **Spec-only** (sem implementação).

---

## 1. Propósito & Critério de Sucesso

**Job-to-be-done:** "Quando armazeno gravações de reuniões no Drive da empresa, quero conectar a conta uma única vez, ver minhas últimas reuniões dali, e importar para a Triade sem fazer download manual."

**Definition of done (UX):**
- Conexão OAuth em ≤ 3 cliques (Conectar → Google consent → voltar conectado).
- Status de conexão sempre visível (conta + escopos + data da última sync).
- Listagem de últimos arquivos relevantes (filtra por mime-types de áudio/vídeo/doc).
- Botão "Sincronizar" força refresh sem precisar reload da página.
- Desconectar é explícito e revoga tokens server-side (não só no client).

---

## 2. Variantes do Componente

| Variante | Onde aparece | Comportamento |
|---|---|---|
| `<GoogleDriveConnect variant="card" />` | `/app/integracoes` | Card grande com descrição completa, conta, escopos, listagem prévia |
| `<GoogleDriveConnect variant="picker" />` | `NewMeetingDialog` tab Drive | Listagem para seleção; emite `onSelectFile(driveFileId)` |
| `<GoogleDriveConnect variant="compact" />` | `MeetingDetail` aside | Mini-card só com status + link arquivo da reunião |
| `<GoogleDriveConnect variant="prompt" />` | Estado não-conectado em qualquer lugar | Apenas mensagem + botão "Conectar Google Drive" |

---

## 3. Wireframe (ASCII) — variant `card` (Integrações)

### 3.1 Estado: NÃO conectado

```
+---------------------------------------------------------+
|  [☁ ícone Cloud verde-50]                  [Não conectado]
|                                                         |
|  Google Drive                                           |
|                                                         |
|  Sincronize suas gravações e transcrições direto da     |
|  pasta da empresa. Somente leitura · escopo mínimo.     |
|                                                         |
|  O que vamos acessar:                                   |
|   • Listar arquivos de áudio, vídeo e documentos        |
|   • Baixar arquivos que você selecionar                 |
|   ✗ Não acessamos arquivos pessoais ou outros apps      |
|                                                         |
|  [ Conectar Google Drive ↗ ]                            |
+---------------------------------------------------------+
```

### 3.2 Estado: CONECTANDO (após click)

Redireciona para Google consent screen (fora do app). Ao voltar:

### 3.3 Estado: CONECTADO

```
+---------------------------------------------------------+
|  [☁ ícone Cloud verde-50]                  [● Conectado]|
|                                                         |
|  Google Drive                                           |
|  Conectado como nilton@triadesaude.com                  |
|  Última sincronização: há 2 minutos                     |
|                                                         |
|  Escopos ativos:                                        |
|   ✓ drive.readonly  (somente leitura)                   |
|   ✓ drive.metadata.readonly                             |
|                                                         |
|  ─── Reuniões recentes detectadas (12) ──── [Sync 🔄]   |
|                                                         |
|  📁 Reuniões 2026 / Sprint Reviews                      |
|     🎵 sprint-review-22jun.mp3       22/06 · 142 MB  [↪]|
|     🎵 sprint-review-15jun.mp3       15/06 · 138 MB  [↪]|
|     🎵 sprint-review-08jun.mp3       08/06 · 145 MB  [↪]|
|                                                         |
|  📁 Reuniões 2026 / 1:1s                                |
|     🎵 1on1-paula-20jun.mp3          20/06 ·  42 MB  [↪]|
|     🎥 onboarding-vinicius.mp4       18/06 · 312 MB  [↪]|
|                                                         |
|  [ Ver todos os 12 arquivos ]                           |
|                                                         |
|  ─── Configurações ────────────────────                 |
|  Pasta monitorada: [ /Reuniões 2026             ] [✎]   |
|  ☑ Sincronizar a cada 30 min                            |
|  ☑ Importar automaticamente novos áudios da pasta       |
|                                                         |
|  [ Desconectar conta ]                                  |
+---------------------------------------------------------+
```

**Ícone `[↪]`:** "Importar para Triade" — cria reunião direto a partir desse arquivo (abre `NewMeetingDialog` pré-preenchido).

### 3.4 Estado: ERRO de conexão

```
+---------------------------------------------------------+
|  [☁ ícone Cloud vermelho-50]              [⚠ Erro]      |
|                                                         |
|  Google Drive                                           |
|  Não conseguimos acessar a conta.                       |
|                                                         |
|  Possível causa: token expirado ou consentimento        |
|  revogado no Google.                                    |
|                                                         |
|  [ Reconectar ]   [ Detalhes técnicos ▾ ]               |
+---------------------------------------------------------+
```

---

## 4. Wireframe — variant `picker` (dentro de NewMeetingDialog)

```
   ┌──────────────────────────────────────────────────┐
   │  ✓ Conectado como nilton@triadesaude.com         │
   │                                                  │
   │  [🔎 Buscar arquivo no Drive...               ]  │
   │  Filtro: [Tipo: Áudio/Vídeo ▾]  [Pasta ▾]        │
   │                                                  │
   │  📁 Reuniões 2026                                │
   │   ┌────────────────────────────────────────┐     │
   │   │ ◯ 🎵 sprint-review-22jun.mp3 142 MB    │     │
   │   │   modificado 22/06 16:43                │     │
   │   ├────────────────────────────────────────┤     │
   │   │ ● 🎥 strategy-19jun.mp4      89 MB    │     │
   │   │   modificado 19/06 15:12  ← selecionado│     │
   │   ├────────────────────────────────────────┤     │
   │   │ ◯ 🎵 onboarding-paula.mp3   42 MB     │     │
   │   │   modificado 18/06 10:01                │     │
   │   └────────────────────────────────────────┘     │
   │                                                  │
   │  [Carregar mais...]                              │
   └──────────────────────────────────────────────────┘
```

Seleção é **single-select** (rádio). Submit do dialog usa `driveFileId` no payload.

---

## 5. Wireframe — variant `compact` (aside MeetingDetail)

```
   ┌─ Google Drive ──────────┐
   │ ✓ Conectado             │
   │                         │
   │ 📁 Arquivo original     │
   │ sprint-review-22jun.mp3 │
   │ 142 MB · 1h 12min       │
   │                         │
   │ [↗ Abrir no Drive]      │
   │ [🔄 Sincronizar metadata]│
   └─────────────────────────┘
```

OU se não conectado:

```
   ┌─ Google Drive ──────────┐
   │ ✗ Não conectado         │
   │                         │
   │ Conecte para vincular   │
   │ a gravação original a   │
   │ esta reunião.           │
   │                         │
   │ [Conectar Drive ↗]      │
   └─────────────────────────┘
```

---

## 6. Fluxo OAuth (passo a passo)

```
┌─────────┐    ┌────────────────┐    ┌──────────────────┐    ┌─────────┐
│ Usuário │───▶│ click Conectar │───▶│ /api/auth/google │───▶│ Google  │
└─────────┘    └────────────────┘    │  /authorize      │    │ Consent │
                                     └──────────────────┘    └────┬────┘
                                                                  │
                                              ┌───────────────────┘
                                              ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│ Voltou conectado:        │◀───│ /api/auth/google/callback│
│ - mostra conta + escopos │    │   guarda tokens server   │
│ - faz primeira sync      │    │   (criptografados)       │
└──────────────────────────┘    └──────────────────────────┘
```

**Tokens NUNCA chegam ao client.** API guarda refresh token no Supabase (criptografado, RLS por workspace).

---

## 7. Props (contrato sugerido)

```ts
type GoogleDriveConnectProps = {
  variant: "card" | "picker" | "compact" | "prompt";
  status: "disconnected" | "connecting" | "connected" | "error";
  account?: {
    email: string;
    name?: string;
    avatarUrl?: string;
  };
  scopes?: string[];
  lastSyncAt?: string;        // ISO
  watchedFolderPath?: string;
  files?: DriveFile[];        // lista pré-carregada (variants card / picker)
  totalFilesCount?: number;
  errorMessage?: string;

  // callbacks
  onConnect: () => void;                                     // navega para /api/auth/google/authorize
  onDisconnect: () => Promise<void>;
  onSync: () => Promise<void>;
  onSelectFile?: (file: DriveFile) => void;                  // só variant=picker
  onImportFile?: (file: DriveFile) => void;                  // variant=card; abre NewMeetingDialog
  onUpdateSettings?: (settings: DriveSettings) => Promise<void>;
};

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  durationSec?: number;
  modifiedAt: string;
  folderPath: string;
  webViewLink: string;
  thumbnailUrl?: string;
};

type DriveSettings = {
  watchedFolderId?: string;
  autoSyncEnabled: boolean;
  autoImportNewAudio: boolean;
};
```

---

## 8. Estados do Componente

| Estado | Visual | Comportamento |
|---|---|---|
| `disconnected` | Card cinza com CTA grande | click → redirect OAuth |
| `connecting` | Botão com spinner "Aguardando Google..." | desabilita interação |
| `connected` (loading files) | Header conectado + skeleton de 5 linhas de arquivos | `aria-busy="true"` |
| `connected` (loaded) | Listagem completa + ações | — |
| `syncing` | Ícone 🔄 girando + "Sincronizando..." | resto da UI permanece interativo |
| `error` | Card com banner vermelho + ação Reconectar | Mostra `errorMessage` |
| `revoking` | Botão "Desconectar" → "Desconectando..." | Bloqueia até confirmar |

---

## 9. Comportamentos especiais

### Sincronização
- **Manual:** botão `🔄 Sync` força refresh; toast "12 arquivos atualizados".
- **Automática:** se `autoSyncEnabled`, cron server-side a cada 30min.
- **Push (futuro):** Drive Push Notifications via webhook em v2.

### Importar arquivo
Click no ícone `[↪]` ao lado de um arquivo:
1. Abre `NewMeetingDialog` com `defaults`:
   - `title` = nome do arquivo sem extensão
   - `date` = `modifiedAt`
   - `source` = `"drive"`
   - `driveFileId` setado
2. Usuário só confirma → reunião criada e transcrição inicia.

### Auto-import
Se `autoImportNewAudio` ligado: ao detectar arquivo novo na pasta monitorada, cria reunião **rascunho** automaticamente (status `draft`) e notifica usuário. Usuário decide se quer transcrever (1 clique).

### Desconectar
1. Confirmação modal: "Desconectar a conta `nilton@triadesaude.com`?"
2. Server revoga refresh token via `https://oauth2.googleapis.com/revoke`.
3. Apaga `google_drive_connections` row do workspace.
4. Reuniões existentes mantêm `driveFileId` mas link "Abrir no Drive" mostra "Conta desconectada".

---

## 10. Segurança & Privacidade (badges visíveis)

Sempre presentes no card:

- 🔒 **Tokens criptografados** (server-side, AES-256).
- 👁 **Somente leitura** (escopo `drive.readonly`).
- 🚫 **Não usamos para treino** (texto pequeno embaixo).
- 📜 **Conformidade LGPD** (link para política).

Banner azul informativo (igual ao existente em `/app/integracoes`):
> "OAuth real exige Client ID, Client Secret, callback HTTPS e consentimento do administrador. O painel não solicita nem armazena senha Google."

---

## 11. Integração com `/app/integracoes`

O card atual de Google Workspace em `integracoes/page.tsx` (linha 5) é substituído por:

```tsx
<GoogleDriveConnect
  variant="card"
  status={driveStatus.status}
  account={driveStatus.account}
  scopes={driveStatus.scopes}
  lastSyncAt={driveStatus.lastSyncAt}
  files={driveFiles}
  totalFilesCount={driveFiles.length}
  onConnect={() => router.push("/api/auth/google/authorize?return_to=/app/integracoes")}
  onDisconnect={async () => { await fetch("/api/auth/google/disconnect", { method: "POST" }); refetch(); }}
  onSync={async () => { await fetch("/api/integrations/drive/sync", { method: "POST" }); refetch(); }}
  onImportFile={(file) => { setNewMeetingDefaults({ driveFileId: file.id, title: file.name }); setDialogOpen(true); }}
  onUpdateSettings={async (s) => { await fetch("/api/integrations/drive/settings", { method: "PUT", body: JSON.stringify(s) }); }}
/>
```

---

## 12. Acessibilidade (WCAG 2.1 AA)

- **Botão Conectar:** `aria-label="Conectar conta do Google Drive (abre nova aba)"`.
- **Status:** badge tem `aria-label` ("Status: Conectado").
- **Lista de arquivos (picker):** `role="radiogroup"`; cada item `role="radio"` com `aria-checked`.
- **Lista de arquivos (card):** `<ul>` semântico; ação Importar é `<button aria-label="Importar sprint-review-22jun.mp3 para a Triade">`.
- **Sync:** ícone girando tem `aria-label="Sincronizando..."`.
- **Live regions:** "12 arquivos atualizados" anunciado via `aria-live="polite"`.
- **Desconectar:** modal de confirmação com foco no "Cancelar".
- **Contraste:** badges e textos passam AA.
- **Sem mouse:** todo o fluxo OAuth + select + import por teclado.

---

## 13. Open Questions

1. **Múltiplas contas Drive?** (pessoal + empresa) — v2.
2. **OneDrive / Dropbox?** Mesma estrutura — extrair `<CloudConnect provider="..." />` genérico em v2.
3. **Quotas de API?** Mostrar restantes? Sutil, talvez só admin.
4. **Watch folders aninhadas?** v1 = uma pasta + recursivo opcional.
5. **Compartilhamento reverso** (Triade gera PDF e envia pro Drive)? — v2.

---

## 14. Métricas de UX

- Taxa de conclusão do OAuth (% que clica Conectar e completa).
- Tempo médio do fluxo OAuth (alvo: < 30s).
- % de reuniões com origem `source = "drive"` vs outras fontes.
- Frequência de uso de "Sync manual" (alto = polling automático insuficiente).
- Taxa de desconexão dentro de 30 dias (sinal de problema de confiança).
