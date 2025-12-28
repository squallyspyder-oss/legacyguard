"use client"

import type React from "react"

import { useState } from "react"
import { X, Shield, Zap, Database, DollarSign, Info, Check } from "lucide-react"
import type { AppSettings } from "../layout/MainLayout"

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  settings: AppSettings
  onUpdateSettings: (updates: Partial<AppSettings>) => void
}

type SettingsTab = "security" | "infrastructure" | "cost" | "data"

export default function SettingsPanel({ isOpen, onClose, settings, onUpdateSettings }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("security")

  if (!isOpen) return null

  const tabs = [
    { id: "security" as const, label: "Seguranca", icon: <Shield className="w-4 h-4" /> },
    { id: "infrastructure" as const, label: "Infraestrutura", icon: <Zap className="w-4 h-4" /> },
    { id: "cost" as const, label: "Custos", icon: <DollarSign className="w-4 h-4" /> },
    { id: "data" as const, label: "Dados & RAG", icon: <Database className="w-4 h-4" /> },
  ]

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 animate-fade-in" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-background border-l border-border z-50 animate-slide-in-right overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold">Configuracoes</h2>
            <p className="text-sm text-muted-foreground">Governanca, seguranca e controles</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "security" && <SecuritySettings settings={settings} onUpdate={onUpdateSettings} />}
          {activeTab === "infrastructure" && <InfrastructureSettings settings={settings} onUpdate={onUpdateSettings} />}
          {activeTab === "cost" && <CostSettings settings={settings} onUpdate={onUpdateSettings} />}
          {activeTab === "data" && <DataSettings settings={settings} onUpdate={onUpdateSettings} />}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="w-4 h-4" />
              <span>Alteracoes aplicadas automaticamente</span>
            </div>
            <button onClick={onClose} className="px-4 py-2 rounded-lg btn-primary text-sm font-medium">
              Concluido
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function SecuritySettings({
  settings,
  onUpdate,
}: {
  settings: AppSettings
  onUpdate: (updates: Partial<AppSettings>) => void
}) {
  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-semibold text-primary">Modo Seguro Ativo</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Acoes destrutivas estao bloqueadas. Sandbox e revisao obrigatoria estao habilitados.
        </p>
      </div>

      <SettingsSection title="Execucao Segura">
        <ToggleRow
          label="Sandbox Isolado"
          description="Executa codigo em ambiente containerizado"
          checked={settings.sandboxEnabled}
          onChange={(v) => onUpdate({ sandboxEnabled: v })}
        />
        {settings.sandboxEnabled && (
          <div className="ml-6 mt-3">
            <label className="text-sm text-muted-foreground mb-2 block">Modo de falha</label>
            <div className="flex gap-2">
              <button
                onClick={() => onUpdate({ sandboxMode: "fail" })}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  settings.sandboxMode === "fail"
                    ? "bg-destructive/20 text-destructive border border-destructive/30"
                    : "bg-secondary hover:bg-secondary/80"
                }`}
              >
                Fail (bloqueia)
              </button>
              <button
                onClick={() => onUpdate({ sandboxMode: "warn" })}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  settings.sandboxMode === "warn"
                    ? "bg-warning/20 text-warning border border-warning/30"
                    : "bg-secondary hover:bg-secondary/80"
                }`}
              >
                Warn (alerta)
              </button>
            </div>
          </div>
        )}

        <ToggleRow
          label="Safe Mode"
          description="Bloqueia execucoes destrutivas sem aprovacao"
          checked={settings.safeMode}
          onChange={(v) => onUpdate({ safeMode: v })}
        />

        <ToggleRow
          label="Reviewer Obrigatorio"
          description="Valida patches antes do executor aplicar"
          checked={settings.reviewGate}
          onChange={(v) => onUpdate({ reviewGate: v })}
        />

        <ToggleRow
          label="Mascaramento de Segredos"
          description="Oculta tokens e credenciais nos logs"
          checked={settings.maskingEnabled}
          onChange={(v) => onUpdate({ maskingEnabled: v })}
        />
      </SettingsSection>

      <SettingsSection title="Boas Praticas">
        <div className="space-y-2">
          <BestPracticeItem text="Exigir citacoes de origem para sugestoes" checked />
          <BestPracticeItem text="Circuit-breaker: limite de passos por orquestracao" checked />
          <BestPracticeItem text="Dry-run antes de qualquer escrita ou deploy" checked />
          <BestPracticeItem text="Bloquear mudancas em pastas criticas sem aprovacao" checked />
        </div>
      </SettingsSection>
    </div>
  )
}

function InfrastructureSettings({
  settings,
  onUpdate,
}: {
  settings: AppSettings
  onUpdate: (updates: Partial<AppSettings>) => void
}) {
  return (
    <div className="space-y-6">
      <SettingsSection title="Servicos">
        <ToggleRow
          label="Worker/Redis"
          description="Habilita orquestracao em fila"
          checked={settings.workerEnabled}
          onChange={(v) => onUpdate({ workerEnabled: v })}
        />

        <ToggleRow
          label="API Publica"
          description="Expoe endpoints com chaves rotacionaveis"
          checked={settings.apiEnabled}
          onChange={(v) => onUpdate({ apiEnabled: v })}
        />
      </SettingsSection>

      <SettingsSection title="Status">
        <div className="grid grid-cols-2 gap-3">
          <StatusCard label="Worker" status={settings.workerEnabled ? "online" : "offline"} />
          <StatusCard label="Sandbox" status={settings.sandboxEnabled ? "online" : "offline"} />
          <StatusCard label="RAG" status={settings.ragReady ? "online" : "pending"} />
          <StatusCard label="API" status={settings.apiEnabled ? "online" : "offline"} />
        </div>
      </SettingsSection>
    </div>
  )
}

function CostSettings({
  settings,
  onUpdate,
}: {
  settings: AppSettings
  onUpdate: (updates: Partial<AppSettings>) => void
}) {
  return (
    <div className="space-y-6">
      <SettingsSection title="Controle de Modelos">
        <ToggleRow
          label="Pesquisa Profunda"
          description="Usa modelos mais robustos (maior custo)"
          checked={settings.deepSearch}
          onChange={(v) => onUpdate({ deepSearch: v })}
        />

        <SliderRow
          label="Temperature Cap"
          value={settings.temperatureCap}
          onChange={(v) => onUpdate({ temperatureCap: v })}
          min={0}
          max={1}
          step={0.05}
          display={`${(settings.temperatureCap * 100).toFixed(0)}%`}
        />

        <SliderRow
          label="Limite de Tokens"
          value={settings.tokenCap}
          onChange={(v) => onUpdate({ tokenCap: v })}
          min={2000}
          max={24000}
          step={1000}
          display={`${settings.tokenCap.toLocaleString()} tokens`}
        />
      </SettingsSection>

      <SettingsSection title="Orcamento">
        <SliderRow
          label="Teto Diario"
          value={settings.billingCap}
          onChange={(v) => onUpdate({ billingCap: v })}
          min={5}
          max={100}
          step={5}
          display={`USD ${settings.billingCap}`}
        />

        <div className="p-4 rounded-xl bg-secondary border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Uso hoje</span>
            <span className="text-sm text-primary font-semibold">$4.23 / ${settings.billingCap}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(4.23 / settings.billingCap) * 100}%` }}
            />
          </div>
        </div>
      </SettingsSection>
    </div>
  )
}

function DataSettings({
  settings,
  onUpdate,
}: {
  settings: AppSettings
  onUpdate: (updates: Partial<AppSettings>) => void
}) {
  return (
    <div className="space-y-6">
      <SettingsSection title="RAG & Indexacao">
        <div className="p-4 rounded-xl border border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <span className="font-medium">Indice RAG</span>
            </div>
            <span className={`badge ${settings.ragReady ? "badge-success" : "badge-warning"}`}>
              {settings.ragReady ? "Indexado" : "Pendente"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            O RAG precisa estar indexado para respostas com contexto de repositorio.
          </p>
          <div className="flex gap-2">
            <button className="flex-1 px-4 py-2 rounded-lg btn-secondary text-sm font-medium">Reindexar</button>
            <button
              onClick={() => onUpdate({ ragReady: !settings.ragReady })}
              className="flex-1 px-4 py-2 rounded-lg btn-primary text-sm font-medium"
            >
              {settings.ragReady ? "Desmarcar" : "Marcar pronto"}
            </button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Fontes Externas">
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>• Confluence - Desabilitado</p>
          <p>• Jira - Desabilitado</p>
          <p>• GitHub PRs - Habilitado</p>
        </div>
      </SettingsSection>
    </div>
  )
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border">
      <div className="flex-1">
        <p className="font-medium">{label}</p>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : ""}`}
        />
      </button>
    </div>
  )
}

function SliderRow({
  label,
  value,
  onChange,
  min,
  max,
  step,
  display,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
  display: string
}) {
  return (
    <div className="p-4 rounded-xl bg-secondary/50 border border-border">
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium">{label}</span>
        <span className="text-sm text-primary font-semibold">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  )
}

function StatusCard({ label, status }: { label: string; status: "online" | "offline" | "pending" }) {
  const colors = {
    online: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    offline: "text-red-400 bg-red-500/10 border-red-500/30",
    pending: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  }

  return (
    <div className={`p-3 rounded-xl border ${colors[status]}`}>
      <div className="flex items-center gap-2">
        <span
          className={`status-dot ${status === "online" ? "status-online" : status === "offline" ? "status-offline" : "status-warning"}`}
        />
        <span className="font-medium">{label}</span>
      </div>
      <p className="text-xs mt-1 opacity-80 capitalize">{status}</p>
    </div>
  )
}

function BestPracticeItem({ text, checked }: { text: string; checked?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {checked ? (
        <Check className="w-4 h-4 text-primary flex-shrink-0" />
      ) : (
        <div className="w-4 h-4 rounded-full border border-muted-foreground flex-shrink-0" />
      )}
      <span className={checked ? "text-foreground" : "text-muted-foreground"}>{text}</span>
    </div>
  )
}
