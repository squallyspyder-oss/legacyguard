"use client";

import { useState } from "react";

type StatusType = "connected" | "disconnected" | "ready" | "unavailable" | "unknown" | boolean;

function StatusIcon({ status }: { status: StatusType }) {
  if (status === true || status === "connected" || status === "ready") {
    return <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" title="Ativo" />;
  }
  if (status === false || status === "disconnected" || status === "unavailable") {
    return <span className="inline-block w-2 h-2 rounded-full bg-rose-400 shadow-sm shadow-rose-400/50" title="Inativo" />;
  }
  return <span className="inline-block w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50 animate-pulse" title="Verificando..." />;
}

type GovernanceSidebarProps = {
  // Security & Sandbox
  sandboxEnabled: boolean;
  onToggleSandbox: (value: boolean) => void;
  sandboxMode: "fail" | "warn";
  onChangeSandboxMode: (value: "fail" | "warn") => void;
  safeMode: boolean;
  onToggleSafeMode: (value: boolean) => void;
  reviewGate: boolean;
  onToggleReviewGate: (value: boolean) => void;
  maskingEnabled: boolean;
  onToggleMasking: (value: boolean) => void;
  // Infrastructure status
  workerEnabled: boolean;
  onToggleWorker: (value: boolean) => void;
  workerStatus?: "connected" | "disconnected" | "unknown";
  sandboxStatus?: "ready" | "unavailable" | "unknown";
  apiEnabled: boolean;
  onToggleApi: (value: boolean) => void;
  // Models & Cost
  deepSearch: boolean;
  onToggleDeep: (value: boolean) => void;
  temperatureCap: number;
  onChangeTemperatureCap: (value: number) => void;
  tokenCap: number;
  onChangeTokenCap: (value: number) => void;
  billingCap: number;
  onChangeBillingCap: (value: number) => void;
  estimatedCost?: number;
  // RAG & Context
  ragReady: boolean;
  onToggleRagReady: (value: boolean) => void;
  ragProgress?: number; // 0-100
  onReindex?: () => void;
};

export default function GovernanceSidebar({
  sandboxEnabled,
  onToggleSandbox,
  sandboxMode,
  onChangeSandboxMode,
  safeMode,
  onToggleSafeMode,
  reviewGate,
  onToggleReviewGate,
  maskingEnabled,
  onToggleMasking,
  workerEnabled,
  onToggleWorker,
  workerStatus = "unknown",
  sandboxStatus = "unknown",
  apiEnabled,
  onToggleApi,
  deepSearch,
  onToggleDeep,
  temperatureCap,
  onChangeTemperatureCap,
  tokenCap,
  onChangeTokenCap,
  billingCap,
  onChangeBillingCap,
  estimatedCost,
  ragReady,
  onToggleRagReady,
  ragProgress,
  onReindex,
}: GovernanceSidebarProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>("security");

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const getSecurityScore = () => {
    let score = 0;
    if (sandboxEnabled) score += 20;
    if (sandboxMode === "fail") score += 10;
    if (safeMode) score += 25;
    if (reviewGate) score += 25;
    if (maskingEnabled) score += 20;
    return score;
  };

  const securityScore = getSecurityScore();

  return (
    <aside className="glass rounded-2xl p-4 flex flex-col gap-4 h-full overflow-y-auto">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-emerald-400/20 border border-emerald-300/30 flex items-center justify-center text-lg">⚙️</div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-100">Governança & Controles</p>
          <p className="text-xs text-slate-400">Guardrails de segurança</p>
        </div>
        <div className={`text-[11px] px-2 py-1 rounded-full ${
          securityScore >= 80 
            ? "bg-emerald-500/15 text-emerald-200 border border-emerald-400/30"
            : securityScore >= 50
              ? "bg-amber-500/15 text-amber-200 border border-amber-400/30"
              : "bg-rose-500/15 text-rose-200 border border-rose-400/30"
        }`}>
          {securityScore}%
        </div>
      </div>

      {/* Security & Sandbox Section */}
      <section className="rounded-xl border border-white/5 bg-white/5 overflow-hidden">
        <button
          onClick={() => toggleSection("security")}
          className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🛡️</span>
            <p className="text-xs font-semibold text-slate-200">Segurança & Sandbox</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusIcon status={sandboxEnabled && safeMode} />
            <span className={`text-slate-400 transition-transform ${expandedSection === "security" ? "rotate-180" : ""}`}>
              ▼
            </span>
          </div>
        </button>
        
        {expandedSection === "security" && (
          <div className="p-3 pt-0 space-y-3 border-t border-white/5">
            <ToggleRow 
              label="Sandbox" 
              helper="Executar em ambiente isolado" 
              checked={sandboxEnabled} 
              onChange={onToggleSandbox}
              status={sandboxEnabled}
            />
            
            {sandboxEnabled && (
              <div className="flex items-center justify-between text-xs text-slate-300 pl-4 border-l-2 border-white/10">
                <span>Modo sandbox</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => onChangeSandboxMode("fail")}
                    className={`px-3 py-1 rounded-lg border text-[11px] transition-colors ${
                      sandboxMode === "fail" 
                        ? "bg-rose-500/20 border-rose-400/40 text-rose-100" 
                        : "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"
                    }`}
                  >
                    Fail (bloqueia)
                  </button>
                  <button
                    onClick={() => onChangeSandboxMode("warn")}
                    className={`px-3 py-1 rounded-lg border text-[11px] transition-colors ${
                      sandboxMode === "warn" 
                        ? "bg-amber-500/20 border-amber-400/40 text-amber-100" 
                        : "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"
                    }`}
                  >
                    Warn
                  </button>
                </div>
              </div>
            )}
            
            <ToggleRow 
              label="Safe mode" 
              helper="Bloqueia execuções destrutivas" 
              checked={safeMode} 
              onChange={onToggleSafeMode}
              status={safeMode}
            />
            <ToggleRow 
              label="Reviewer obrigatório" 
              helper="Valida patches antes do executor" 
              checked={reviewGate} 
              onChange={onToggleReviewGate}
              status={reviewGate}
            />
            <ToggleRow 
              label="Mascaramento de segredos" 
              helper="ON recomendado em produção" 
              checked={maskingEnabled} 
              onChange={onToggleMasking}
              status={maskingEnabled}
            />
          </div>
        )}
      </section>

      {/* Infrastructure Status Section */}
      <section className="rounded-xl border border-white/5 bg-white/5 overflow-hidden">
        <button
          onClick={() => toggleSection("infra")}
          className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🖥️</span>
            <p className="text-xs font-semibold text-slate-200">Infraestrutura</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusIcon status={workerStatus} />
            <span className={`text-slate-400 transition-transform ${expandedSection === "infra" ? "rotate-180" : ""}`}>
              ▼
            </span>
          </div>
        </button>
        
        {expandedSection === "infra" && (
          <div className="p-3 pt-0 space-y-3 border-t border-white/5">
            <div className="flex items-center justify-between rounded-lg px-3 py-2 border border-white/10 bg-black/10">
              <div className="flex items-center gap-2">
                <StatusIcon status={workerStatus} />
                <div>
                  <p className="text-sm text-slate-100 font-semibold">Worker/Redis</p>
                  <p className="text-[11px] text-slate-400">
                    {workerStatus === "connected" ? "Conectado" : workerStatus === "disconnected" ? "Desconectado" : "Verificando..."}
                  </p>
                </div>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-emerald-500"
                  checked={workerEnabled}
                  onChange={(e) => onToggleWorker(e.target.checked)}
                />
                <span className="text-[11px] text-slate-200">{workerEnabled ? "On" : "Off"}</span>
              </label>
            </div>
            
            <div className="flex items-center justify-between rounded-lg px-3 py-2 border border-white/10 bg-black/10">
              <div className="flex items-center gap-2">
                <StatusIcon status={sandboxStatus} />
                <div>
                  <p className="text-sm text-slate-100 font-semibold">Sandbox Docker</p>
                  <p className="text-[11px] text-slate-400">
                    {sandboxStatus === "ready" ? "Disponível" : sandboxStatus === "unavailable" ? "Indisponível" : "Verificando..."}
                  </p>
                </div>
              </div>
            </div>
            
            <ToggleRow 
              label="API pública" 
              helper="Chaves rotacionáveis" 
              checked={apiEnabled} 
              onChange={onToggleApi}
            />
            <ToggleRow 
              label="Webhooks" 
              helper="Eventos de orquestração" 
              checked={false} 
              onChange={() => {}}
              disabled
            />
          </div>
        )}
      </section>

      {/* Models & Cost Section */}
      <section className="rounded-xl border border-white/5 bg-white/5 overflow-hidden">
        <button
          onClick={() => toggleSection("models")}
          className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">💰</span>
            <p className="text-xs font-semibold text-slate-200">Modelos & Custo</p>
          </div>
          <div className="flex items-center gap-2">
            {estimatedCost !== undefined && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-100 border border-cyan-400/30">
                ~${estimatedCost.toFixed(2)}
              </span>
            )}
            <span className={`text-slate-400 transition-transform ${expandedSection === "models" ? "rotate-180" : ""}`}>
              ▼
            </span>
          </div>
        </button>
        
        {expandedSection === "models" && (
          <div className="p-3 pt-0 space-y-3 border-t border-white/5">
            <ToggleRow 
              label="Pesquisa profunda" 
              helper="Ativa modelo mais robusto" 
              checked={deepSearch} 
              onChange={onToggleDeep}
            />
            <SliderRow 
              label="Temperature cap" 
              value={temperatureCap} 
              onChange={onChangeTemperatureCap} 
              min={0} 
              max={1} 
              step={0.05} 
              display={`${(temperatureCap * 100).toFixed(0)}%`} 
            />
            <SliderRow 
              label="Limite tokens/resposta" 
              value={tokenCap} 
              onChange={onChangeTokenCap} 
              min={2000} 
              max={24000} 
              step={1000} 
              display={`${tokenCap}`} 
            />
            <SliderRow 
              label="Teto custo diário" 
              value={billingCap} 
              onChange={onChangeBillingCap} 
              min={5} 
              max={100} 
              step={5} 
              display={`USD ${billingCap}`} 
            />
            <p className="text-[11px] text-slate-400">
              Respostas de alto risco devem vir com citações e diffs antes de execução.
            </p>
          </div>
        )}
      </section>

      {/* RAG & Context Section */}
      <section className="rounded-xl border border-white/5 bg-white/5 overflow-hidden">
        <button
          onClick={() => toggleSection("rag")}
          className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📚</span>
            <p className="text-xs font-semibold text-slate-200">Dados & Índice</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusIcon status={ragReady ? "ready" : ragProgress !== undefined && ragProgress > 0 ? "unknown" : "unavailable"} />
            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
              ragReady 
                ? "bg-emerald-500/15 text-emerald-100 border-emerald-400/30" 
                : "bg-amber-500/15 text-amber-100 border-amber-400/30"
            }`}>
              {ragReady ? "Indexado" : ragProgress !== undefined && ragProgress > 0 ? `${ragProgress}%` : "Pendente"}
            </span>
            <span className={`text-slate-400 transition-transform ${expandedSection === "rag" ? "rotate-180" : ""}`}>
              ▼
            </span>
          </div>
        </button>
        
        {expandedSection === "rag" && (
          <div className="p-3 pt-0 space-y-3 border-t border-white/5">
            <p className="text-[11px] text-slate-300">
              RAG precisa estar indexado para respostas com contexto de repositório. Evita alucinações.
            </p>
            
            {ragProgress !== undefined && ragProgress > 0 && ragProgress < 100 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300">Progresso da indexação</span>
                  <span className="text-emerald-200">{ragProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${ragProgress}%` }}
                  />
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <button 
                onClick={onReindex}
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-200 hover:bg-white/10 transition-colors"
              >
                Reindexar
              </button>
              <button
                onClick={() => onToggleRagReady(!ragReady)}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  ragReady
                    ? "bg-emerald-500/20 text-emerald-100 border border-emerald-400/40"
                    : "bg-white/5 text-slate-200 border border-white/10 hover:bg-white/10"
                }`}
              >
                {ragReady ? "✓ Pronto" : "Marcar pronto"}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Fontes externas (Confluence, Jira, GitHub PRs) ficam off até habilitar.
            </p>
          </div>
        )}
      </section>

      {/* Risk Mitigation Section */}
      <section className="rounded-xl border border-white/5 bg-white/5 overflow-hidden">
        <button
          onClick={() => toggleSection("risk")}
          className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <p className="text-xs font-semibold text-slate-200">Mitigação de Risco</p>
          </div>
          <span className={`text-slate-400 transition-transform ${expandedSection === "risk" ? "rotate-180" : ""}`}>
            ▼
          </span>
        </button>
        
        {expandedSection === "risk" && (
          <div className="p-3 pt-0 space-y-2 border-t border-white/5">
            <Bullet text="Exigir citações de origem para sugestões de código" />
            <Bullet text="Circuit-breaker: limite de passos e tempo por orquestração" />
            <Bullet text="Dry-run/sandbox antes de qualquer escrita ou deploy" />
            <Bullet text="Bloquear mudanças em pastas críticas sem aprovação" />
            <Bullet text="Alertar confiança baixa e pedir confirmação" />
          </div>
        )}
      </section>

      {/* Help Section */}
      <div className="mt-auto rounded-xl border border-white/5 bg-white/5 p-3">
        <p className="text-[11px] text-slate-300 leading-relaxed">
          <strong className="text-slate-100">Coluna 3:</strong> Controles avançados e guardrails de segurança para operações de alto risco.
        </p>
      </div>
    </aside>
  );
}

function ToggleRow({ 
  label, 
  helper, 
  checked, 
  onChange, 
  disabled,
  status 
}: { 
  label: string; 
  helper?: string; 
  checked: boolean; 
  onChange: (v: boolean) => void; 
  disabled?: boolean;
  status?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between rounded-lg px-3 py-2 border ${
      disabled ? "border-white/5 bg-white/5 opacity-60" : "border-white/10 bg-black/10"
    }`}>
      <div className="flex items-center gap-2">
        {status !== undefined && (
          <span className={`inline-block w-2 h-2 rounded-full ${
            status ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : "bg-rose-400 shadow-sm shadow-rose-400/50"
          }`} />
        )}
        <div>
          <p className="text-sm text-slate-100 font-semibold">{label}</p>
          {helper && <p className="text-[11px] text-slate-400">{helper}</p>}
        </div>
      </div>
      <label className="inline-flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          className="h-4 w-4 accent-emerald-500"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="text-[11px] text-slate-200">{checked ? "On" : "Off"}</span>
      </label>
    </div>
  );
}

function SliderRow({ 
  label, 
  value, 
  onChange, 
  min, 
  max, 
  step, 
  display 
}: { 
  label: string; 
  value: number; 
  onChange: (v: number) => void; 
  min: number; 
  max: number; 
  step: number; 
  display: string; 
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-slate-200">
        <span className="font-semibold">{label}</span>
        <span className="text-[11px] text-slate-300">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-emerald-500"
      />
    </div>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <p className="text-[11px] text-slate-300 flex items-start gap-2">
      <span className="text-emerald-400 mt-0.5">✓</span>
      {text}
    </p>
  );
}
