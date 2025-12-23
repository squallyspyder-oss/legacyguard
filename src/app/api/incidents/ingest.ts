/* eslint-disable @typescript-eslint/no-explicit-any */
import { enqueueTask } from '../../../lib/queue';
import { logEvent } from '../../../lib/audit';

export async function enqueueIncident(options: {
  incident: any;
  repoPath?: string;
  sandbox?: any;
}) {
  const taskId = `incident-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const payload = {
    role: 'twin-builder',
    taskId,
    incident: options.incident,
    repoPath: options.repoPath || process.env.LEGACYGUARD_REPO_PATH || process.cwd(),
    sandbox: options.sandbox || { enabled: true, failMode: 'fail' },
  };

  await enqueueTask('agents', payload);

  try {
    await logEvent({
      action: 'incident_enqueued',
      severity: 'info',
      message: `Twin builder enfileirado (${taskId})`,
      metadata: { taskId, source: options.incident?.source },
    });
  } catch (e) {
    console.warn('Falha ao auditar incidente', e);
  }

  return {
    queued: true,
    taskId,
    streamUrl: `/api/agents/stream?taskId=${taskId}`,
    logsUrl: `/api/agents/logs?taskId=${taskId}`,
  };
}
