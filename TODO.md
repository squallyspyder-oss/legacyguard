# Plano de Lapidação LegacyGuard

## Visão
Plataforma de confiabilidade e segurança assistida por IA: incident-first, sandbox forte, auditoria completa e mitigação provada.

## Pilares
- Incident Digital Twin (reprodução determinística + prova de mitigação)
- Orquestração com guardrails (safe-mode, approvals, policies, isolamento)
- Contexto total (código, infra, pipelines, telemetria) com RAG seguro
- Ação segura (patch/config/runbook com rollback e impact guardrails)
- Compliance & auditoria (logs SSE, evidências, assinatura)

## Roadmap
1) Fundação (2-4s)
   - Mock LLM/Planner para testes; multi-LLM
   - Worker resiliente (retry/backoff/DLQ), SSE unificado
   - Policies de aprovação/escopo; hardening sandbox (Firecracker/Kata/Wasm)
2) Twin Builder + AIOps (4-6s)
   - Conectores Sentry/Datadog/Otel; fixtures/testes sintéticos
   - Auto-detect de comandos (test/build/lint/sec) por stack
   - Impact guardrails e UI de incidentes (logs live, rollback)
3) Reliability & Compliance (6-10s)
   - Métricas MTTR/mitigação, regressões 0
   - Auditoria avançada (assinatura, export SOC2/ISO), playbooks DSL
   - Multi-tenant (RBAC/ABAC), vault de segredos

## Diferenciais vs. Copilot
- Incident-first com gêmeo digital e prova de não-regressão
- Isolamento forte + policies/approvals
- Auditoria estruturada e evidências
- Multi-superfície: código, config, CI/CD, feature-flags/traffic-shift

## KPIs
- p50 reprodução < 5m; p90 < 15m
- Mitigação provada < 30m (p50)
- Regressões pós-aplicação → 0 nos fluxos com twin
- % execuções com isolamento+aprovação alta
- Custo/tokens otimizado por multi-LLM/caching

## Riscos
- Dependência de LLM único; falta de isolamento forte; ausência de RBAC/ABAC; UX se twin não reproduz

---

# Protótipo: Rede Neural de Engenharia Reversa (RNER)
Objetivo: inferir comportamento de binários/scripts/trechos legados para gerar modelos de interação, detectar padrões de falha e sugerir mitigação dentro do Twin Builder.

Arquitetura proposta (pipeline):
1) Ingestão: binário/artefato ou código ofuscado; metadados (stack, so, símbolos parciais) e traces (se houver).
2) Lifting/IR: usar descompilação/parsing para IR (e.g., LLVM IR, JS AST) ou traços de execução sintéticos em sandbox controlado.
3) Feature Builder: extrai syscalls, fluxos de I/O, CFG simplificado, strings-chave, uso de rede/FS, métricas de entropia.
4) Modelo: encoder de sequência/grafo (GNN + Transformer) treinado/fine-tuned para:
   - Classificar famílias de comportamento (exfil, crypto, network client/server, parsing de config)
   - Predizer pontos de falha (hotspots) e pré-condições
   - Sugerir harness/fixtures para reprodução no Twin
5) Output integrado:
   - Gera “perfil” do artefato (rotas críticas, dependências, I/O) e casos de teste sintéticos.
   - Alimenta o Twin Builder com fixtures/harness e comandos recomendados.

Integração com LegacyGuard:
- Rodar RNER dentro do sandbox (no Twin Builder) com limites de CPU/memória.
- Alimentar SSE de logs com perfis e riscos (scope: audit/sandbox).
- Guardrails: sem rede externa, mascarar strings sensíveis, limitar dumps.

MVP técnico:
- Etapa de features: coletar syscalls/CFG via ferramentas open (radare2/ghidra headless) + parser leve.
- Modelo inicial: encoder Transformer para sequência de syscalls + MLP para classes de comportamento; treinar com dataset público (malware/benchmarks) adaptado para classificação de padrões de I/O.
- Saída: recomendações de comandos de reprodução e fixtures sintéticos para o Twin.

Evolução:
- Trocar para GNN sobre CFG quando disponível.
- Meta-learning para adaptar a novos binários com poucas execuções.
- Integração com regras de política: bloquear execuções suspeitas antes de patches.
