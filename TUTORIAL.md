# 🚀 TUTORIAL: Deploy do LegacyGuard no Render

Este tutorial guia você na configuração completa do LegacyGuard no Render.

---

## 📋 Pré-requisitos

### Contas Necessárias

| Serviço | Obrigatório | Para quê | Link |
|---------|-------------|----------|------|
| **Render** | ✅ Sim | Hospedagem | [render.com](https://render.com) |
| **OpenAI** | ✅ Sim | LLM (GPT-4o) | [platform.openai.com](https://platform.openai.com) |
| **GitHub** | ✅ Sim | Repositório + API | [github.com](https://github.com) |
| **Neon** | ✅ Sim | Postgres serverless | [neon.tech](https://neon.tech) |

### Opcionais (Recomendados)

| Serviço | Para quê | Benefício |
|---------|----------|-----------|
| **pgvector** no Neon | Busca semântica RAG | Melhora análise de código |
| **Sentry** | Monitoramento de erros | Alertas de falhas |
| **Upstash** | Redis serverless (quotas) | Rate limiting distribuído |

---

## 🔑 Obter Chaves de API

### 1. OpenAI API Key

1. Acesse [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Clique em **Create new secret key**
3. Copie a chave (começa com `sk-`)
4. **Importante**: Adicione créditos em **Settings > Billing**

```
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

### 2. GitHub Token (Personal Access Token)

1. Acesse [github.com/settings/tokens/new](https://github.com/settings/tokens?type=beta)
2. Selecione **Fine-grained tokens**
3. Configure:
   - **Token name**: `LegacyGuard`
   - **Expiration**: 90 days (ou mais)
   - **Repository access**: Selecione os repos que o LegacyGuard vai acessar
   - **Permissions**:
     - **Contents**: Read and write
     - **Pull requests**: Read and write
     - **Issues**: Read and write
     - **Metadata**: Read-only
4. Clique em **Generate token**

```
GITHUB_TOKEN=github_pat_xxxxxxxxxxxxx
```

### 3. Neon Database URL

1. Acesse [console.neon.tech](https://console.neon.tech)
2. Crie um projeto: **New Project** → Nome: `legacyguard`
3. Copie a **Connection string** (formato pooled)
4. **Habilite pgvector**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

```
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

---

## 🏗️ Configuração no Render

### Opção A: Deploy com Docker (Recomendado)

O modo Docker garante ambiente isolado e consistente.

#### Passo 1: Criar Web Service

1. No Render Dashboard, clique em **New +** → **Web Service**
2. Conecte seu repositório GitHub
3. Configure:

| Campo | Valor |
|-------|-------|
| **Name** | `legacyguard` |
| **Region** | Escolha a mais próxima |
| **Branch** | `main` |
| **Runtime** | **Docker** |
| **Instance Type** | Standard ($7/mês) ou superior |
| **Dockerfile Path** | `./Dockerfile` (raiz do projeto) |

#### Passo 2: Variáveis de Ambiente

No painel **Environment**, adicione:

```env
# Obrigatórias
NODE_ENV=production
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
GITHUB_TOKEN=github_pat_xxxxxxxxxxxxx
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require

# OpenAI Models
OPENAI_CHEAP_MODEL=gpt-4o-mini
OPENAI_DEEP_MODEL=gpt-4o

# Auth (gere um valor aleatório)
NEXTAUTH_SECRET=sua-chave-secreta-de-32-caracteres-minimo
NEXTAUTH_URL=https://legacyguard.onrender.com

# Opcional: pgvector para RAG
PGVECTOR_ENABLED=true

# Opcional: Sandbox Docker
LEGACYGUARD_FORCE_DOCKER=false
```

> 💡 **Dica**: Gere `NEXTAUTH_SECRET` com: `openssl rand -base64 32`

#### Passo 3: Deploy

1. Clique em **Create Web Service**
2. Aguarde o build (primeira vez demora ~5-10 min)
3. Acesse a URL gerada: `https://legacyguard.onrender.com`

---

### Opção B: Deploy com Node.js (Sem Docker)

Mais simples, mas sem suporte a sandbox Docker.

#### Passo 1: Criar Web Service

1. **New +** → **Web Service**
2. Configure:

| Campo | Valor |
|-------|-------|
| **Runtime** | **Node** |
| **Build Command** | `corepack enable && pnpm install && pnpm build` |
| **Start Command** | `pnpm start` |
| **Node Version** | `20` (ou especifique no `.node-version`) |

#### Passo 2: Variáveis de Ambiente

Mesmas do Docker acima.

---

## 🗄️ Configurar Banco de Dados (Neon)

### Criar Tabelas

Execute no Neon SQL Editor:

```sql
-- Habilitar pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Schema de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  action TEXT NOT NULL,
  agent TEXT,
  input JSONB,
  output JSONB,
  cost_usd NUMERIC(10, 6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schema de quotas
CREATE TABLE IF NOT EXISTS user_quotas (
  user_id TEXT PRIMARY KEY,
  tokens_used BIGINT DEFAULT 0,
  tokens_limit BIGINT DEFAULT 1000000,
  requests_today INT DEFAULT 0,
  last_reset DATE DEFAULT CURRENT_DATE,
  tier TEXT DEFAULT 'free'
);

-- Schema de RAG (se pgvector habilitado)
CREATE TABLE IF NOT EXISTS code_embeddings (
  id SERIAL PRIMARY KEY,
  repo_path TEXT NOT NULL,
  file_path TEXT NOT NULL,
  chunk_hash TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repo_path, file_path, chunk_hash)
);

-- Índice para busca vetorial
CREATE INDEX IF NOT EXISTS code_embeddings_vector_idx 
ON code_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

---

## 🐳 Worker de Background (Opcional)

Se você precisa de processamento assíncrono (sandbox Docker, indexação):

### Criar Background Worker

1. **New +** → **Background Worker**
2. Configure:

| Campo | Valor |
|-------|-------|
| **Name** | `legacyguard-worker` |
| **Runtime** | **Docker** |
| **Dockerfile Path** | `./Dockerfile.worker` |

3. Mesmas variáveis de ambiente do Web Service

---

## 🔧 Configurações Avançadas

### Auto-Deploy

No Render, habilite **Auto-Deploy** para deploy automático em cada push.

### Health Check

Configure health check para monitoramento:

| Campo | Valor |
|-------|-------|
| **Path** | `/api/config` |
| **Interval** | 30 seconds |

### Scaling

Para produção, considere:
- **Instância**: Standard ou Pro
- **Auto-scaling**: 2-4 instâncias
- **Memory**: 1GB+ para builds grandes

---

## 📊 Verificar Deploy

Após deploy, teste os endpoints:

```bash
# Health check
curl https://legacyguard.onrender.com/api/config

# Chat (requer auth)
curl -X POST https://legacyguard.onrender.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Olá, estou testando!"}'
```

---

## 🔍 Troubleshooting

### Build Falha

| Erro | Solução |
|------|---------|
| `corepack: command not found` | Use Node 20+ ou adicione `corepack enable` |
| `ENOMEM` | Aumente instância ou use Docker |
| `pnpm-lock.yaml not found` | Rode `pnpm install` local primeiro |

### Runtime Errors

| Erro | Solução |
|------|---------|
| `OPENAI_API_KEY missing` | Verifique variáveis de ambiente |
| `Database connection failed` | Verifique `DATABASE_URL` e SSL |
| `Docker not available` | Normal em Node runtime (use `LEGACYGUARD_FORCE_DOCKER=false`) |

### Logs

Acesse logs no Render Dashboard → Service → Logs

---

## 🎯 Checklist Final

- [ ] Web Service criado no Render
- [ ] Variáveis de ambiente configuradas
- [ ] Neon database configurado com pgvector
- [ ] OpenAI API key com créditos
- [ ] GitHub token com permissões corretas
- [ ] Health check funcionando
- [ ] Primeiro acesso à UI funcionou

---

## 📚 Referências

- [Render Docs](https://render.com/docs)
- [Neon Docs](https://neon.tech/docs)
- [OpenAI API](https://platform.openai.com/docs)
- [Next.js Deploy](https://nextjs.org/docs/deployment)

---

**Pronto!** 🎉 Seu LegacyGuard está rodando no Render.
