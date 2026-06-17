# Painel Empresarial Triade Saúde e Performance

Painel em Next.js 16 com autenticação, banco, storage e RLS no Supabase,
processamento estruturado de reuniões por IA e automações assinadas para n8n.

O Brandbook TSP vive em `/app/marca`, com diretório pesquisável, temas
claro, escuro e azul institucional, componentes de referência, Código TSP,
movimento Membro Tríade, gamificação e acervo estratégico integrado ao produto.

## Configuração local

1. Copie as chaves necessárias de `.env.example` para `.env.local`.
2. Aplique `../supabase/migrations/20260611223000_painel_empresarial_backend.sql`.
3. Defina uma senha temporária em `SEED_USER_PASSWORD`.
4. Execute `npm run seed:supabase`.
5. Inicie com `npm run dev`.

Sem as variáveis do Supabase, o painel continua operando em modo de demonstração.
Nenhuma chave administrativa deve usar o prefixo `NEXT_PUBLIC_`.

## Backend

- `POST /api/meetings/:id/transcript`: salva transcrição.
- `POST /api/meetings/:id/process`: gera resumo, decisões, riscos e tarefas.
- `POST /api/tasks/command`: consulta ou cria tarefas.
- `POST /api/documents/upload`: envia arquivos privados de até 20 MB.
- `POST /api/n8n/webhook`: recebe callbacks assinados do n8n.

O callback usa HMAC SHA-256 sobre `<timestamp>.<corpo>` nos cabeçalhos
`x-vp-timestamp` e `x-vp-signature`, com tolerância de cinco minutos.

## Validação

```bash
npm run check
```

Aplicacao interna para reunioes, tarefas, projetos, inteligencia e funcionarios.

## Executar

```bash
npm install
cp .env.example .env.local
npm run dev
```

Acesse `http://localhost:3000`.

## Acesso de demonstracao

- E-mail: `will@triade.local`
- Senha: `Verifica@2026`

Todos os seis funcionarios usam a mesma senha de demonstracao. Em producao real,
substitua a autenticacao local por um provedor com recuperacao de senha e MFA.

## Qualidade

```bash
npm run check
```

Executa lint, typecheck e build de producao.
