# Deploy e provisionamento (Render + serviços externos)

Este documento descreve os passos mínimos para provisionar os serviços externos que `legacyguard` precisa e como implantar no Render.

1) Criar serviços no Render

- Acesse https://dashboard.render.com e crie um workspace/projeto se ainda não tiver.
- Crie dois serviços:
  - `legacyguard-web` — tipo `Web Service` (Node). Configure o comando de build `npm ci && npm run build` e start `npm run start`.
  - `legacyguard-worker` — tipo `Background Worker` ou `Docker` (se preferir usar `Dockerfile.worker`).

Você também pode criar os serviços via Render CLI:

```bash
# exemplo (ajuste flags conforme necessidade):
render services create --name legacyguard-web --env node --region oregon --branch main --build-command "npm ci && npm run build" --start-command "npm run start"
render services create --name legacyguard-worker --env docker --region oregon --branch main --dockerfile Dockerfile.worker
```

2) Provisionar serviços externos

- Postgres (audit + RAG/pgvector): use Supabase, Neon ou um Postgres gerenciado. Habilite `pgvector` se for usar RAG.
  - Se usar Supabase: crie um projeto e pegue a connection string (`PGVECTOR_URL` / `AUDIT_DB_URL`).
  - Rode os scripts SQL fornecidos (`pgvector_bootstrap.sql`) conforme necessário.

- Redis (fila/streams): use Upstash, Redis Cloud ou AWS ElastiCache.
  - Obtenha `REDIS_URL` (ex.: `redis://:password@host:6379`).

3) Configurar variáveis de ambiente no Render

Use o Dashboard do Render ou a CLI para aplicar variáveis de ambiente (recomendado: `render services env set`). Exemplo via CLI:

```bash
render services env set legacyguard-web OPENAI_API_KEY "sk-..."
render services env set legacyguard-web NEXTAUTH_SECRET "..."
render services env set legacyguard-web NEXTAUTH_URL "https://your-app.onrender.com"
render services env set legacyguard-web GITHUB_ID "..."
render services env set legacyguard-web GITHUB_SECRET "..."
render services env set legacyguard-web REDIS_URL "redis://..."
# repita para legacyguard-worker
```

4) Deploys

- Após configurar as `envs`, acione um deploy pela Dashboard ou CLI:

```bash
render deploys create <SERVICE_ID>
render deploys list <SERVICE_ID>
```

5) Worker/background

Recomendamos executar o worker como um serviço dedicado no Render (Background Worker) ou como serviço Docker se usar imagens.

6) Boas práticas

- Habilite backups e monitoramento no Postgres/Redis.
- Use tokens/segredos via `render services env set` ou `RENDER_API_KEY` para CI.
- Revogue tokens antigos no dashboard.

7) Verificações e comandos úteis

```bash
render services list
render services env list legacyguard-web
render services env list legacyguard-worker
render logs legacyguard-web
render logs legacyguard-worker
```

8) Testes locais (antes do deploy)

Web:
```bash
npm ci
npm run build
npm run start
# verificar http://localhost:3000
```

Worker:
```bash
npm run build:worker
npm run start:worker
```

Segurança: não compartilhe chaves em chats. Use `render login` para autenticar interativamente ou `RENDER_API_KEY` em CI.
