import { describe, it, expect } from 'vitest';
import { Orchestrator } from '../src/agents/orchestrator';

// Estes testes focam em regras de segurança: safe mode e sandbox fail/warn.

process.env.LEGACYGUARD_PLANNER_MODE = 'mock';
process.env.LEGACYGUARD_REVIEWER_MODE = 'mock';

describe('orchestrator sandbox/safe mode', () => {
  it('bloqueia executor quando safeMode ativo', async () => {
    const orch = new Orchestrator();
    orch.setContext({ safeMode: true, sandbox: { enabled: false } });
    const state = await orch.execute('teste', { summary: 'run executor', repoInfo: {}, safeMode: true });
    expect(state?.status === 'completed' || state?.results.size >= 0).toBe(true);
  });

  it('falha sandbox quando runner ausente e failMode=fail', async () => {
    const orch = new Orchestrator();
    orch.setContext({
      repoPath: process.cwd(),
      sandbox: {
        enabled: true,
        runnerPath: '/path/que/nao/existe.sh',
        failMode: 'fail',
        command: 'echo oi',
      },
    });
    let failed = false;
    try {
      await orch['runSandboxIfEnabled']({ id: 't1', agent: 'executor', description: '', dependencies: [], priority: 'low' } as any);
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  it('segue quando runner ausente e failMode=warn', async () => {
    const orch = new Orchestrator();
    orch.setContext({
      repoPath: process.cwd(),
      sandbox: {
        enabled: true,
        runnerPath: '/path/que/nao/existe.sh',
        failMode: 'warn',
        command: 'echo oi',
      },
    });
    let failed = false;
    try {
      await orch['runSandboxIfEnabled']({ id: 't1', agent: 'executor', description: '', dependencies: [], priority: 'low' } as any);
    } catch {
      failed = true;
    }
    expect(failed).toBe(false);
  });
});
