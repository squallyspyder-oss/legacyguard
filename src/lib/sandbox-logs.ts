import { EventEmitter } from 'events';

export type SandboxLogEvent = {
  taskId?: string;
  message: string;
  scope?: 'sandbox' | 'audit' | 'orchestrator';
};

export const sandboxLogEmitter = new EventEmitter();

export function emitSandboxLog(event: SandboxLogEvent) {
  sandboxLogEmitter.emit('log', event);
}
