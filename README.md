This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).
# LegacyGuard Console

Plataforma Next.js/TypeScript para orquestrar agentes de revisão, refatoração e segurança em código legado, com chat livre, sandbox opcional e trilha de auditoria. Este README descreve a arquitetura atual e as etapas pendentes, incluindo o futuro sistema de tokens/precificação.

## Quick Start

```bash
# Instalar dependências
npm install

# Dev (Linux/Mac)
npm run dev

# Dev (Windows - desabilita Turbopack)
npm run dev:win

# Worker (em outro terminal)
npm run worker

# Testes
npm test
```

## Variáveis de Ambiente

```env
# Obrigatórias
OPENAI_API_KEY=sk-...
NEXTAUTH_SECRET=sua-secret-key
NEXTAUTH_URL=http://localhost:3000

# GitHub OAuth (para login)
GITHUB_ID=seu-github-client-id
GITHUB_SECRET=seu-github-client-secret

# Redis (fila de tarefas)
REDIS_URL=redis://localhost:6379

# Postgres (auditoria + RAG)
AUDIT_DB_URL=postgres://user:pass@host:5432/legacyguard
# ou PGVECTOR_URL se usando pgvector

# Sandbox (opcional)
LEGACYGUARD_SANDBOX_ENABLED=true
LEGACYGUARD_SANDBOX_REPO_PATH=/workspace/legacyguard
LEGACYGUARD_SANDBOX_COMMAND=npm test
LEGACYGUARD_SANDBOX_RUNNER=/workspace/legacyguard/scripts/runner_sandbox.sh
LEGACYGUARD_SANDBOX_TIMEOUT_MS=900000

# Modelos (opcional)
OPENAI_CHEAP_MODEL=gpt-4o-mini
OPENAI_DEEP_MODEL=gpt-4o
```

## Componentes
- **UI**: Chat em `src/components/ChatInterface.tsx`, seletor de agente em `src/components/AgentSelector.tsx`, tema global em `src/app/globals.css`, landing em `src/app/page.tsx`.
- **Agentes**: planner, advisor, operator, reviewer, executor, advisor-impact (impacto) e chat livre (`src/agents/*`).
- **Orquestração**: `src/agents/orchestrator.ts` coordena waves, exige aprovação humana para executor quando necessário, e pode rodar sandbox antes do executor.
- **APIs**:
  - `/api/agents`: enfileira tarefas (orchestrate/approve/roles diretas) e registra audit log.
  - `/api/agents/stream`: SSE de progresso.
  - `/api/agent`: fluxo single-agent com Semgrep, npm/pip audit, heurísticas de compliance e geração de patches/testes.
  - `/api/chat`: modo chat livre (econômico/profundo) com sugestão de escalar para orquestração.
  - `/api/index`: endpoint para indexar repositório (RAG).
- **Worker**: `scripts/agentWorker.ts` consome fila Redis, executa agentes e publica resultados.
- **Sandbox**: `scripts/runner_sandbox.sh` para rodar testes em container antes do executor (config via contexto/ENV).
- **Auditoria**: `src/lib/audit.ts` grava logs/artifacts em Postgres (usa AUDIT_DB_URL ou PGVECTOR_URL). Metadados são sanitizados automaticamente.
- **Segurança**: `src/lib/secrets.ts` mascara tokens e secrets em logs/SSE.
### Orquestração completa
1. UI aciona `/api/agents` com `role: "orchestrate"` (pode enviar `context` e `sandbox` opcional).
2. Planner gera plano; orquestrador executa waves; pausa para aprovação antes de executor se requerido.
3. SSE em `/api/agents/stream` atualiza o chat; botão de aprovação chama `role: "approve"`.

### Chat Livre (econômico/profundo)
- `role: "chat"` na UI chama `/api/chat` diretamente (sem fila).
- Modelo barato por padrão; toggle “Pesquisa profunda” usa modelo maior.
- Heurística sugere escalar para orquestração quando detectar intenção de ação (patch/PR/merge/testes/refator).

### Single-agent rápido
- `/api/agent` roda Semgrep + npm/pip audit + heurísticas de compliance e produz patches/testes no reply.

## Configuração / Env
- **OpenAI**: `OPENAI_API_KEY`; modelos podem ser override em chat (`OPENAI_CHEAP_MODEL`, `OPENAI_DEEP_MODEL`).
- **Redis**: para fila `agents` e stream de resultados (config em `src/lib/queue`, não mostrado aqui).
- **Postgres**: `AUDIT_DB_URL` ou `PGVECTOR_URL` para auditoria; ensureSchema cria tabelas/índices.
- **Sandbox**: `LEGACYGUARD_SANDBOX_ENABLED=true`, `LEGACYGUARD_SANDBOX_REPO_PATH`, `LEGACYGUARD_SANDBOX_COMMAND`, `LEGACYGUARD_SANDBOX_RUNNER`, `LEGACYGUARD_SANDBOX_TIMEOUT_MS`.
- **Repo path default**: `LEGACYGUARD_REPO_PATH` usado no contexto.
- **Desabilitar Turbopack (Windows)**: `NEXT_DISABLE_TURBOPACK=1` para rodar `npm run dev` sem travar.

## Pricing / Quotas (planejado)
- Placeholder em `src/lib/pricing.ts`: planos free/pro/enterprise; preços por 1k tokens (inclui gpt-5.1-codex-max, gpt-4o, gpt-4o-mini); função `estimateCostUSD` e tracker in-memory.
- Chat já retorna `usage` (prompt/completion tokens + estimativa USD) e `costTier`.
- **A implementar**: persistência por usuário/mês (Postgres), associação com plano do usuário (`session.plan`), bloqueio ou overage conforme `hardCap`, exibir saldo/custo na UI, integração futura com billing da Vercel.

## Passos recomendados (roadmap)
1) **Estabilizar dev**: no Windows, `NEXT_DISABLE_TURBOPACK=1 npm run dev`.
2) **Auditoria**: rodar ensureSchema ou `scripts/audit_schema.sql`; configurar AUDIT_DB_URL.
3) **CI**: workflow lint/test; opcional Semgrep; gate de merge.
4) **Sandbox**: política configurável (fail ou warn) e presets por stack; habilitar via ENV.
5) **RAG/Indexação**: ligar advisor/advisor-impact ao indexador/pgvector; expor cron/endpoint de index.
6) **Quotas/Billing**: persistir uso, ler plano do usuário, aplicar limites; exibir saldo/custo na UI.
7) **UX**: exibir tier/custo estimado no chat; erros SSE/worker mais claros; tooltips sobre quando usar orquestração vs chat.

## Scripts úteis
- `npm run dev` — dev server (Linux/Mac)
- `npm run dev:win` — dev server (Windows, sem Turbopack)
- `npm run build` — build de produção
- `npm run worker` — inicia worker da fila
- `npm test` — roda testes com Vitest
- `npm run test:watch` — testes em modo watch
- `npm run lint` — lint com ESLint

## CI/CD
Workflow em `.github/workflows/ci.yml`:
- Lint + type check
- Testes automatizados
- Build
- Scan de segurança com Semgrep

## Notas de segurança
- Tokens GitHub/OpenAI são mascarados automaticamente em logs e auditoria (`src/lib/secrets.ts`).
- Executor/merge exige aprovação humana quando `requiresApproval`.
- Sandbox recomendado antes de executor para repositórios sensíveis.
- Política de sandbox configurável: `failMode: 'fail'` (padrão) ou `'warn'`.
- Presets de comando por stack (npm/yarn/pnpm, pytest, go test, cargo test) detectados automaticamente.
