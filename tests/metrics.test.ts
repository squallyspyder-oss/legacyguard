import { describe, expect, it, beforeEach } from 'vitest';
import { startIncidentCycle, markMitigation, recordRegression, getMetricsSummary, resetMetrics } from '@/lib/metrics';

describe('metrics', () => {
  beforeEach(() => {
    resetMetrics();
  });

  it('calcula MTTR e regressões básicas', () => {
    startIncidentCycle('inc-1', 'sentry', 0);
    markMitigation('inc-1', 'mitigated', 1000);
    recordRegression('inc-1', 'teste de regressao');

    const summary = getMetricsSummary();

    expect(summary.totals.incidents).toBe(1);
    expect(summary.totals.mitigated).toBe(1);
    expect(summary.mttr.avgMs).toBe(1000);
    expect(summary.mttr.p50Ms).toBe(1000);
    expect(summary.regressions.total).toBe(1);
    expect(summary.regressions.perIncident).toBeCloseTo(1);
  });

  it('marca incidente ao mitigar mesmo sem start prévio', () => {
    markMitigation('inc-2', 'failed', 500);
    const summary = getMetricsSummary();

    expect(summary.totals.incidents).toBe(1);
    expect(summary.totals.failed).toBe(1);
    expect(summary.mttr.samples).toBe(0); // failed não entra em MTTR
  });
});
