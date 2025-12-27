# WSL_SETUP — LegacyGuard (instruções em Português)

Este arquivo descreve como preparar um ambiente Windows com WSL2 + Docker para rodar o projeto LegacyGuard e executar os testes de sandbox.

## Resumo
- Requisitos: Windows 10/11 com WSL2, Docker Desktop (ou Docker Engine acessível via WSL), Acesso à internet.
- Abrir terminal WSL (ex.: Ubuntu) e executar os passos abaixo dentro da distro no diretório do projeto.

## 1) Instalar/ativar WSL2 (se ainda não tiver)
Execute no PowerShell como Administrador:

```powershell
wsl --install -d Ubuntu
# Reinicie o Windows quando solicitado
```

Se já tem WSL mas não está na versão 2, force:

```powershell
wsl --set-default-version 2
```

## 2) Instalar Docker (recomendado: Docker Desktop)
- Instale o Docker Desktop para Windows e ative a integração com WSL2 (Settings → Resources → WSL Integration → habilitar sua distro).
- Alternativamente, configure Docker Engine dentro da distro WSL (avançado).

## 3) Preparar a distro WSL (Ubuntu) — comandos dentro do terminal WSL
Abra o terminal WSL e, se necessário, atualize pacotes e instale dependências úteis:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential curl git ca-certificates
```

Instale Node.js (recomendado usar Node 18/20 LTS). Exemplo com NodeSource (adaptar versão):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

Se usar `nvm`, use sua instalação preferida.

## 4) Clonar / acessar o repositório dentro da WSL
- Se o código estiver no Windows (ex.: `C:\Users\you\projects\legacyguard`), dentro do WSL acesse via `/mnt/c/Users/you/projects/legacyguard`.
- Recomendo clonar diretamente na home da distro para evitar problemas de permissão com Docker:

```bash
cd ~
git clone <repo-url> legacyguard
cd legacyguard
```

## 5) Preparar o projeto
Dentro do diretório do projeto (WSL):

```bash
# Instalar dependências
npm install

# Tornar o runner de sandbox executável
chmod +x scripts/runner_sandbox.sh
```

## 6) Variáveis de ambiente para executar testes com sandbox
Para habilitar o sandbox (conforme README do projeto):

```bash
export LEGACYGUARD_SANDBOX_ENABLED=true
# opcional: ajustar caminho do repositório usado pelo sandbox
# export LEGACYGUARD_SANDBOX_REPO_PATH=/workspace/legacyguard
```

## 7) Executar os testes que usam sandbox
Com Docker Desktop rodando e integração WSL ativada, execute:

```bash
npm test
```

Se preferir só rodar os testes de worker/integração explicite o comando necessário (ver `package.json`).

## 8) Dicas e resolução de problemas
- Docker não aparecendo na WSL: verifique no Docker Desktop → Settings → Resources → WSL Integration se a distro está habilitada.
- Permissões de arquivos: prefira trabalhar no sistema de arquivos da distro (ex.: `~/legacyguard`) em vez de `/mnt/c/...` quando usar containers que montam volumes.
- Se um teste requer `docker.sock`, confirme que a integração WSL está expondo o daemon Docker para a distro.
- Logs: use `docker ps`, `docker logs <container>` e `journalctl -u docker.service` (se aplicável) para depuração.

## 9) Comandos rápidos (recapitulando)

```bash
# no PowerShell (uma vez)
wsl --install -d Ubuntu
wsl --set-default-version 2

# no WSL (Ubuntu)
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential curl git ca-certificates
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# no diretório do projeto
npm install
chmod +x scripts/runner_sandbox.sh
export LEGACYGUARD_SANDBOX_ENABLED=true
npm test
```

---

Se quiser, eu posso:
- Ajustar estas instruções para uma versão específica do Node/Docker,
- Gerar um script `scripts/setup_wsl.sh` para automatizar os passos dentro da distro;
- Adicionar este arquivo ao repositório e criar um commit.

Escolha uma opção ou diga para eu prosseguir com o commit (ou gerar o script).