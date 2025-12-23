#!/usr/bin/env bash
set -euo pipefail

# Runner sandbox: executa testes em container para isolar efeitos colaterais.
# Requer Docker instalado.
# Uso:
#   ./scripts/runner_sandbox.sh <repo-dir> "npm test"
# Exemplo:
#   ./scripts/runner_sandbox.sh /path/to/repo "npm test"

REPO_DIR=${1:-}
CMD=${2:-"npm test"}

if [ -z "$REPO_DIR" ]; then
  echo "Uso: $0 <repo-dir> 'comando-de-teste'" >&2
  exit 1
fi

IMAGE=node:20-bullseye
CONTAINER_NAME=lg-sandbox-$$

# Monta o diretório em /workspace (read-only) e cria /tmp para write

docker run --rm \
  --name "$CONTAINER_NAME" \
  -v "$REPO_DIR":/workspace:ro \
  -v "$REPO_DIR"/.sandbox-tmp:/tmp:rw \
  -w /workspace \
  $IMAGE \
  bash -lc "ls >/dev/null && $CMD"
