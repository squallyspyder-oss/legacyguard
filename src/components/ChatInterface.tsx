'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useSession, signIn, signOut } from 'next-auth/react';
import { AGENT_ROLES } from './AgentSelector';
import ContextSidebar from './ContextSidebar';
import GovernanceSidebar from './GovernanceSidebar';
import ChatArea, { Message, Patch, TestFile } from './ChatArea';
import OnboardingTour, { useOnboarding } from './OnboardingTour';

type SessionItem = {
  id: string;
  title: string;
  tag: string;
  recency: string;
  risk: 'baixo' | 'medio' | 'alto';
};

export default function ChatInterface() {
  const { data: session, status } = useSession();

  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: session 
        ? `👋 Olá, ${session.user?.name || 'usuário'}! Eu sou o LegacyGuard. Use **LegacyAssist** para um roteiro guiado ("o que faço agora?") com pesquisas (web/RAG/brainstorm) e, quando quiser executar, troque para Orquestrador ou operadores.` 
        : '👋 Olá! Eu sou o LegacyGuard. Use **LegacyAssist** para um roteiro guiado ("o que faço agora?") com pesquisas (web/RAG/brainstorm) e, quando quiser executar, troque para Orquestrador ou operadores. Faça login com GitHub para repositórios privados.' 
    }
  ]);
  const [input, setInput] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [agentRole, setAgentRole] = useState<string>(AGENT_ROLES[0].key);
  const [deepSearch, setDeepSearch] = useState(false);
  const [mergeOwner, setMergeOwner] = useState('');
  const [mergeRepo, setMergeRepo] = useState('');
  const [mergePrNumber, setMergePrNumber] = useState('');
  const [mergeLoading, setMergeLoading] = useState(false);
  const [inlineSuggestions, setInlineSuggestions] = useState<string[]>([]);
  
  // Infrastructure status
  const [workerStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');
  const [sandboxStatus] = useState<'ready' | 'unavailable' | 'unknown'>('unknown');
  const [ragProgress] = useState<number | undefined>(undefined);
  
  // Onboarding tour
  const onboarding = useOnboarding(session?.user?.email ? `lg:${session.user.email}` : 'lg:anon');

  // Configurações gerais (sidebar controlada)
  const [sandboxEnabled, setSandboxEnabled] = useState(true);
  const [sandboxMode, setSandboxMode] = useState<'fail' | 'warn'>('fail');
  const [safeMode, setSafeMode] = useState(true);
  const [reviewGate, setReviewGate] = useState(true);
  const [workerEnabled, setWorkerEnabled] = useState(true);
  const [maskingEnabled, setMaskingEnabled] = useState(true);
  const [ragReady, setRagReady] = useState(false);
  const [apiEnabled, setApiEnabled] = useState(false);
  const [billingCap, setBillingCap] = useState(20);
  const [tokenCap, setTokenCap] = useState(12000);
  const [temperatureCap, setTemperatureCap] = useState(0.5);

  // LegacyAssist (modo guiado)
  const [assistOnboardingSeen, setAssistOnboardingSeen] = useState(false);
  const [showAssistModal, setShowAssistModal] = useState(false);
  const [assistMetrics, setAssistMetrics] = useState({
    stepsCompleted: 0,
    researches: 0,
    executionBlocked: true,
  });

  const assistStorageKey = useMemo(
    () => (session?.user?.email ? `legacyAssist:${session.user.email}` : 'legacyAssist:anon'),
    [session?.user?.email]
  );

  // Persistência de onboarding/metrics no cliente (por usuário/sessão)
  useEffect(() => {
    try {
      const seen = localStorage.getItem(`${assistStorageKey}:onboardingSeen`);
      if (seen === 'true') setAssistOnboardingSeen(true);
      else setAssistOnboardingSeen(false);

      const metricsRaw = localStorage.getItem(`${assistStorageKey}:metrics`);
      if (metricsRaw) {
        const parsed = JSON.parse(metricsRaw);
        if (typeof parsed?.stepsCompleted === 'number' && typeof parsed?.researches === 'number') {
          setAssistMetrics({
            stepsCompleted: parsed.stepsCompleted,
            researches: parsed.researches,
            executionBlocked: true,
          });
        } else {
          setAssistMetrics({ stepsCompleted: 0, researches: 0, executionBlocked: true });
        }
      } else {
        setAssistMetrics({ stepsCompleted: 0, researches: 0, executionBlocked: true });
      }
    } catch {
      setAssistMetrics({ stepsCompleted: 0, researches: 0, executionBlocked: true });
    }
  }, [assistStorageKey]);

  // Se não há sessão (sign-out), garante estado anônimo limpo
  useEffect(() => {
    if (!session?.user?.email) {
      setAssistOnboardingSeen(false);
      setAssistMetrics({ stepsCompleted: 0, researches: 0, executionBlocked: true });
    }
  }, [session?.user?.email]);

  useEffect(() => {
    try {
      localStorage.setItem(`${assistStorageKey}:onboardingSeen`, assistOnboardingSeen ? 'true' : 'false');
      localStorage.setItem(`${assistStorageKey}:metrics`, JSON.stringify(assistMetrics));
    } catch {
      // ignore
    }
  }, [assistOnboardingSeen, assistMetrics, assistStorageKey]);

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const safetyBadges = useMemo(
    () => [
      sandboxEnabled ? `Sandbox ${sandboxMode === 'fail' ? '(fail)' : '(warn)'}` : 'Sandbox off',
      safeMode ? 'Safe mode on' : 'Safe mode off',
      reviewGate ? 'Reviewer gating on' : 'Reviewer gating off',
      workerEnabled ? 'Worker on' : 'Worker off',
      maskingEnabled ? 'Masking on' : 'Masking off',
    ],
    [sandboxEnabled, sandboxMode, safeMode, reviewGate, workerEnabled, maskingEnabled]
  );

  useEffect(() => {
    const loadSessions = async () => {
      setSessionsLoading(true);
      try {
        const res = await fetch('/api/sessions');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.sessions)) {
            setSessions(data.sessions as SessionItem[]);
            return;
          }
        }
        // fallback mock
        setSessions([
          { id: 'mock-1', title: 'Refactor auth legado', tag: 'segurança', recency: 'Hoje', risk: 'medio' },
          { id: 'mock-2', title: 'Hardening pipeline CI', tag: 'devsecops', recency: 'Ontem', risk: 'baixo' },
          { id: 'mock-3', title: 'Incident post-mortem', tag: 'auditoria', recency: '2 dias', risk: 'alto' },
        ]);
      } catch {
        setSessions([
          { id: 'mock-1', title: 'Refactor auth legado', tag: 'segurança', recency: 'Hoje', risk: 'medio' },
          { id: 'mock-2', title: 'Hardening pipeline CI', tag: 'devsecops', recency: 'Ontem', risk: 'baixo' },
          { id: 'mock-3', title: 'Incident post-mortem', tag: 'auditoria', recency: '2 dias', risk: 'alto' },
        ]);
      } finally {
        setSessionsLoading(false);
      }
    };

    loadSessions();
  }, []);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch('/api/config');
        if (!res.ok) return;
        const data = await res.json();
        const cfg = data.config || {};
        if (typeof cfg.sandboxEnabled === 'boolean') setSandboxEnabled(cfg.sandboxEnabled);
        if (typeof cfg.sandboxFailMode === 'string') setSandboxMode(cfg.sandboxFailMode as 'fail' | 'warn');
        if (typeof cfg.safeMode === 'boolean') setSafeMode(cfg.safeMode);
        if (typeof cfg.workerEnabled === 'boolean') setWorkerEnabled(cfg.workerEnabled);
        if (typeof cfg.maskingEnabled === 'boolean') setMaskingEnabled(cfg.maskingEnabled);
        if (typeof cfg.deepSearch === 'boolean') setDeepSearch(cfg.deepSearch);
      } catch {
        // ignore
      }
    };
    loadConfig();
  }, []);

  // Exibir modal de onboarding quando entrar no modo LegacyAssist pela primeira vez
  useEffect(() => {
    if (agentRole === 'legacyAssist' && !assistOnboardingSeen) {
      setShowAssistModal(true);
    }
  }, [agentRole, assistOnboardingSeen]);

  const handleFileUpload = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files).filter(file => file.size < 1000000);
      if (newFiles.length < files.length) alert('Arquivos >1MB foram ignorados.');
      setUploadedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const shouldSuggestTwinBuilder = (text: string) => {
    const lower = text.toLowerCase();
    return ['incident', 'incidente', 'erro', 'falha', 'crash', 'alerta', 'exfiltra', 'vazamento'].some((kw) => lower.includes(kw));
  };

  const maybeOfferTwinBuilder = (text: string) => {
    if (!shouldSuggestTwinBuilder(text)) return;
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '🔎 Detectei contexto de incidente. Deseja acionar o Twin Builder para reproduzir e mitigar em sandbox?',
      twinOffer: { prompt: text },
    }]);
  };

  const buildSandboxPayload = () => ({
    enabled: sandboxEnabled,
    failMode: sandboxMode,
    languageHint: undefined,
    // comando opcional poderia vir de config avançada; deixamos vazio para autodetect
    timeoutMs: 15 * 60 * 1000,
    repoPath: undefined,
    runnerPath: undefined,
  });

  const computeSuggestions = (text: string): string[] => {
    const t = text.toLowerCase();
    const list: string[] = [];
    if (t.includes('incidente') || t.includes('erro') || t.includes('alerta')) {
      list.push('Acionar Twin Builder para reproduzir o incidente.');
      list.push('Gerar fixtures sintéticos e rodar sandbox em modo fail.');
    }
    if (t.includes('sandbox') || t.includes('teste')) {
      list.push('Sandbox fail mode + lint + security antes do executor.');
    }
    if (t.includes('orquestra') || agentRole === 'orchestrate') {
      list.push('Criar plano com approval antes de executor.');
    }
    if (list.length === 0 && text.length > 8) {
      list.push('Adicionar contexto: repoPath, risco, prazo.');
    }
    return list.slice(0, 3);
  };

  const buildLegacyAssistGuide = (text: string) => {
    const base = text || 'Descreva o que você precisa.';
    return [
      '🎛️ Modo assistido ativo: nenhuma execução automática.',
      `1) Entender: confirme contexto (repo/riscos/prazo). Pedido: "${base}"`,
      '2) Pesquisar: escolha RAG interno, Web ou Brainstorm curto.',
      '3) Se for incidente: acione Twin Builder para reproduzir e gerar harness.',
      '4) Validar: rode sandbox (fail) ou harness Twin antes de qualquer merge.',
      '5) Executar (opcional): use Orquestrador para plano+aprovação ou Operator/Executor após validações.',
      '⚠️ Execução bloqueada neste modo: confirme antes de acionar agentes. Risco atual: baixo (consultivo).',
    ].join('\n');
  };

  const getAssistStub = (action: 'rag' | 'web' | 'brainstorm' | 'twin' | 'sandbox' | 'orchestrate'): string => {
    const common = 'Esta é uma prévia guiada. Nenhuma execução real foi feita.';
    if (action === 'rag') return `🔍 RAG interno (stub)\n- Procurar no índice: erros, stacktrace, serviços afetados\n- Próximo passo: validar snippet encontrado\n${common}`;
    if (action === 'web') return `🌐 Busca web (stub)\n- Pesquise fornecedores, CVEs ou artigos relevantes\n- Próximo passo: comparar com contexto local\n${common}`;
    if (action === 'brainstorm') return `💡 Brainstorm curto (stub)\n- Gerar 3 hipóteses de causa e 3 passos de mitigação\n- Escolha uma para detalhar\n${common}`;
    if (action === 'twin') return `🧪 Twin Builder (stub)\n- Planeje reproduzir o incidente e gerar harness.commands\n- Próximo passo: rodar sandbox com harness (fail-mode)\n${common}`;
    if (action === 'sandbox') return `🛡️ Sandbox (stub)\n- Rodar comando seguro em modo fail\n- Se falhar: reproduziu o bug (bom para diagnóstico)\n${common}`;
    return `🎭 Orquestrador (stub)\n- Criar plano com aprovação\n- Subtarefas: reproduce → analyze → refactor → test → review → deploy\n${common}`;
  };

  const getAssistResultsStub = (action: 'rag' | 'web' | 'brainstorm' | 'twin' | 'sandbox' | 'orchestrate'): string | null => {
    const ts = new Date().toISOString().slice(0, 19).replace('T', ' ');
    if (action === 'rag') return [`[${ts}] service-auth: stacktrace NullPointer em login (alto)`, `[${ts}] service-billing: timeout ao chamar gateway (médio)`, `[${ts}] recomendação: priorizar auth, coletar traces`].join('\n');
    if (action === 'web') return [`[${ts}] CVE-2024-xxxx referência similar (alto)`, `[${ts}] Artigo: mitigação com retry + circuit breaker (médio)`, `[${ts}] recomendação: comparar versão/lib local`].join('\n');
    if (action === 'brainstorm') return [`[${ts}] Hipótese A: regressão em auth`, `[${ts}] Hipótese B: falta de idempotência`, `[${ts}] Próximo: priorizar sandbox fail e logs de auth`].join('\n');
    if (action === 'twin') return [`[${ts}] Harness pronto (stub): npm test -- run twin-fixture`, `[${ts}] Próximo: rodar sandbox fail-mode com harness`, `[${ts}] Verificar se reproduz stacktrace original`].join('\n');
    if (action === 'sandbox') return `[${ts}] Execução simulada: exit 1 (reproduziu bug) — bom para diagnóstico`;
    if (action === 'orchestrate') return [`[${ts}] Plano stub: reproduce → analyze → refactor → test → review → deploy`, `[${ts}] Risco: medium; aprovação requerida para executor`, `[${ts}] Próximo: adicionar checklist de rollback`].join('\n');
    return null;
  };

  const handleAssistAction = (action: 'rag' | 'web' | 'brainstorm' | 'twin' | 'sandbox' | 'orchestrate') => {
    const labels: Record<typeof action, string> = {
      rag: '🔍 Pesquisar no índice interno (RAG) — sugerido para contexto de código/projeto.',
      web: '🌐 Pesquisar na web — buscar referências externas.',
      brainstorm: '💡 Brainstorm rápido — gerar opções e próximos passos.',
      twin: '🧪 Acionar Twin Builder — reproduzir incidente em ambiente controlado.',
      sandbox: '🛡️ Rodar sandbox fail-mode — validar comandos antes de merge.',
      orchestrate: '🎭 Abrir Orquestrador — gerar plano com aprovação antes de executar.',
    };

    setAssistMetrics((prev) => ({
      ...prev,
      researches: ['rag', 'web', 'brainstorm'].includes(action) ? prev.researches + 1 : prev.researches,
      stepsCompleted: prev.stepsCompleted + 1,
    }));

    const resultsStub = getAssistResultsStub(action);

    setMessages((prev) => {
      const newMsgs: Message[] = [
        { role: 'assistant', content: labels[action] },
        { role: 'assistant', content: getAssistStub(action) },
      ];
      if (resultsStub) newMsgs.push({ role: 'assistant', content: resultsStub });
      return [...prev, ...newMsgs];
    });
  };

  const buildExecutionPolicy = () => {
    const allowed = safeMode ? ['advisor', 'reviewer', 'operator', 'advisor-impact'] : undefined;
    const requireApprovalFor = ['executor'];
    return { allowedAgents: allowed, requireApprovalFor };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || (!input.trim() && uploadedFiles.length === 0)) return;

    setInlineSuggestions([]);

    const userText = input.trim() || `Analise os arquivos e gere patches de correção.`;
    const userMessage: Message = {
      role: 'user',
      content: userText + (uploadedFiles.length > 0 ? `\n\nArquivos anexados: ${uploadedFiles.map(f => f.name).join(', ')}` : '')
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    maybeOfferTwinBuilder(userText);

    // Modo LegacyAssist: apenas guia, não executa
    if (agentRole === 'legacyAssist') {
      const guide = buildLegacyAssistGuide(userText);
      setAssistMetrics((prev) => ({ ...prev, stepsCompleted: prev.stepsCompleted + 1 }));
      setMessages(prev => [...prev, { role: 'assistant', content: guide }]);
      // Sugerir CTA explícito para orquestrar ou validar em sandbox, sem executar.
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sugestão: abra o Orquestrador para plano com aprovação, ou rode Sandbox (fail) primeiro. Nenhuma ação será executada sem sua confirmação.',
      }]);
      setInlineSuggestions(computeSuggestions(userText));
      setUploadedFiles([]);
      return;
    }

    // Se modo orquestração, usar fluxo multi-agente
    if (agentRole === 'orchestrate') {
      if (!workerEnabled) {
        setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Worker/Redis desativado. Ative na barra lateral para orquestrar.' }]);
        return;
      }
      await handleOrchestrate(userText, {
        files: uploadedFiles.map(f => f.name),
        sandbox: buildSandboxPayload(),
        safeMode,
      });
      setUploadedFiles([]);
      return;
    }

    // Modo chat livre (econômico / pesquisa)
    if (agentRole === 'chat') {
      setIsLoading(true);
      try {
        if (deepSearch && !ragReady) {
          setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Pesquisa profunda ligada mas índice/RAG está pendente. Reindexe em Configurações para reduzir alucinações.' }]);
        }
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userText, deep: deepSearch }),
        });
        if (!res.ok) throw new Error('Erro no modo chat');
        const data = await res.json();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.reply,
          suggestOrchestrateText: data.suggestOrchestrate ? userText : undefined,
        }]);
      } catch {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Erro ao processar o chat livre.' }]);
      } finally {
        setIsLoading(false);
        setUploadedFiles([]);
      }
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.append('message', userText);
    formData.append('role', agentRole);
    uploadedFiles.forEach(file => formData.append('files', file));

    try {
      const res = await fetch('/api/agent', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Erro no servidor');
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, patches: data.patches || [], tests: data.tests || [] }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erro ao processar. Tente novamente.' }]);
    } finally {
      setIsLoading(false);
      setUploadedFiles([]);
    }
  };

  const handleImportRepo = async () => {
    if (!githubUrl.trim() || isLoading) return;

    const repoMessage: Message = { role: 'user', content: `Importar repo GitHub: ${githubUrl}` };
    setMessages(prev => [...prev, repoMessage]);

    // Se modo orquestração, usar fluxo multi-agente
    if (agentRole === 'orchestrate') {
      setGithubUrl('');
      await handleOrchestrate(
        `Analise o repositório ${githubUrl.trim()} com foco em segurança e refatoração`,
        { githubUrl: githubUrl.trim() }
      );
      return;
    }

    setGithubUrl('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: agentRole,
          message: `Analise o repositório completo com foco em segurança e refatoração.`,
          githubUrl: githubUrl.trim(),
          // Corrigido: accessToken pode estar em session.user ou session, dependendo da config do NextAuth
          accessToken: (session as { accessToken?: string; user?: { accessToken?: string } })?.accessToken || (session as { user?: { accessToken?: string } })?.user?.accessToken || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.reply || 'Erro ao importar');
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, patches: data.patches || [], tests: data.tests || [] }]);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Erro ao importar o repositório.\n\n${errMsg || 'Verifique se o repo existe e se você tem acesso (público ou privado com login).'}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyPatch = async (patch: Patch) => {
    if (agentRole === 'legacyAssist') {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Modo assistido: aplicação automática de patch bloqueada. Use Orquestrador ou mude de modo para executar.' }]);
      return;
    }
    if (safeMode) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Safe mode ativado. Desative em Configurações para aplicar patches.' }]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/agent/apply-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patch }),
      });

      if (!res.ok) throw new Error();

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'projeto-corrigido.zip';
      a.click();
      window.URL.revokeObjectURL(url);

      setMessages(prev => [...prev, { role: 'assistant', content: '✅ **Patch aplicado com sucesso!**\nDownload do projeto corrigido iniciado.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Erro ao aplicar o patch.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTest = (filename: string, content: string) => {
    try {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      setMessages(prev => [...prev, { role: 'assistant', content: `✅ Download iniciado: ${filename}` }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Falha ao baixar: ${filename}` }]);
    }
  };

  const downloadAllTests = async (tests: TestFile[]) => {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      tests.forEach(t => zip.file(t.file, t.content));
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `legacyguard-tests-${Date.now()}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
      setMessages(prev => [...prev, { role: 'assistant', content: `✅ Download ZIP iniciado (${tests.length} arquivos)` }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Falha ao gerar ZIP de testes` }]);
    }
  };

  const triggerTwinBuilder = async (prompt: string) => {
    if (isLoading) return;
    if (!workerEnabled) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Worker/Redis desativado. Ative para enfileirar o Twin Builder.' }]);
      return;
    }

    setIsLoading(true);
    try {
      const incident = {
        id: `inc-${Date.now()}`,
        source: 'custom' as const,
        title: prompt.slice(0, 140),
        payload: { userText: prompt },
      };

      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incident,
          sandbox: { enabled: sandboxEnabled, failMode: sandboxMode },
        }),
      });

      if (!res.ok) throw new Error('Falha ao enfileirar Twin Builder');
      const data = await res.json();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `🧪 Twin Builder enfileirado (tarefa ${data.taskId}). Acompanhe SSE: ${data.streamUrl || '/api/agents/stream'} e logs: ${data.logsUrl || '/api/agents/logs'}`,
      }]);

      if (data.streamUrl) {
        const twinStream = new EventSource(data.streamUrl);
        twinStream.onmessage = (event) => {
          try {
            const update = JSON.parse(event.data);
            if (update.type === 'twin-built' && update.result) {
              const res = update.result;
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: `🧪 **Twin pronto**\nSnapshot: ${res.snapshotPath || 'n/d'}\nFixture: ${res.syntheticFixturePath || 'n/d'}\nTests: ${res.syntheticTests?.length || 0}\nComandos: ${Object.values(res.commands || {}).join(', ') || 'n/d'}\nGuardrails: ${(res.impactGuardrails?.warnings || []).join('; ') || 'nenhum'}`,
                twinReady: true,
              }]);
              twinStream.close();
            }
          } catch {
            // ignore
          }
        };
        twinStream.onerror = () => twinStream.close();
      }

      if (data.logsUrl) {
        const logSource = new EventSource(data.logsUrl);
        logSource.onmessage = (event) => {
          try {
            const logUpdate = JSON.parse(event.data);
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `📡 [Twin log] ${logUpdate.message || event.data}`,
            }]);
          } catch {
            // ignore
          }
        };
        logSource.onerror = () => logSource.close();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao acionar Twin Builder';
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${msg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrchestrate = async (request: string, context?: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'orchestrate',
          request,
          context,
          sandbox: context?.sandbox,
          safeMode,
          executionPolicy: buildExecutionPolicy(),
        }),
      });
      if (!res.ok) throw new Error('Falha ao iniciar orquestração');
      const data = await res.json();

      let logSource: EventSource | null = null;

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `🎭 **Orquestração iniciada**\n\nTarefa: ${data.taskId}\n\nO Planner está analisando seu pedido e criando um plano de execução coordenada. Acompanhe o progresso abaixo.`
      }]);

      if (data.taskId) {
        logSource = new EventSource(`/api/agents/logs?taskId=${encodeURIComponent(data.taskId)}`);
        logSource.onmessage = (event) => {
          try {
            const logUpdate = JSON.parse(event.data);
            const label = logUpdate.scope === 'audit' ? 'Audit' : 'Sandbox';
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `📡 **${label} log**\n${logUpdate.message || event.data}`,
            }]);
          } catch {
            // ignore malformed log event
          }
        };
        logSource.onerror = () => {
          logSource?.close();
        };
      }

      // Iniciar SSE para receber atualizações em tempo real
      const eventSource = new EventSource(data.streamUrl);

      eventSource.onmessage = (event) => {
        try {
          const update = JSON.parse(event.data);

          if (update.type === 'plan') {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `📋 **Plano criado**\n\n${update.plan.summary}\n\n**Subtarefas:** ${update.plan.subtasks.length}\n**Risco:** ${update.plan.riskLevel}\n**Tempo estimado:** ${update.plan.estimatedTime}`
            }]);
          } else if (update.type === 'task-complete') {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `✅ **[${update.task.agent}]** ${update.task.description}`
            }]);
          } else if (update.type === 'task-failed') {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `❌ **Falha em [${update.task.agent}]:** ${update.error}\n\n_Verifique logs do worker para detalhes. O fluxo pode ter sido interrompido._`
            }]);
          } else if (update.type === 'approval-required') {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `⏸️ **Aprovação necessária**\n\nA tarefa "${update.task.description}" requer aprovação humana antes de continuar.\n\nClique no botão abaixo para aprovar.`,
              approvalRequired: update.orchestrationId,
            }]);
          } else if (update.type === 'orchestration-complete') {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `🎉 **Orquestração concluída**\n\nStatus: ${update.state.status}\nResultados: ${update.state.results.length} tarefas executadas`
            }]);
            logSource?.close();
            eventSource.close();
          }
        } catch (err) {
          console.error('Erro ao processar update SSE:', err);
        }
      };

      eventSource.onerror = (e) => {
        console.error('SSE connection error', e);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `⚠️ Conexão SSE perdida. A orquestração pode continuar em segundo plano. Recarregue para ver atualizações.`
        }]);
          logSource?.close();
        eventSource.close();
      };

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao iniciar orquestração';
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${msg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproval = async (orchestrationId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'approve',
          orchestrationId,
        }),
      });
      if (!res.ok) throw new Error('Falha ao aprovar');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ Aprovação concedida. Continuando execução...`
      }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao aprovar';
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${msg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMerge = async () => {
    if (agentRole === 'legacyAssist') {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Modo assistido: merge automático bloqueado. Abra o Orquestrador para plano + aprovação.' }]);
      return;
    }
    if (!mergeOwner.trim() || !mergeRepo.trim() || !mergePrNumber.trim()) return;
    if (safeMode) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Safe mode ativo. Desative em Configurações para permitir merge pelo Executor.' }]);
      return;
    }
    setMergeLoading(true);
    try {
      const prNumber = Number(mergePrNumber.trim());
      if (Number.isNaN(prNumber)) throw new Error('PR inválido');
      const token = (session as { accessToken?: string; user?: { accessToken?: string } })?.accessToken || (session as { user?: { accessToken?: string } })?.user?.accessToken;
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'executor',
          payload: { owner: mergeOwner.trim(), repo: mergeRepo.trim(), prNumber, token },
        }),
      });
      if (!res.ok) throw new Error('Falha ao enfileirar merge');
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: `✅ Merge solicitado ao Executor (tarefa ${data.id || 'enfileirada'})` }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao solicitar merge';
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${msg}` }]);
    } finally {
      setMergeLoading(false);
    }
  };

  const handleResumeSession = async (sessionItem: SessionItem) => {
    setMessages(prev => [...prev, { role: 'assistant', content: `🔄 Retomando sessão "${sessionItem.title}" (tag: ${sessionItem.tag}).` }]);
    try {
      if (!ragReady) {
        const res = await fetch('/api/index', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (res.ok) {
          const data = await res.json();
          setRagReady(true);
          setMessages(prev => [...prev, { role: 'assistant', content: `📚 RAG reindexado (${data.fileCount ?? 0} arquivos). Contexto pronto.` }]);
        } else {
          const err = await res.json().catch(() => ({}));
          setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Falha ao reindexar: ${err.error || res.statusText}. Continue mesmo assim?` }]);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Erro ao reindexar para retomada: ${msg}` }]);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-transparent text-slate-50">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 mix-blend-screen opacity-60">
        <div className="absolute -left-32 -top-32 w-80 h-80 rounded-full bg-emerald-500 blur-[140px]" />
        <div className="absolute right-0 top-10 w-72 h-72 rounded-full bg-indigo-500 blur-[140px]" />
        <div className="absolute left-20 bottom-0 w-96 h-96 rounded-full bg-cyan-500 blur-[160px]" />
      </div>

      {/* Onboarding Tour */}
      <OnboardingTour
        isOpen={onboarding.showTour}
        onClose={onboarding.closeTour}
        onComplete={onboarding.completeTour}
      />

      <div className="relative max-w-[1800px] mx-auto px-4 py-6">
        {/* Header */}
        <header className="glass rounded-2xl px-6 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-emerald-400/20 border border-emerald-300/30 flex items-center justify-center text-xl">🛡️</div>
            <div>
              <h1 className="text-2xl font-bold text-white">LegacyGuard Console</h1>
              <p className="text-sm text-slate-300">Layout de 3 colunas: Contexto → Chat → Governança</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tour Button */}
            <button
              onClick={onboarding.startTour}
              className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-slate-200 transition-colors"
            >
              📖 Tour
            </button>
            
            {status === 'loading' && <span className="text-sm text-slate-300">Carregando sessão...</span>}
            {status !== 'loading' && session?.user && (
              <div className="flex items-center gap-3">
                {session.user.image && (
                  <Image src={session.user.image} alt="Avatar" width={40} height={40} className="rounded-full border border-white/10" />
                )}
                <div className="text-right">
                  <p className="text-sm font-semibold">{session.user.name || session.user.email}</p>
                  <p className="text-xs text-emerald-200">GitHub conectado</p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-semibold transition"
                >
                  Sair
                </button>
              </div>
            )}
            {status !== 'loading' && !session?.user && (
              <button
                onClick={() => signIn('github')}
                className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold shadow-lg shadow-emerald-500/30"
              >
                Login com GitHub
              </button>
            )}
          </div>
        </header>

        {/* Main 3-Column Layout */}
        <div className="grid lg:grid-cols-[280px,1fr,300px] gap-4">
          {/* Column 1: Context & History */}
          <ContextSidebar
            sessions={sessions}
            sessionsLoading={sessionsLoading}
            onResumeSession={handleResumeSession}
            githubUrl={githubUrl}
            onChangeGithubUrl={setGithubUrl}
            onImportRepo={handleImportRepo}
            isLoading={isLoading}
            isLoggedIn={!!session?.user}
            mergeOwner={mergeOwner}
            onChangeMergeOwner={setMergeOwner}
            mergeRepo={mergeRepo}
            onChangeMergeRepo={setMergeRepo}
            mergePrNumber={mergePrNumber}
            onChangeMergePrNumber={setMergePrNumber}
            onMerge={handleMerge}
            mergeLoading={mergeLoading}
          />

          {/* Column 2: Chat & Orchestration */}
          <div className="glass rounded-2xl p-4">
            <ChatArea
              messages={messages}
              isLoading={isLoading}
              agentRole={agentRole}
              onChangeAgentRole={setAgentRole}
              deepSearch={deepSearch}
              onToggleDeepSearch={setDeepSearch}
              input={input}
              onChangeInput={(val) => {
                setInput(val);
                setInlineSuggestions(computeSuggestions(val));
              }}
              onSubmit={handleSubmit}
              uploadedFiles={uploadedFiles}
              onUploadFiles={handleFileUpload}
              onRemoveFile={removeFile}
              inlineSuggestions={inlineSuggestions}
              onApplyPatch={applyPatch}
              onDownloadTest={downloadTest}
              onDownloadAllTests={downloadAllTests}
              onApproval={handleApproval}
              onOrchestrate={(text, ctx) => handleOrchestrate(text, ctx)}
              onTriggerTwinBuilder={triggerTwinBuilder}
              assistMetrics={assistMetrics}
              onAssistAction={handleAssistAction}
              onShowAssistHelp={() => setShowAssistModal(true)}
              safetyBadges={safetyBadges}
            />
          </div>

          {/* Column 3: Governance & Controls */}
          <GovernanceSidebar
            sandboxEnabled={sandboxEnabled}
            onToggleSandbox={setSandboxEnabled}
            sandboxMode={sandboxMode}
            onChangeSandboxMode={setSandboxMode}
            safeMode={safeMode}
            onToggleSafeMode={setSafeMode}
            reviewGate={reviewGate}
            onToggleReviewGate={setReviewGate}
            maskingEnabled={maskingEnabled}
            onToggleMasking={setMaskingEnabled}
            workerEnabled={workerEnabled}
            onToggleWorker={setWorkerEnabled}
            workerStatus={workerStatus}
            sandboxStatus={sandboxStatus}
            apiEnabled={apiEnabled}
            onToggleApi={setApiEnabled}
            deepSearch={deepSearch}
            onToggleDeep={setDeepSearch}
            temperatureCap={temperatureCap}
            onChangeTemperatureCap={setTemperatureCap}
            tokenCap={tokenCap}
            onChangeTokenCap={setTokenCap}
            billingCap={billingCap}
            onChangeBillingCap={setBillingCap}
            ragReady={ragReady}
            onToggleRagReady={setRagReady}
            ragProgress={ragProgress}
            onReindex={async () => {
              try {
                const res = await fetch('/api/index', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({}),
                });
                if (res.ok) {
                  const data = await res.json();
                  setRagReady(true);
                  setMessages(prev => [...prev, { role: 'assistant', content: `📚 RAG reindexado (${data.fileCount ?? 0} arquivos). Contexto pronto.` }]);
                }
              } catch {
                setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Erro ao reindexar.' }]);
              }
            }}
          />
        </div>
      </div>

      {/* LegacyAssist Modal */}
      {showAssistModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => { setShowAssistModal(false); setAssistOnboardingSeen(true); }}>
          <div className="bg-slate-900 rounded-xl max-w-3xl w-full shadow-2xl border border-emerald-400/40" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <div>
                <p className="text-xs text-emerald-200 uppercase tracking-wide">LegacyAssist</p>
                <h2 className="text-2xl font-bold text-emerald-100 mt-1">Modo assistido — sem execução automática</h2>
              </div>
              <button onClick={() => { setShowAssistModal(false); setAssistOnboardingSeen(true); }} className="text-3xl text-slate-300 hover:text-white">&times;</button>
            </div>
            <div className="p-6 space-y-4 text-slate-100 text-sm">
              <p>O LegacyAssist guia você em passos, sugere pesquisas (RAG/Web/Brainstorm) e validações (Twin/Sandbox) antes de qualquer ação. Nada será executado sem sua confirmação.</p>
              <ul className="list-disc list-inside space-y-2 text-slate-200">
                <li>Fluxo: Entender → Pesquisar → Validar → (Opcional) Orquestrar/Executar.</li>
                <li>Execução bloqueada por padrão; use CTA para abrir Orquestrador ou agentes.</li>
                <li>Para incidentes: acione Twin Builder e valide em sandbox fail-mode.</li>
              </ul>
            </div>
            <div className="p-6 border-t border-white/10 flex justify-end gap-3">
              <button onClick={() => { setShowAssistModal(false); setAssistOnboardingSeen(true); }} className="px-5 py-3 rounded-lg bg-white/10 border border-white/20 text-slate-200">Entendi, começar tour</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}