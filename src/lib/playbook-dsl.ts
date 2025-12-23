/* eslint-disable @typescript-eslint/no-explicit-any */
export type PlaybookStep = {
  name: string;
  action: string;
  guardrails?: string[];
  params?: Record<string, string>;
};

export type Playbook = {
  name: string;
  version: string;
  steps: PlaybookStep[];
  raw: string;
};

function parseKeyVals(body: string): Record<string, string> {
  const params: Record<string, string> = {};
  body
    .split(/\s+/)
    .filter(Boolean)
    .forEach((chunk) => {
      const [k, ...rest] = chunk.split(':');
      if (k && rest.length > 0) params[k.trim()] = rest.join(':').trim();
    });
  return params;
}

function normalizeName(input: string, idx: number) {
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : `step-${idx + 1}`;
}

export function parsePlaybook(dsl: string): Playbook {
  const raw = dsl || '';
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  // Tentativa de JSON para quem preferir formato estruturado
  if (raw.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.steps)) throw new Error('steps ausente');
      const steps: PlaybookStep[] = parsed.steps.map((s: any, idx: number) => ({
        name: normalizeName(s.name || '', idx),
        action: String(s.action || ''),
        guardrails: Array.isArray(s.guardrails) ? s.guardrails.map(String) : undefined,
        params: typeof s.params === 'object' && s.params ? s.params : undefined,
      }));
      return {
        name: parsed.name || 'playbook',
        version: parsed.version || '0.1.0',
        steps,
        raw,
      };
    } catch (err) {
      throw new Error(`Playbook JSON inválido: ${err instanceof Error ? err.message : err}`);
    }
  }

  const steps: PlaybookStep[] = [];
  lines.forEach((line, idx) => {
    if (!line.startsWith('-')) return;
    const body = line.replace(/^-\s*/, '');
    const [actionPart, ...rest] = body.split('|');
    const action = actionPart?.trim();
    if (!action) return;
    const params = parseKeyVals(rest.join(' '));
    const guardrailsRaw = params.guardrails || params.guards;
    const guardrails = guardrailsRaw ? guardrailsRaw.split(',').map((g) => g.trim()).filter(Boolean) : undefined;
    delete params.guardrails;
    delete params.guards;
    steps.push({
      name: normalizeName(params.name || '', idx),
      action,
      guardrails,
      params: Object.keys(params).length ? params : undefined,
    });
  });

  if (steps.length === 0) {
    throw new Error('Nenhum passo encontrado no playbook');
  }

  return {
    name: 'playbook-dsl',
    version: '0.1.0',
    steps,
    raw,
  };
}
