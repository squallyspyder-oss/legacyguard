import { describe, it, expect } from 'vitest';
import { parsePlaybook } from '@/lib/playbook-dsl';

describe('playbook dsl', () => {
  it('parseia formato simples com guardrails', () => {
    const dsl = `
- run_tests | guardrails:mask-secrets name:tests command:npm-test
- deploy | guards:approval-required name:deploy-prod
`;
    const parsed = parsePlaybook(dsl);
    expect(parsed.steps.length).toBe(2);
    expect(parsed.steps[0].action).toBe('run_tests');
    expect(parsed.steps[0].guardrails?.[0]).toBe('mask-secrets');
    expect(parsed.steps[0].params?.command).toBe('npm-test');
  });

  it('aceita JSON com steps', () => {
    const json = JSON.stringify({
      name: 'pb',
      version: '1.0.0',
      steps: [{ action: 'lint', name: 'lint-step', guardrails: ['safe-mode'], params: { path: '.' } }],
    });
    const parsed = parsePlaybook(json);
    expect(parsed.name).toBe('pb');
    expect(parsed.steps[0].action).toBe('lint');
    expect(parsed.steps[0].guardrails?.[0]).toBe('safe-mode');
  });
});
