"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import type { Session } from "next-auth"
import type { AppSettings } from "../layout/MainLayout"
import WelcomeScreen from "./WelcomeScreen"
import MessageList from "./MessageList"
import ChatInput from "./ChatInput"
import FloatingSuggestions from "./FloatingSuggestions"
import { AGENT_ROLES } from "../AgentSelector"
import { Menu, Settings, Shield, Sparkles } from "lucide-react"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  patches?: Patch[]
  tests?: TestFile[]
  approvalRequired?: string
  suggestOrchestrateText?: string
  twinOffer?: { prompt: string }
  twinReady?: boolean
  agentRole?: string
}

export interface Patch {
  file: string
  original: string
  fixed: string
}

export interface TestFile {
  file: string
  content: string
}

interface ChatContainerProps {
  session: Session | null
  settings: AppSettings
  isMobile: boolean
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  onOpenSettings: () => void
  assistActive: boolean
  onAssistToggle: (active: boolean) => void
  onAssistAction: (step: string) => void
}

export default function ChatContainer({
  session,
  settings,
  isMobile,
  sidebarCollapsed,
  onToggleSidebar,
  onOpenSettings,
  assistActive,
  onAssistToggle,
  onAssistAction,
}: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [agentRole, setAgentRole] = useState<string>(AGENT_ROLES[0].key)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const hasMessages = messages.length > 0

  // Compute inline suggestions based on input
  const suggestions = useMemo(() => {
    if (!input.trim() || input.length < 3) return []
    const t = input.toLowerCase()
    const list: string[] = []

    if (t.includes("incidente") || t.includes("erro") || t.includes("falha")) {
      list.push("Acionar Twin Builder para reproduzir o incidente")
      list.push("Analisar logs e stacktrace do erro")
    }
    if (t.includes("sandbox") || t.includes("test")) {
      list.push("Executar em sandbox isolado antes de aplicar")
    }
    if (t.includes("refator") || t.includes("legacy")) {
      list.push("Analisar complexidade ciclomatica do codigo")
      list.push("Sugerir padroes de modernizacao")
    }
    if (t.includes("segur") || t.includes("vuln")) {
      list.push("Executar scan de vulnerabilidades")
      list.push("Verificar compliance GDPR/SOC2")
    }
    if (t.includes("deploy") || t.includes("merge")) {
      list.push("Revisar changeset antes do merge")
      list.push("Executar testes de regressao")
    }
    if (list.length === 0 && input.length > 10) {
      list.push("Pesquisar no contexto RAG")
      list.push("Consultar documentacao")
    }

    return list.slice(0, 4)
  }, [input])

  useEffect(() => {
    setShowSuggestions(suggestions.length > 0 && !isLoading)
  }, [suggestions, isLoading])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Activate LegacyAssist when selected
  useEffect(() => {
    if (agentRole === "legacyAssist") {
      onAssistToggle(true)
    } else {
      onAssistToggle(false)
    }
  }, [agentRole, onAssistToggle])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading || (!input.trim() && uploadedFiles.length === 0)) return

    const userText = input.trim() || "Analise os arquivos enviados."
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: userText + (uploadedFiles.length > 0 ? `\n\n📎 ${uploadedFiles.map((f) => f.name).join(", ")}` : ""),
      timestamp: new Date(),
      agentRole,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setShowSuggestions(false)
    setIsLoading(true)

    // Simulate API response
    setTimeout(() => {
      const roleInfo = AGENT_ROLES.find((r) => r.key === agentRole)
      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: buildResponse(userText, agentRole, roleInfo?.label || ""),
        timestamp: new Date(),
        agentRole,
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)
      setUploadedFiles([])
    }, 1500)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput((prev) => prev + " " + suggestion)
    setShowSuggestions(false)
  }

  const handleQuickAction = (prompt: string) => {
    setInput(prompt)
  }

  const handleFileUpload = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files).filter((file) => file.size < 2000000)
      setUploadedFiles((prev) => [...prev, ...newFiles])
    }
  }

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // Safety badges for display
  const safetyBadges = useMemo(
    () =>
      [
        settings.sandboxEnabled ? `Sandbox ${settings.sandboxMode}` : null,
        settings.safeMode ? "Safe Mode" : null,
        settings.reviewGate ? "Review Gate" : null,
      ].filter(Boolean) as string[],
    [settings],
  )

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-xl z-10">
        <div className="flex items-center gap-3">
          {(isMobile || sidebarCollapsed) && (
            <button onClick={onToggleSidebar} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            {agentRole === "legacyAssist" && <Sparkles className="w-4 h-4 text-primary" />}
            <span className="text-sm font-medium">
              {AGENT_ROLES.find((r) => r.key === agentRole)?.label.split(" — ")[0]}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Safety badges */}
          <div className="hidden md:flex items-center gap-1.5">
            {safetyBadges.slice(0, 2).map((badge, i) => (
              <span key={i} className="badge badge-primary">
                <Shield className="w-3 h-3 mr-1" />
                {badge}
              </span>
            ))}
          </div>
          <button onClick={onOpenSettings} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main content */}
      {hasMessages ? (
        <>
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-6">
              <MessageList messages={messages} isLoading={isLoading} />
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input area with floating suggestions */}
          <div className="relative border-t border-border bg-background/80 backdrop-blur-xl">
            <FloatingSuggestions
              suggestions={suggestions}
              visible={showSuggestions}
              onSelect={handleSuggestionClick}
              onDismiss={() => setShowSuggestions(false)}
            />
            <div className="max-w-3xl mx-auto px-4 py-4">
              <ChatInput
                input={input}
                onInputChange={setInput}
                onSubmit={handleSubmit}
                isLoading={isLoading}
                uploadedFiles={uploadedFiles}
                onFileUpload={handleFileUpload}
                onRemoveFile={handleRemoveFile}
                agentRole={agentRole}
                onAgentRoleChange={setAgentRole}
                deepSearch={settings.deepSearch}
                onDeepSearchChange={() => {}}
                compact
              />
            </div>
          </div>
        </>
      ) : (
        <WelcomeScreen
          session={session}
          input={input}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          uploadedFiles={uploadedFiles}
          onFileUpload={handleFileUpload}
          onRemoveFile={handleRemoveFile}
          agentRole={agentRole}
          onAgentRoleChange={setAgentRole}
          deepSearch={settings.deepSearch}
          onDeepSearchChange={() => {}}
          onQuickAction={handleQuickAction}
          suggestions={suggestions}
          showSuggestions={showSuggestions}
          onSuggestionClick={handleSuggestionClick}
          onDismissSuggestions={() => setShowSuggestions(false)}
        />
      )}
    </div>
  )
}

function buildResponse(userText: string, agentRole: string, roleLabel: string): string {
  const t = userText.toLowerCase()

  if (agentRole === "legacyAssist") {
    return `## Guia LegacyAssist

Entendi sua solicitacao. Vamos seguir um fluxo estruturado:

**Fase 1 - Entendimento**
Confirme o contexto: qual repositorio ou sistema estamos analisando?

**Fase 2 - Pesquisa**
Posso ajudar com:
- 🔍 **RAG** - Buscar no contexto indexado
- 🌐 **Web** - Pesquisa externa
- 💡 **Brainstorm** - Explorar solucoes

**Fase 3 - Validacao**
Antes de qualquer acao, validaremos com Twin Builder ou Sandbox.

**Qual opcao voce prefere iniciar?**`
  }

  if (t.includes("incidente") || t.includes("erro")) {
    return `## Analise de Incidente

Detectei contexto de incidente. Recomendo:

1. **Twin Builder** - Reproduzir o cenario em ambiente isolado
2. **Analise de logs** - Identificar root cause
3. **Patch generation** - Sugerir correcoes

Deseja que eu acione o Twin Builder para reproduzir o incidente?`
  }

  return `## ${roleLabel}

Entendi sua solicitacao. Vou analisar o contexto e preparar uma resposta detalhada.

**Proximos passos:**
1. Analise do escopo
2. Identificacao de riscos
3. Sugestao de acoes

Processando...`
}
