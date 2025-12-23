# Deploy e provisionamento (Vercel + serviços externos)

Este documento descreve os passos mínimos para provisionar os serviços externos que `legacyguard` precisa e como conectar ao Vercel.

1) Criar projeto no Vercel

- Instale a CLI (opcional):

```bash
npm i -g vercel
vercel login
vercel link
```

- No dashboard do Vercel, crie um novo projeto apontando para este repositório.

2) Provisionar serviços externos

- Postgres (audit + RAG/pgvector): usar Supabase ou Neon. Habilite a extensão `pgvector`.
  - Se usar Supabase: crie um projeto, pegue a connection string (valor para `AUDIT_DB_URL` ou `PGVECTOR_URL`).
  - Rode o script de bootstrap se necessário: `scripts/pgvector_bootstrap.sql`.

- Redis (fila/streams): usar Upstash, Redis Cloud ou AWS Elasticache.
  - Obtenha `REDIS_URL` (ex.: `redis://:password@host:6379`).

3) Configurar variáveis de ambiente no Vercel

Use o painel do projeto em Settings → Environment Variables ou a CLI:

```bash
vercel env add OPENAI_API_KEY production
vercel env add NEXTAUTH_SECRET production
vercel env add NEXTAUTH_URL production
vercel env add GITHUB_ID production
vercel env add GITHUB_SECRET production
vercel env add REDIS_URL production
vercel env add AUDIT_DB_URL production
vercel env add PGVECTOR_URL production
```

Substitua `production` por `preview`/`development` conforme necessário.

4) Worker/background

Vercel não é ideal para processos long-running; recomendamos rodar o worker (`npm run worker`) em um serviço separado (Render, Fly, Cloud Run, ou um container Docker).

- Exemplo rápido com Render (Docker):
  - Crie um serviço no Render do tipo "Docker" apontando para este repo.
  - Use o `Dockerfile.worker` presente no repo (vai instalar dependências e executar `npm run worker`).
  - Configure as mesmas variáveis de ambiente no serviço do worker.

5) Boas práticas e notas

- As `env` em `vercel.json` usam referências a secrets (`@NAME`) como marcador — você ainda deve adicionar os secrets no painel do Vercel.
- Habilite backups e monitoramento no Postgres/Redis.
- Se for usar pgvector, confirme o tamanho do embedding e o custo de pesquisa; recomenda-se usar embeddings assíncronos e batches.

6) Comandos úteis para verificação local

```bash
# rodar app locally
npm install
npm run dev

# rodar worker local (abre outro terminal)
npm run worker
```

7) Arquivos criados

- `vercel.json` — mapear build e variáveis de ambiente (placeholders)
- `.env.example` — template de variáveis de ambiente
- `Dockerfile.worker` — container para executar o worker em serviços Docker-friendly
