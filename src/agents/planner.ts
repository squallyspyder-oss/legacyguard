/* eslint-disable @typescript-eslint/no-explicit-any */
import OpenAI from 'openai';

export type SubTask = {
  id: string;
  type: 'analyze' | 'refactor' | 'test' | 'security' | 'review' | 'deploy';
  description: string;
  agent: 'advisor' | 'operator' | 'executor' | 'reviewer' | 'advisor-impact';
  dependencies: string[]; // IDs das subtarefas que precisam completar antes
  priority: 'high' | 'medium' | 'low';
  estimatedComplexity: number; // 1-10
};

export type Plan = {
  id: string;
  originalRequest: string;
  summary: string;
  subtasks: SubTask[];
  estimatedTime: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresApproval: boolean;
};

const PLANNER_SYSTEM_PROMPT = `Você é o Planner Agent do LegacyGuard, especializado em quebrar tarefas complexas de manutenção de código legado em subtarefas executáveis.

Sua função é analisar o pedido do usuário e criar um plano de execução estruturado.

REGRAS:
1. Sempre comece com análise (advisor) antes de modificações
2. Segurança é prioridade - inclua scan de vulnerabilidades
3. Testes devem ser gerados ANTES de refatorações arriscadas
4. Review é obrigatório para mudanças de alto risco
5. Deploy/merge só após aprovação humana para operações críticas

AGENTES DISPONÍVEIS:
- advisor: Analisa código, sugere melhorias, identifica problemas
- advisor-impact: Analisa impacto/refatores em graph/index
- operator: Cria branches, aplica patches, gera PRs
- reviewer: Revisa código, valida qualidade, checa compliance
- executor: Merge PRs, deploy (requer aprovação)

TIPOS DE SUBTAREFA:
- analyze: Análise de código/contexto
- refactor: Refatoração/correção
- test: Geração/execução de testes
- security: Scan de vulnerabilidades
- review: Revisão de código
- deploy: Merge/deploy

Responda APENAS com JSON válido no formato:
{
  "summary": "Resumo do plano",
  "subtasks": [
    {
      "id": "1",
      "type": "analyze",
      "description": "Descrição clara da tarefa",
      "agent": "advisor",
      "dependencies": [],
      "priority": "high",
      "estimatedComplexity": 3
    }
  ],
  "estimatedTime": "30 minutos",
  "riskLevel": "medium",
  "requiresApproval": false
}`;

export async function runPlanner(task: {
  request: string;
  context?: string;
  repoInfo?: { files: number; languages: string[] };
}): Promise<Plan> {
  // Modo mock para testes/offline: evita dependência de API externa
  if (process.env.LEGACYGUARD_PLANNER_MODE === 'mock' || (!process.env.OPENAI_API_KEY && process.env.NODE_ENV === 'test')) {
    const fakePlan: Plan = {
      id: `plan-${Date.now()}`,
      originalRequest: task.request,
      summary: 'Plano mock para testes',
      subtasks: [
        {
          id: '1',
          type: 'analyze',
          description: 'Analisar contexto e riscos',
          agent: 'advisor',
          dependencies: [],
          priority: 'high',
          estimatedComplexity: 3,
        },
        {
          id: '2',
          type: 'review',
          description: 'Revisar alterações antes de executar',
          agent: 'reviewer',
          dependencies: ['1'],
          priority: 'medium',
          estimatedComplexity: 3,
        },
      ],
      estimatedTime: '15 minutos',
      riskLevel: 'medium',
      requiresApproval: false,
    };
    return fakePlan;
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const userPrompt = `
PEDIDO DO USUÁRIO:
${task.request}

${task.context ? `CONTEXTO ADICIONAL:\n${task.context}` : ''}

${task.repoInfo ? `INFO DO REPOSITÓRIO:\n- Arquivos: ${task.repoInfo.files}\n- Linguagens: ${task.repoInfo.languages.join(', ')}` : ''}

Crie um plano de execução detalhado para esta tarefa.
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: PLANNER_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content || '{}';
  let parsed: any;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Planner retornou JSON inválido');
  }

  const plan: Plan = {
    id: `plan-${Date.now()}`,
    originalRequest: task.request,
    summary: parsed.summary || 'Plano gerado',
    subtasks: (parsed.subtasks || []).map((st: any, idx: number) => ({
      id: st.id || String(idx + 1),
      type: st.type || 'analyze',
      description: st.description || '',
      agent: st.agent || 'advisor',
      dependencies: st.dependencies || [],
      priority: st.priority || 'medium',
      estimatedComplexity: st.estimatedComplexity || 5,
    })),
    estimatedTime: parsed.estimatedTime || 'desconhecido',
    riskLevel: parsed.riskLevel || 'medium',
    requiresApproval: parsed.requiresApproval ?? false,
  };

  // Validação: se riskLevel é critical, forçar aprovação
  if (plan.riskLevel === 'critical') {
    plan.requiresApproval = true;
  }

  return plan;
}

export function getExecutionOrder(plan: Plan): SubTask[][] {
  // Retorna subtarefas agrupadas por "wave" (podem executar em paralelo)
  const completed = new Set<string>();
  const waves: SubTask[][] = [];
  const remaining = [...plan.subtasks];

  while (remaining.length > 0) {
    const wave: SubTask[] = [];

    for (let i = remaining.length - 1; i >= 0; i--) {
      const task = remaining[i];
      const depsOk = task.dependencies.every((d) => completed.has(d));

      if (depsOk) {
        wave.push(task);
        remaining.splice(i, 1);
      }
    }

    if (wave.length === 0 && remaining.length > 0) {
      // Ciclo de dependências - forçar execução
      console.warn('Ciclo de dependências detectado, forçando execução');
      wave.push(remaining.shift()!);
    }

    wave.forEach((t) => completed.add(t.id));
    waves.push(wave);
  }

  return waves;
}
