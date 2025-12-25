/* eslint-disable @typescript-eslint/no-explicit-any */
import { IncidentAlert } from '../agents/twin-builder';
import { LegacyProfile } from './legacy-profiler';
import { BehaviorClassification } from './behavior-classifier';

export type HarnessSuggestion = {
  name: string;
  command: string;
  notes?: string;
};

export type HarnessPack = {
  fixtures: Array<{ name: string; input: any }>;
  commands: HarnessSuggestion[];
  setup?: string[];
  teardown?: string[];
  env?: Record<string, string>;
  workdir?: string;
};

export function generateHarness(profile: LegacyProfile, behavior: BehaviorClassification, incident: IncidentAlert): HarnessPack {
  const fixtures: Array<{ name: string; input: any }> = [];
  const commands: HarnessSuggestion[] = [];

  if (incident.payload) {
    fixtures.push({ name: 'replay-incident-payload', input: incident.payload });
  }
  if (incident.stack) {
    fixtures.push({ name: 'stack-sanity', input: { stack: incident.stack } });
  }

  if (behavior.behaviors.includes('network-client')) {
    commands.push({ name: 'mock-network', command: 'DISABLE_NET=1 npm test', notes: 'Isolar chamadas externas' });
  }
  if (behavior.behaviors.includes('filesystem')) {
    commands.push({ name: 'fs-sandbox', command: 'SANDBOX_FS=1 npm test', notes: 'Bloquear escrita fora do sandbox' });
  }
  if (behavior.behaviors.includes('exec')) {
    commands.push({ name: 'block-exec', command: 'BLOCK_EXEC=1 npm test', notes: 'Desabilitar child_process' });
  }
  if (behavior.behaviors.includes('crypto')) {
    commands.push({ name: 'crypto-fuzz', command: 'npm test -- crypto', notes: 'Cobrir fluxos criptográficos' });
  }

  // fallback genérico
  if (commands.length === 0) {
    commands.push({ name: 'baseline-tests', command: 'npm test', notes: 'Smoke genérico' });
  }

  if (fixtures.length === 0) {
    fixtures.push({ name: 'placeholder-fixture', input: { note: 'sem dados do incidente' } });
  }

  return { fixtures, commands };
}
