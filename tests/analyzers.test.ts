/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { classifyBehavior } from '@/analyzers/behavior-classifier';
import { generateHarness } from '@/analyzers/harness-generator';
import { LegacyProfile } from '@/analyzers/legacy-profiler';

const baseIncident = { id: 'inc', source: 'custom', title: 'teste' } as any;

describe('behavior classifier', () => {
  it('marca risco alto para exec + obfuscation', () => {
    const profile: LegacyProfile = {
      filesScanned: 1,
      imports: [],
      findings: [],
      signals: { crypto: false, network: false, filesystem: false, exec: true, obfuscation: true },
      suspiciousStrings: [],
    };
    const res = classifyBehavior(profile);
    expect(res.risk).toBe('high');
    expect(res.behaviors).toContain('exec');
  });
});

describe('harness generator', () => {
  it('gera comandos com base em behaviors', () => {
    const profile: LegacyProfile = {
      filesScanned: 1,
      imports: [],
      findings: [],
      signals: { crypto: true, network: true, filesystem: false, exec: false, obfuscation: false },
      suspiciousStrings: [],
    };
    const behavior = classifyBehavior(profile);
    const harness = generateHarness(profile, behavior, baseIncident);
    expect(harness.commands.length).toBeGreaterThan(0);
    expect(harness.fixtures.length).toBeGreaterThan(0);
  });
});
