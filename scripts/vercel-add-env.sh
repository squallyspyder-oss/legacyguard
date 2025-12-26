#!/usr/bin/env bash
set -euo pipefail

# Lê .env.example (ou .env) e chama vercel env add para cada chave
# Uso: export VERCEL_TOKEN=... && ./scripts/vercel-add-env.sh production

ENV_FILE=".env.example"
ENVIRONMENT=${1:-production}

if ! command -v vercel >/dev/null 2>&1; then
  echo "Erro: CLI do Vercel não encontrada. Instale: npm i -g vercel" >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Arquivo $ENV_FILE não encontrado" >&2
  exit 1
fi

echo "Ambiente alvo: $ENVIRONMENT"

while IFS= read -r line; do
  # ignora comentários e linhas vazias
  [[ "$line" =~ ^# ]] && continue
  [[ -z "$line" ]] && continue

  if [[ "$line" =~ ^([A-Za-z0-9_]+)=(.*)$ ]]; then
    key="${BASH_REMATCH[1]}"
    default="${BASH_REMATCH[2]}"

    echo "Adicionando/atualizando $key no Vercel ($ENVIRONMENT)"
    # Se houver valor por padrão no arquivo, não o envie para o vercel CLI
    # pois normalmente são placeholders. Chamamos vercel de forma interativa
    # para que o usuário cole o valor (mais seguro que gravar secrets no repo).
    echo "Execute: vercel env add $key $ENVIRONMENT"
    echo "Ou rode: vercel env add $key <value> $ENVIRONMENT"
  fi
done < "$ENV_FILE"

echo "Pronto. Agora execute os comandos indicados ou copie/cole os valores no painel do Vercel." 
