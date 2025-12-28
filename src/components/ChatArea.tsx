"use client";

import { useState } from "react";
import ReactDiffViewer from "react-diff-viewer-continued";
import AgentSelector from "./AgentSelector";

export interface Message {
  role: "user" | "assistant";
  content: string;
  patches?: Patch[];
  tests?: TestFile[];
  approvalRequired?: string;
  suggestOrchestrateText?: string;
  twinOffer?: { prompt: string };
  twinReady?: boolean;
}

export interface Patch {
  file: string;
  original: string;
  fixed: string;
}

export interface TestFile {
  file: string;
  content: string;
}

export type AssistMetrics = {
  stepsCompleted: number;
  researches: number;
  executionBlocked: boolean;
};

type ChatAreaProps = {
  messages: Message[];
  isLoading: boolean;
  agentRole: string;
  onChangeAgentRole: (role: string) => void;
  deepSearch: boolean;
  onToggleDeepSearch: (value: boolean) => void;
  input: string;
  onChangeInput: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  uploadedFiles: File[];
  onUploadFiles: (files: FileList | null) => void;
  onRemoveFile: (index: number) => void;
  inlineSuggestions: string[];
  // Callbacks for actions
  onApplyPatch: (patch: Patch) => void;
  onDownloadTest: (filename: string, content: string) => void;
  onDownloadAllTests: (tests: TestFile[]) => void;
  onApproval: (orchestrationId: string) => void;
  onOrchestrate: (text: string, context?: Record<string, unknown>) => void;
  onTriggerTwinBuilder: (prompt: string) => void;
  // LegacyAssist specific
  assistMetrics?: AssistMetrics;
  onAssistAction?: (action: "rag" | "web" | "brainstorm" | "twin" | "sandbox" | "orchestrate") => void;
  onShowAssistHelp?: () => void;
  // Safety badges
  safetyBadges: string[];
};

export default function ChatArea({
  messages,
  isLoading,
  agentRole,
  onChangeAgentRole,
  deepSearch,
  onToggleDeepSearch,
  input,
  onChangeInput,
  onSubmit,
  uploadedFiles,
  onUploadFiles,
  onRemoveFile,
  inlineSuggestions,
  onApplyPatch,
  onDownloadTest,
  onDownloadAllTests,
  onApproval,
  onOrchestrate,
  onTriggerTwinBuilder,
  assistMetrics,
  onAssistAction,
  onShowAssistHelp,
  safetyBadges,
}: ChatAreaProps) {
  const [selectedPatch, setSelectedPatch] = useState<Patch | null>(null);
  const [selectedTest, setSelectedTest] = useState<TestFile | null>(null);

  const isLegacyAssist = agentRole === "legacyAssist";

  return (
    <div className="flex flex-col gap-4 min-h-[75vh]">
      {/* Header with Safety Badges */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-300">Chat & Execução</p>
          <p className="text-lg font-semibold">Fale com os agentes e acompanhe a orquestração</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isLoading && (
            <span className="px-3 py-1 rounded-full bg-amber-400/15 text-amber-200 text-xs border border-amber-400/40 animate-pulse">
              Processando...
            </span>
          )}
          {safetyBadges.slice(0, 3).map((badge, idx) => (
            <span
              key={idx}
              className="text-[11px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-slate-200"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>

      {/* Agent Selector */}
      <div className="glass rounded-xl p-4">
        <AgentSelector value={agentRole} onChange={onChangeAgentRole} />
        {agentRole === "chat" && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2">
            <div>
              <p className="text-sm text-slate-100 font-semibold">Pesquisa profunda</p>
              <p className="text-xs text-slate-400">Ativa modelo mais caro + busca contextual</p>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 accent-emerald-500"
                checked={deepSearch}
                onChange={(e) => onToggleDeepSearch(e.target.checked)}
              />
              <span className="text-xs text-slate-200">Ligado</span>
            </label>
          </div>
        )}
      </div>

      {/* LegacyAssist Panel */}
      {isLegacyAssist && assistMetrics && onAssistAction && (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-100">Modo Assistido ativo</p>
              <p className="text-xs text-emerald-200">
                Nenhuma execução automática. Siga os passos guiados.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] text-emerald-100">
              <span className="px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40">
                🔒 Execução bloqueada
              </span>
              <span className="px-2 py-1 rounded-full bg-white/10 border border-white/20">
                Passos: {assistMetrics.stepsCompleted}
              </span>
              <span className="px-2 py-1 rounded-full bg-white/10 border border-white/20">
                Pesquisas: {assistMetrics.researches}
              </span>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-2 text-xs text-emerald-50">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 flex items-center gap-2">
              <span className="text-emerald-400">1</span>
              Entender → Confirme contexto (repo/riscos/prazo).
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 flex items-center gap-2">
              <span className="text-emerald-400">2</span>
              Pesquisar → RAG interno, Web, Brainstorm curto.
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 flex items-center gap-2">
              <span className="text-emerald-400">3</span>
              Incidente → Acione Twin Builder e gere harness.
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 flex items-center gap-2">
              <span className="text-emerald-400">4</span>
              Validar → Sandbox fail-mode antes de merge.
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 text-sm">
            <button onClick={() => onAssistAction("rag")} className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 hover:bg-white/15 transition-colors">
              🔍 RAG interno
            </button>
            <button onClick={() => onAssistAction("web")} className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 hover:bg-white/15 transition-colors">
              🌐 Buscar web
            </button>
            <button onClick={() => onAssistAction("brainstorm")} className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 hover:bg-white/15 transition-colors">
              💡 Brainstorm
            </button>
            <button onClick={() => onAssistAction("twin")} className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 hover:bg-white/15 transition-colors">
              🧪 Twin Builder
            </button>
            <button onClick={() => onAssistAction("sandbox")} className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 hover:bg-white/15 transition-colors">
              🛡️ Sandbox fail
            </button>
            <button onClick={() => onAssistAction("orchestrate")} className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 hover:bg-white/15 transition-colors">
              🎭 Orquestrar (plano)
            </button>
            {onShowAssistHelp && (
              <button onClick={onShowAssistHelp} className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 hover:bg-white/15 transition-colors">
                ℹ️ Ajuda
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 rounded-xl border border-white/5 bg-black/10 p-3">
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            message={msg}
            isLoading={isLoading}
            onApplyPatch={onApplyPatch}
            onViewPatch={setSelectedPatch}
            onDownloadTest={onDownloadTest}
            onViewTest={setSelectedTest}
            onDownloadAllTests={onDownloadAllTests}
            onApproval={onApproval}
            onOrchestrate={onOrchestrate}
            onTriggerTwinBuilder={onTriggerTwinBuilder}
            uploadedFiles={uploadedFiles}
          />
        ))}
        {isLoading && messages.length === 0 && (
          <div className="text-sm text-slate-300 animate-pulse">
            Processando repositório e gerando análise...
          </div>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={onSubmit} className="space-y-3">
        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map((file, i) => (
              <div key={i} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs flex items-center gap-2">
                <span>📄 {file.name}</span>
                <button type="button" onClick={() => onRemoveFile(i)} className="text-rose-300 hover:text-rose-200">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {inlineSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 -mb-1">
            {inlineSuggestions.map((sug, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => onChangeInput(input.trim().length ? `${input.trim()} ${sug}` : sug)}
                className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[12px] text-slate-100 hover:bg-white/20 transition-colors"
              >
                💡 {sug}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => onChangeInput(e.target.value)}
            placeholder={
              agentRole === "chat"
                ? "Pergunte, pesquise, faça brainstorm..."
                : "Peça análise, refatoração ou orquestração completa..."
            }
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/40 transition-colors"
            disabled={isLoading}
          />
          <input
            type="file"
            id="file-upload"
            multiple
            className="hidden"
            onChange={(e) => onUploadFiles(e.target.files)}
          />
          <label
            htmlFor="file-upload"
            className="px-3 py-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 text-lg transition-colors"
          >
            📎
          </label>
          <button
            type="submit"
            disabled={isLoading || (!input.trim() && uploadedFiles.length === 0)}
            className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold disabled:opacity-50 shadow-lg shadow-emerald-500/30 transition-colors"
          >
            Enviar
          </button>
        </div>
      </form>

      {/* Patch Preview Modal */}
      {selectedPatch && (
        <PatchModal
          patch={selectedPatch}
          onClose={() => setSelectedPatch(null)}
          onApply={() => {
            onApplyPatch(selectedPatch);
            setSelectedPatch(null);
          }}
          isLoading={isLoading}
        />
      )}

      {/* Test Preview Modal */}
      {selectedTest && (
        <TestModal
          test={selectedTest}
          onClose={() => setSelectedTest(null)}
          onDownload={() => {
            onDownloadTest(selectedTest.file, selectedTest.content);
            setSelectedTest(null);
          }}
        />
      )}
    </div>
  );
}

// Message Bubble Component
function MessageBubble({
  message,
  isLoading,
  onApplyPatch,
  onViewPatch,
  onDownloadTest,
  onViewTest,
  onDownloadAllTests,
  onApproval,
  onOrchestrate,
  onTriggerTwinBuilder,
  uploadedFiles,
}: {
  message: Message;
  isLoading: boolean;
  onApplyPatch: (patch: Patch) => void;
  onViewPatch: (patch: Patch) => void;
  onDownloadTest: (filename: string, content: string) => void;
  onViewTest: (test: TestFile) => void;
  onDownloadAllTests: (tests: TestFile[]) => void;
  onApproval: (orchestrationId: string) => void;
  onOrchestrate: (text: string, context?: Record<string, unknown>) => void;
  onTriggerTwinBuilder: (prompt: string) => void;
  uploadedFiles: File[];
}) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-3xl px-5 py-4 rounded-2xl shadow-sm border whitespace-pre-wrap leading-relaxed ${
          isUser
            ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-50"
            : "bg-white/5 border-white/10 text-slate-100"
        }`}
      >
        <div dangerouslySetInnerHTML={{ __html: message.content.replace(/\n/g, "<br />") }} />

        {/* Twin Builder Offer */}
        {message.twinOffer && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => onTriggerTwinBuilder(message.twinOffer!.prompt)}
              disabled={isLoading}
              className="px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-50 text-sm disabled:opacity-50 hover:bg-emerald-500/30 transition-colors"
            >
              🚀 Acionar Twin Builder
            </button>
            <button className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-slate-200 text-sm hover:bg-white/20 transition-colors">
              Agora não
            </button>
          </div>
        )}

        {/* Twin Ready Actions */}
        {message.twinReady && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="px-3 py-2 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-50 text-sm hover:bg-amber-500/30 transition-colors">
              🛡️ Preparar rollback
            </button>
            <button className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-slate-200 text-sm hover:bg-white/20 transition-colors">
              Continuar sem rollback
            </button>
          </div>
        )}

        {/* Patches */}
        {!isUser && message.patches && message.patches.length > 0 && (
          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-200 text-sm font-semibold">
              <span>🛠️ Patches disponíveis</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-xs">
                {message.patches.length}
              </span>
            </div>
            {message.patches.map((patch, idx) => (
              <div key={idx} className="rounded-lg border border-white/10 bg-black/20 p-3 flex flex-col gap-3">
                <p className="font-medium text-sm">📄 {patch.file}</p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => onViewPatch(patch)}
                    className="px-3 py-2 rounded-lg bg-indigo-500/20 border border-indigo-400/40 text-indigo-50 text-sm hover:bg-indigo-500/30 transition-colors"
                  >
                    👁️ Visualizar
                  </button>
                  <button
                    onClick={() => onApplyPatch(patch)}
                    disabled={isLoading}
                    className="px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-50 text-sm disabled:opacity-50 hover:bg-emerald-500/30 transition-colors"
                  >
                    ✅ Aplicar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tests */}
        {!isUser && message.tests && message.tests.length > 0 && (
          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-2 text-cyan-200 text-sm font-semibold">
              <span>🧪 Testes gerados</span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-xs">
                {message.tests.length}
              </span>
              {message.tests.length > 1 && (
                <button
                  onClick={() => onDownloadAllTests(message.tests!)}
                  className="ml-2 px-2 py-1 text-xs rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                >
                  ⬇️ Baixar todos
                </button>
              )}
            </div>
            {message.tests.map((t, idx) => (
              <div key={idx} className="rounded-lg border border-white/10 bg-black/20 p-3 flex flex-col gap-3">
                <p className="font-medium text-sm">📄 {t.file}</p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => onViewTest(t)}
                    className="px-3 py-2 rounded-lg bg-indigo-500/20 border border-indigo-400/40 text-indigo-50 text-sm hover:bg-indigo-500/30 transition-colors"
                  >
                    👁️ Visualizar
                  </button>
                  <button
                    onClick={() => onDownloadTest(t.file, t.content)}
                    className="px-3 py-2 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-50 text-sm hover:bg-cyan-500/30 transition-colors"
                  >
                    ⬇️ Baixar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Approval Required */}
        {!isUser && message.approvalRequired && (
          <div className="mt-5">
            <button
              onClick={() => onApproval(message.approvalRequired!)}
              disabled={isLoading}
              className="px-4 py-3 rounded-lg bg-amber-500/20 border border-amber-400/50 text-amber-100 font-semibold disabled:opacity-50 animate-pulse hover:bg-amber-500/30 transition-colors"
            >
              ✅ Aprovar e continuar execução
            </button>
          </div>
        )}

        {/* Suggest Orchestrate */}
        {!isUser && message.suggestOrchestrateText && (
          <div className="mt-4 p-3 rounded-lg border border-emerald-400/40 bg-emerald-500/10">
            <p className="text-sm text-emerald-100 font-semibold mb-2">
              Esta solicitação parece exigir agentes. Quer orquestrar?
            </p>
            <button
              onClick={() => onOrchestrate(message.suggestOrchestrateText!, { files: uploadedFiles.map((f) => f.name) })}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold transition-colors"
            >
              Iniciar Orquestração
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Patch Modal Component
function PatchModal({
  patch,
  onClose,
  onApply,
  isLoading,
}: {
  patch: Patch;
  onClose: () => void;
  onApply: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-slate-900 rounded-xl max-w-7xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-emerald-300">Preview do Patch: {patch.file}</h2>
          <button onClick={onClose} className="text-3xl text-slate-300 hover:text-white">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          <ReactDiffViewer
            oldValue={patch.original}
            newValue={patch.fixed}
            splitView={true}
            useDarkTheme={true}
            leftTitle="Código Original"
            rightTitle="Código Corrigido"
            styles={{
              contentText: { lineHeight: "1.6" },
              diffContainer: { fontFamily: "monospace", fontSize: "14px" },
              line: { padding: "2px 4px" },
            }}
          />
        </div>
        <div className="p-6 border-t border-white/10 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-lg font-medium border border-white/10 transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={onApply}
            disabled={isLoading}
            className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-lg font-semibold disabled:opacity-50 transition-colors"
          >
            Aplicar este Patch
          </button>
        </div>
      </div>
    </div>
  );
}

// Test Modal Component
function TestModal({
  test,
  onClose,
  onDownload,
}: {
  test: TestFile;
  onClose: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-slate-900 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-emerald-300">Preview do Teste: {test.file}</h2>
          <button onClick={onClose} className="text-3xl text-slate-300 hover:text-white">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <pre className="whitespace-pre-wrap font-mono text-sm text-slate-100">{test.content}</pre>
        </div>
        <div className="p-6 border-t border-white/10 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-lg font-medium border border-white/10 transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={onDownload}
            className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-lg font-semibold transition-colors"
          >
            Baixar este Teste
          </button>
        </div>
      </div>
    </div>
  );
}
