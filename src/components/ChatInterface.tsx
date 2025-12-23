'use client';

import { useEffect, useMemo, useState } from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { useSession, signIn, signOut } from 'next-auth/react';
import AgentSelector, { AGENT_ROLES } from './AgentSelector';
import SettingsSidebar from './SettingsSidebar';

type SessionItem = {
  id: string;
  title: string;
  tag: string;
  recency: string;
  risk: 'baixo' | 'medio' | 'alto';
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
  patches?: Patch[];
  tests?: TestFile[];
  approvalRequired?: string; // orchestrationId quando precisa aprovação
  suggestOrchestrateText?: string; // quando chat sugere escalar para orquestração
   twinOffer?: { prompt: string };
}

interface Patch {
  file: string;
  original: string;
  fixed: string;
}

interface TestFile {
  file: string;
  content: string;
}

export default function ChatInterface() {
  const { data: session, status } = useSession();

  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: session 
        ? `👋 Olá, ${session.user?.name || 'usuário'}! Eu sou o LegacyGuard. Posso orquestrar agentes, rodar sandbox seguro, criar gêmeos digitais de incidentes (Twin Builder) e entregar mitigações com prova. Diga o que precisa e eu preparo o plano.` 
        : '👋 Olá! Eu sou o LegacyGuard. Posso orquestrar agentes, rodar sandbox seguro, criar gêmeos digitais de incidentes (Twin Builder) e entregar mitigações com prova. Faça login com GitHub para acessar repositórios privados ou me conte o que precisa agora mesmo.' 
    }
  ]);
  const [input, setInput] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedPatch, setSelectedPatch] = useState<Patch | null>(null);
  const [selectedTest, setSelectedTest] = useState<TestFile | null>(null);
  const [agentRole, setAgentRole] = useState<string>(AGENT_ROLES[0].key);
  const [deepSearch, setDeepSearch] = useState(false);
  const [mergeOwner, setMergeOwner] = useState('');
  const [mergeRepo, setMergeRepo] = useState('');
  const [mergePrNumber, setMergePrNumber] = useState('');
  const [mergeLoading, setMergeLoading] = useState(false);
  const [inlineSuggestions, setInlineSuggestions] = useState<string[]>([]);

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
    } catch (e) {
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
                // @ts-ignore custom CTA for rollback placeholder
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

  const handleOrchestrate = async (request: string, context?: any) => {
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
              // @ts-ignore - custom field for approval UI
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
      <div className="pointer-events-none absolute inset-0 mix-blend-screen opacity-60">
        <div className="absolute -left-32 -top-32 w-80 h-80 rounded-full bg-emerald-500 blur-[140px]" />
        <div className="absolute right-0 top-10 w-72 h-72 rounded-full bg-indigo-500 blur-[140px]" />
        <div className="absolute left-20 bottom-0 w-96 h-96 rounded-full bg-cyan-500 blur-[160px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-[320px,1fr] gap-4">
        <SettingsSidebar
          deepSearch={deepSearch}
          onToggleDeep={setDeepSearch}
          sandboxEnabled={sandboxEnabled}
          onToggleSandbox={setSandboxEnabled}
          sandboxMode={sandboxMode}
          onChangeSandboxMode={setSandboxMode}
          safeMode={safeMode}
          onToggleSafeMode={setSafeMode}
          reviewGate={reviewGate}
          onToggleReviewGate={setReviewGate}
          workerEnabled={workerEnabled}
          onToggleWorker={setWorkerEnabled}
          maskingEnabled={maskingEnabled}
          onToggleMasking={setMaskingEnabled}
          ragReady={ragReady}
          onToggleRagReady={setRagReady}
          apiEnabled={apiEnabled}
          onToggleApi={setApiEnabled}
          billingCap={billingCap}
          onChangeBillingCap={setBillingCap}
          tokenCap={tokenCap}
          onChangeTokenCap={setTokenCap}
          temperatureCap={temperatureCap}
          onChangeTemperatureCap={setTemperatureCap}
          sessions={sessions}
          onResumeSession={handleResumeSession}
          sessionsLoading={sessionsLoading}
        />

        <div className="flex flex-col gap-6">
          <header className="glass rounded-2xl px-6 py-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-emerald-400/20 border border-emerald-300/30 flex items-center justify-center text-xl">🛡️</div>
              <div>
                <h1 className="text-2xl font-bold text-white">LegacyGuard Console</h1>
                <p className="text-sm text-slate-300">Orquestre agentes, teste em sandbox e revise segurança em um só lugar.</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {safetyBadges.map((b, idx) => (
                    <span key={idx} className="text-[11px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-slate-200">{b}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {status === 'loading' && <span className="text-sm text-slate-300">Carregando sessão...</span>}
              {status !== 'loading' && session?.user && (
                <div className="flex items-center gap-3">
                  {session.user.image && (
                    <img src={session.user.image} alt="Avatar" className="w-10 h-10 rounded-full border border-white/10" />
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

          <div className="grid lg:grid-cols-[2fr,1fr] gap-4">
            <div className="glass rounded-2xl p-4 flex flex-col gap-4 min-h-[75vh]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">Chat & Execução</p>
                  <p className="text-lg font-semibold">Fale com os agentes e acompanhe a orquestração</p>
                </div>
                {isLoading && <span className="px-3 py-1 rounded-full bg-amber-400/15 text-amber-200 text-xs border border-amber-400/40">Processando...</span>}
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-4 rounded-xl border border-white/5 bg-black/10 p-3">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-3xl px-5 py-4 rounded-2xl shadow-sm border whitespace-pre-wrap leading-relaxed
                        ${msg.role === 'user'
                          ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-50'
                          : 'bg-white/5 border-white/10 text-slate-100'}`}
                    >
                      <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br />') }} />

                      {msg.twinOffer && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => triggerTwinBuilder(msg.twinOffer!.prompt)}
                            disabled={isLoading}
                            className="px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-50 text-sm disabled:opacity-50 hover:bg-emerald-500/30"
                          >
                            🚀 Acionar Twin Builder
                          </button>
                          <button
                            onClick={() => setMessages(prev => [...prev, { role: 'assistant', content: 'Twin Builder não foi acionado desta vez.' }])}
                            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-slate-200 text-sm hover:bg-white/20"
                          >
                            Agora não
                          </button>
                        </div>
                      )}

                      {/* Placeholder para rollback/guardrails UI */}
                      {(msg as any).twinReady && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => setMessages(prev => [...prev, { role: 'assistant', content: 'Rollback preparado (placeholder).' }])}
                            className="px-3 py-2 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-50 text-sm hover:bg-amber-500/30"
                          >
                            🛡️ Preparar rollback
                          </button>
                          <button
                            onClick={() => setMessages(prev => [...prev, { role: 'assistant', content: 'Continuar sem rollback (placeholder).' }])}
                            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-slate-200 text-sm hover:bg-white/20"
                          >
                            Continuar sem rollback
                          </button>
                        </div>
                      )}

                      {msg.role === 'assistant' && msg.patches && msg.patches.length > 0 && (
                        <div className="mt-5 space-y-3">
                          <div className="flex items-center gap-2 text-emerald-200 text-sm font-semibold">
                            <span>🛠️ Patches disponíveis</span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-xs">{msg.patches.length}</span>
                          </div>
                          {msg.patches.map((patch, idx) => (
                            <div key={idx} className="rounded-lg border border-white/10 bg-black/20 p-3 flex flex-col gap-3">
                              <p className="font-medium text-sm">📄 {patch.file}</p>
                              <div className="flex gap-2 flex-wrap">
                                <button
                                  onClick={() => setSelectedPatch(patch)}
                                  className="px-3 py-2 rounded-lg bg-indigo-500/20 border border-indigo-400/40 text-indigo-50 text-sm hover:bg-indigo-500/30"
                                >
                                  👁️ Visualizar
                                </button>
                                <button
                                  onClick={() => applyPatch(patch)}
                                  disabled={isLoading}
                                  className="px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-50 text-sm disabled:opacity-50 hover:bg-emerald-500/30"
                                >
                                  ✅ Aplicar
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {msg.role === 'assistant' && msg.tests && msg.tests.length > 0 && (
                        <div className="mt-5 space-y-3">
                          <div className="flex items-center gap-2 text-cyan-200 text-sm font-semibold">
                            <span>🧪 Testes gerados</span>
                            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-xs">{msg.tests.length}</span>
                            {msg.tests.length > 1 && (
                              <button
                                onClick={() => downloadAllTests(msg.tests!)}
                                className="ml-2 px-2 py-1 text-xs rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
                              >
                                ⬇️ Baixar todos
                              </button>
                            )}
                          </div>
                          {msg.tests.map((t, idx) => (
                            <div key={idx} className="rounded-lg border border-white/10 bg-black/20 p-3 flex flex-col gap-3">
                              <p className="font-medium text-sm">📄 {t.file}</p>
                              <div className="flex gap-2 flex-wrap">
                                <button
                                  onClick={() => setSelectedTest(t)}
                                  className="px-3 py-2 rounded-lg bg-indigo-500/20 border border-indigo-400/40 text-indigo-50 text-sm hover:bg-indigo-500/30"
                                >
                                  👁️ Visualizar
                                </button>
                                <button
                                  onClick={() => downloadTest(t.file, t.content)}
                                  className="px-3 py-2 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-50 text-sm hover:bg-cyan-500/30"
                                >
                                  ⬇️ Baixar
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {msg.role === 'assistant' && msg.approvalRequired && (
                        <div className="mt-5">
                          <button
                            onClick={() => handleApproval(msg.approvalRequired!)}
                            disabled={isLoading}
                            className="px-4 py-3 rounded-lg bg-amber-500/20 border border-amber-400/50 text-amber-100 font-semibold disabled:opacity-50 animate-pulse"
                          >
                            ✅ Aprovar e continuar execução
                          </button>
                        </div>
                      )}

                      {msg.role === 'assistant' && msg.suggestOrchestrateText && (
                        <div className="mt-4 p-3 rounded-lg border border-emerald-400/40 bg-emerald-500/10">
                          <p className="text-sm text-emerald-100 font-semibold mb-2">Esta solicitação parece exigir agentes. Quer orquestrar?</p>
                          <button
                            onClick={() => handleOrchestrate(msg.suggestOrchestrateText!, { files: uploadedFiles.map(f => f.name) })}
                            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold"
                          >
                            Iniciar Orquestração
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && messages.length === 0 && (
                  <div className="text-sm text-slate-300">Processando repositório e gerando análise...</div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {uploadedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {uploadedFiles.map((file, i) => (
                      <div key={i} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs flex items-center gap-2">
                        <span>{file.name}</span>
                        <button type="button" onClick={() => removeFile(i)} className="text-rose-300 hover:text-rose-200">×</button>
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
                        onClick={() => setInput(prev => (prev.trim().length ? `${prev.trim()} ${sug}` : sug))}
                        className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[12px] text-slate-100 hover:bg-white/20"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInput(val);
                      setInlineSuggestions(computeSuggestions(val));
                    }}
                    placeholder={agentRole === 'chat' ? 'Pergunte, pesquise, faça brainstorm...' : 'Peça análise, refatoração ou orquestração completa...'}
                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/40"
                    disabled={isLoading}
                  />
                  <input type="file" id="file-upload" multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
                  <label htmlFor="file-upload" className="px-3 py-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 text-lg">📎</label>
                  <button
                    type="submit"
                    disabled={isLoading || (!input.trim() && uploadedFiles.length === 0)}
                    className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold disabled:opacity-50 shadow-lg shadow-emerald-500/30"
                  >
                    Enviar
                  </button>
                </div>
              </form>
            </div>

            <div className="flex flex-col gap-4">
              <div className="glass rounded-2xl p-4 space-y-4">
                <AgentSelector value={agentRole} onChange={setAgentRole} />
                {agentRole === 'chat' && (
                  <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2">
                    <div>
                      <p className="text-sm text-slate-100 font-semibold">Pesquisa profunda</p>
                      <p className="text-xs text-slate-400">Ativa modelo mais caro + busca contextual</p>
                    </div>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-emerald-500"
                        checked={deepSearch}
                        onChange={(e) => setDeepSearch(e.target.checked)}
                      />
                      <span className="text-xs text-slate-200">Ligado</span>
                    </label>
                  </div>
                )}
                <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-xs text-slate-300 leading-relaxed">
                  <p className="font-semibold text-slate-100 mb-1">Dicas rápidas</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Use Orquestrador para planos completos com aprovação.</li>
                    <li>Habilite sandbox via contexto/ambiente para validar antes do executor.</li>
                    <li>Importer repo público ou privado (login GitHub para privado).</li>
                  </ul>
                </div>
              </div>

              <div className="glass rounded-2xl p-4 space-y-3">
                <p className="text-sm font-semibold text-white">Importar repositório</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/user/repo"
                    className="flex-1 px-3 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/30"
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleImportRepo}
                    disabled={isLoading || !githubUrl.trim()}
                    className="px-4 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold disabled:opacity-50 shadow-md shadow-cyan-500/30"
                  >
                    Importar
                  </button>
                </div>
                {!session && (
                  <p className="text-xs text-slate-400">Faça login com GitHub para importar privados.</p>
                )}
              </div>

              <div className="glass rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">Merge (Executor)</p>
                  {mergeLoading && <span className="text-xs text-amber-200">Solicitando...</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={mergeOwner}
                    onChange={(e) => setMergeOwner(e.target.value)}
                    placeholder="owner"
                    className="flex-1 min-w-[120px] px-3 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/30"
                    disabled={isLoading}
                  />
                  <input
                    type="text"
                    value={mergeRepo}
                    onChange={(e) => setMergeRepo(e.target.value)}
                    placeholder="repo"
                    className="flex-1 min-w-[120px] px-3 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/30"
                    disabled={isLoading}
                  />
                  <input
                    type="text"
                    value={mergePrNumber}
                    onChange={(e) => setMergePrNumber(e.target.value)}
                    placeholder="PR #"
                    className="w-24 px-3 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/30"
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleMerge}
                    disabled={mergeLoading || !mergeOwner.trim() || !mergeRepo.trim() || !mergePrNumber.trim()}
                    className="px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold disabled:opacity-50 shadow-md shadow-amber-500/30"
                  >
                    Merge PR
                  </button>
                </div>
                <p className="text-xs text-slate-400">Requer token GitHub com permissão de merge. Use com cautela.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedPatch && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedPatch(null)}>
          <div className="bg-slate-900 rounded-xl max-w-7xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-emerald-300">Preview do Patch: {selectedPatch.file}</h2>
              <button onClick={() => setSelectedPatch(null)} className="text-3xl text-slate-300 hover:text-white">&times;</button>
            </div>
            <div className="flex-1 overflow-auto">
              <ReactDiffViewer
                oldValue={selectedPatch.original}
                newValue={selectedPatch.fixed}
                splitView={true}
                useDarkTheme={true}
                leftTitle="Código Original"
                rightTitle="Código Corrigido"
                styles={{
                  contentText: { lineHeight: '1.6' },
                  diffContainer: { fontFamily: 'monospace', fontSize: '14px' },
                  line: { padding: '2px 4px' },
                }}
              />
            </div>
            <div className="p-6 border-t border-white/10 flex justify-end gap-4">
              <button onClick={() => setSelectedPatch(null)} className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-lg font-medium border border-white/10">
                Fechar
              </button>
              <button
                onClick={() => {
                  applyPatch(selectedPatch);
                  setSelectedPatch(null);
                }}
                disabled={isLoading}
                className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-lg font-semibold disabled:opacity-50"
              >
                Aplicar este Patch
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTest && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedTest(null)}>
          <div className="bg-slate-900 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-emerald-300">Preview do Teste: {selectedTest.file}</h2>
              <button onClick={() => setSelectedTest(null)} className="text-3xl text-slate-300 hover:text-white">&times;</button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <pre className="whitespace-pre-wrap font-mono text-sm text-slate-100">{selectedTest.content}</pre>
            </div>
            <div className="p-6 border-t border-white/10 flex justify-end gap-4">
              <button onClick={() => setSelectedTest(null)} className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-lg font-medium border border-white/10">
                Fechar
              </button>
              <button
                onClick={() => {
                  downloadTest(selectedTest.file, selectedTest.content);
                  setSelectedTest(null);
                }}
                className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-lg font-semibold"
              >
                Baixar este Teste
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}