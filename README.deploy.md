# Deploy e provisionamento (Render + serviços externos)

Este documento descreve os passos mínimos para provisionar os serviços externos que `legacyguard` precisa e como fazer deploy no Render.

## 1) Configurar projeto no Render

O arquivo `render.yaml` já está configurado com todos os serviços necessários:
- **Web Service**: Aplicação Next.js principal
- **Worker Service**: Worker para processamento de fila Redis

Para deploy automático, conecte o repositório no dashboard do Render e ele detectará o `render.yaml`.

## 2) Provisionar serviços externos

- **Postgres** (audit + RAG/pgvector): usar Supabase ou Neon. Habilite a extensão `pgvector`.
  - Se usar Supabase: crie um projeto, pegue a connection string (valor para `AUDIT_DB_URL` ou `PGVECTOR_URL`).
  - Rode o script de bootstrap se necessário: `scripts/pgvector_bootstrap.sql`.

- **Redis** (fila/streams): usar Upstash, Redis Cloud ou AWS Elasticache.
  - Obtenha `REDIS_URL` (ex.: `redis://:password@host:6379`).

## 3) Configurar variáveis de ambiente no Render

Use o painel do serviço em Settings → Environment ou configure no `render.yaml`:

Variáveis necessárias:
- `OPENAI_API_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (URL do seu serviço Render)
- `GITHUB_ID`
- `GITHUB_SECRET`
- `REDIS_URL`
- `AUDIT_DB_URL`
- `PGVECTOR_URL`

Veja `scripts/render/env-apply.sh` para aplicar variáveis automaticamente.

## 4) Worker/background

O Render suporta perfeitamente processos long-running. O worker está configurado no `render.yaml` como um serviço separado.

- Use o `Dockerfile.worker` presente no repo (instala dependências e executa `npm run worker`).
- Configure as mesmas variáveis de ambiente no serviço do worker.

## 5) Boas práticas e notas

- Habilite backups e monitoramento no Postgres/Redis.
- Se for usar pgvector, confirme o tamanho do embedding e o custo de pesquisa; recomenda-se usar embeddings assíncronos e batches.
- O Render oferece health checks automáticos — configure conforme necessário.

## 6) Comandos úteis para verificação local

```bash
# rodar app locally
npm install
npm run dev

# rodar worker local (abre outro terminal)
npm run worker
```

## 7) Arquivos de configuração

- `render.yaml` — Configuração completa do deploy no Render
- `.env.example` — Template de variáveis de ambiente
- `Dockerfile.worker` — Container para executar o worker
