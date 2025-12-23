import { describe, it, expect, beforeEach } from 'vitest';
import { logEvent, logArtifact, exportEvidenceBundle, resetAuditMemory } from '@/lib/audit';

// limpa memória entre testes
beforeEach(() => {
  resetAuditMemory();
});

describe('audit evidence bundle', () => {
  it('gera bundle assinado com logs e artifacts em memória', async () => {
    const logId = await logEvent({ action: 'test.action', message: 'ok', severity: 'info' });
    await logArtifact({ kind: 'evidence', logId, checksum: 'abc123' });

    const bundle = exportEvidenceBundle({ format: 'soc2', scope: 'test' });

    expect(bundle.format).toBe('soc2');
    expect(bundle.scope).toBe('test');
    expect(bundle.signature).toMatch(/^[a-f0-9]{64}$/);
    expect(bundle.logs.length).toBeGreaterThan(0);
    expect(bundle.artifacts.length).toBeGreaterThan(0);
  });
});
