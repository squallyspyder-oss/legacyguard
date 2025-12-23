Indexação Monorepo - LegacyGuard

Este script ajuda a indexar um monorepo e enviar embeddings para um banco com pgvector.

Pré-requisitos:
- Banco Postgres com extensão pgvector instalada (veja `scripts/pgvector_bootstrap.sql`).
- Variáveis de ambiente: `PGVECTOR_URL` (connection string) e `OPENAI_API_KEY`.
- Instalar dependências: `npm install`.

Como rodar (dentro da raiz do repo):

```bash
# instala dependências de desenvolvimento
npm install

# rodar indexação (opcional: passar caminho da raiz do monorepo)
npx ts-node scripts/index_monorepo.ts
# ou com parâmetro
npx ts-node scripts/index_monorepo.ts /path/to/repo
```

O script irá:
- Detectar pacotes em `packages/`, `apps/`, `services/` e workspaces do `package.json`.
- Carregar arquivos de código com limites de segurança.
- Construir um grafo leve em memória para cada pacote.
- Se `PGVECTOR_URL` + `OPENAI_API_KEY` estiverem configurados, gerar embeddings e upsert em `code_chunks`.
- Gerar `scripts/index_monorepo_report.json` com um resumo por pacote.

Dicas:
- Para grandes monorepos, execute em máquina com boa largura de banda e aumente a configuração de listas IVFFLAT no banco.
- Ajuste o número de arquivos carregados em `loadCodeFiles` se necessário.
