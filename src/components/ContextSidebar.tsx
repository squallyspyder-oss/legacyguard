"use client";

import { useState } from "react";

type SessionItem = {
  id: string;
  title: string;
  tag: string;
  recency: string;
  risk: "baixo" | "medio" | "alto";
};

type ContextSidebarProps = {
  sessions: SessionItem[];
  sessionsLoading?: boolean;
  onResumeSession: (session: SessionItem) => void;
  githubUrl: string;
  onChangeGithubUrl: (value: string) => void;
  onImportRepo: () => void;
  isLoading: boolean;
  isLoggedIn: boolean;
  // Merge executor props
  mergeOwner: string;
  onChangeMergeOwner: (value: string) => void;
  mergeRepo: string;
  onChangeMergeRepo: (value: string) => void;
  mergePrNumber: string;
  onChangeMergePrNumber: (value: string) => void;
  onMerge: () => void;
  mergeLoading: boolean;
};

export default function ContextSidebar({
  sessions,
  sessionsLoading,
  onResumeSession,
  githubUrl,
  onChangeGithubUrl,
  onImportRepo,
  isLoading,
  isLoggedIn,
  mergeOwner,
  onChangeMergeOwner,
  mergeRepo,
  onChangeMergeRepo,
  mergePrNumber,
  onChangeMergePrNumber,
  onMerge,
  mergeLoading,
}: ContextSidebarProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>("sessions");

  const riskBadge = (risk: SessionItem["risk"]) => {
    if (risk === "alto") return "text-rose-200 bg-rose-500/20 border-rose-400/40";
    if (risk === "medio") return "text-amber-200 bg-amber-500/15 border-amber-400/30";
    return "text-emerald-200 bg-emerald-500/15 border-emerald-400/30";
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <aside className="glass rounded-2xl p-4 flex flex-col gap-4 h-full overflow-y-auto">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-indigo-400/20 border border-indigo-300/30 flex items-center justify-center text-lg">📂</div>
        <div>
          <p className="text-sm font-semibold text-slate-100">Contexto & Histórico</p>
          <p className="text-xs text-slate-400">Defina o escopo da tarefa</p>
        </div>
      </div>

      {/* Sessions Section */}
      <section className="rounded-xl border border-white/5 bg-white/5 overflow-hidden">
        <button
          onClick={() => toggleSection("sessions")}
          className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <p className="text-xs font-semibold text-slate-200">Sessões & Contexto</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-slate-200">
              {sessions.length}
            </span>
            <span className={`text-slate-400 transition-transform ${expandedSection === "sessions" ? "rotate-180" : ""}`}>
              ▼
            </span>
          </div>
        </button>
        
        {expandedSection === "sessions" && (
          <div className="p-3 pt-0 space-y-2 border-t border-white/5">
            {sessionsLoading && (
              <div className="flex items-center gap-2 text-[11px] text-slate-300">
                <span className="animate-pulse">●</span>
                Carregando sessões...
              </div>
            )}
            {!sessionsLoading && sessions.length === 0 && (
              <p className="text-[11px] text-slate-400">Nenhuma sessão ainda. Interaja para criar histórico.</p>
            )}
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-50 font-semibold truncate">{s.title}</p>
                  <p className="text-[11px] text-slate-400">{s.tag} • {s.recency}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${riskBadge(s.risk)}`}>
                    {s.risk === "alto" ? "Alto" : s.risk === "medio" ? "Médio" : "Baixo"}
                  </span>
                  <button
                    onClick={() => onResumeSession(s)}
                    className="text-[11px] px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-100 border border-emerald-400/30 hover:bg-emerald-500/25 transition-colors"
                  >
                    Retomar
                  </button>
                </div>
              </div>
            ))}
            <p className="text-[11px] text-slate-400 mt-2">
              Conversas retomadas reindexarão o contexto para o RAG.
            </p>
          </div>
        )}
      </section>

      {/* Import Repository Section */}
      <section className="rounded-xl border border-white/5 bg-white/5 overflow-hidden">
        <button
          onClick={() => toggleSection("import")}
          className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📥</span>
            <p className="text-xs font-semibold text-slate-200">Importar Repositório</p>
          </div>
          <span className={`text-slate-400 transition-transform ${expandedSection === "import" ? "rotate-180" : ""}`}>
            ▼
          </span>
        </button>
        
        {expandedSection === "import" && (
          <div className="p-3 pt-0 space-y-3 border-t border-white/5">
            <div className="flex gap-2">
              <input
                type="text"
                value={githubUrl}
                onChange={(e) => onChangeGithubUrl(e.target.value)}
                placeholder="https://github.com/user/repo"
                className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/30 text-sm"
                disabled={isLoading}
              />
              <button
                onClick={onImportRepo}
                disabled={isLoading || !githubUrl.trim()}
                className="px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold text-sm disabled:opacity-50 shadow-md shadow-cyan-500/30 transition-colors"
              >
                Importar
              </button>
            </div>
            {!isLoggedIn && (
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <span>🔒</span> Faça login com GitHub para importar repos privados.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Merge Executor Section */}
      <section className="rounded-xl border border-white/5 bg-white/5 overflow-hidden">
        <button
          onClick={() => toggleSection("merge")}
          className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🚀</span>
            <p className="text-xs font-semibold text-slate-200">Merge (Executor)</p>
          </div>
          <div className="flex items-center gap-2">
            {mergeLoading && <span className="text-[11px] text-amber-200 animate-pulse">Processando...</span>}
            <span className={`text-slate-400 transition-transform ${expandedSection === "merge" ? "rotate-180" : ""}`}>
              ▼
            </span>
          </div>
        </button>
        
        {expandedSection === "merge" && (
          <div className="p-3 pt-0 space-y-3 border-t border-white/5">
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={mergeOwner}
                onChange={(e) => onChangeMergeOwner(e.target.value)}
                placeholder="owner"
                pattern="^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$"
                title="GitHub username or organization name"
                className="flex-1 min-w-[80px] px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/30 text-sm"
                disabled={isLoading}
              />
              <input
                type="text"
                value={mergeRepo}
                onChange={(e) => onChangeMergeRepo(e.target.value)}
                placeholder="repo"
                pattern="^[a-zA-Z0-9._-]+$"
                title="GitHub repository name"
                className="flex-1 min-w-[80px] px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/30 text-sm"
                disabled={isLoading}
              />
              <input
                type="text"
                value={mergePrNumber}
                onChange={(e) => onChangeMergePrNumber(e.target.value)}
                placeholder="PR #"
                pattern="^[0-9]+$"
                title="Pull request number"
                className="w-16 px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/30 text-sm"
                disabled={isLoading}
              />
              <button
                onClick={onMerge}
                disabled={mergeLoading || !mergeOwner.trim() || !mergeRepo.trim() || !mergePrNumber.trim()}
                className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm disabled:opacity-50 shadow-md shadow-amber-500/30 transition-colors"
              >
                Merge
              </button>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <span>⚠️</span> Requer token GitHub com permissão de merge. Use com cautela.
            </p>
          </div>
        )}
      </section>

      {/* Help Section */}
      <div className="mt-auto rounded-xl border border-white/5 bg-white/5 p-3">
        <p className="text-[11px] text-slate-300 leading-relaxed">
          <strong className="text-slate-100">Coluna 1:</strong> Defina o contexto (qual código, qual histórico) antes de iniciar a ação na Coluna 2.
        </p>
      </div>
    </aside>
  );
}
