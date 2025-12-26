# Configurar variáveis de ambiente no Vercel

Este script ajuda a preparar os comandos para adicionar as variáveis de ambiente listadas em `.env.example` ao seu projeto Vercel.

Passos:

1. Instale e faça login na CLI do Vercel:

```bash
npm i -g vercel
vercel login
vercel link
```

2. Rode o script para gerar os comandos:

```bash
chmod +x scripts/vercel-add-env.sh
./scripts/vercel-add-env.sh production
```

3. Para cada variável, execute o comando sugerido ou cole o valor no painel do projeto em Settings → Environment Variables.

Observações:
- Não versione secrets no repositório. Use o painel do Vercel ou `vercel env add` para armazenar valores sensíveis.
- Para ambientes `preview` ou `development`, passe o nome do ambiente como argumento.
