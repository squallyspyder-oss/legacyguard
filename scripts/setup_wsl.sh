#!/usr/bin/env bash
set -euo pipefail

# Script de setup (pensado para WSL/WSL2, mas funciona em Linux)
# Faz: verifica Node, instala dependências do projeto, torna runner executável, exporta var de ambiente e roda os testes.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "Diretório do projeto: $ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Erro: Node.js não encontrado. Instale Node 18+ e tente novamente."
  exit 1
fi

echo "Versão do Node: $(node -v)"

echo "Instalando dependências (npm install)..."
npm install

if [ -f scripts/runner_sandbox.sh ]; then
  chmod +x scripts/runner_sandbox.sh || true
  echo "Feito: scripts/runner_sandbox.sh marcado como executável"
else
  echo "Aviso: scripts/runner_sandbox.sh não encontrado"
fi

export LEGACYGUARD_SANDBOX_ENABLED=true

echo "Variável LEGACYGUARD_SANDBOX_ENABLED=true"

echo "Iniciando testes: npm test (pode demorar)..."
npm test

echo "Script concluído."
