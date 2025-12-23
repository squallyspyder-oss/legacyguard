import { NextResponse } from 'next/server';
import { enqueueIncident } from '../ingest';

function normalizeDatadog(payload: any) {
  const alert = payload?.event || payload;
  return {
    id: alert?.id || `dd-${Date.now()}`,
    source: 'datadog',
    title: alert?.title || alert?.text || 'Datadog alert',
    stack: alert?.alert_type || undefined,
    payload,
    repo: {
      url: alert?.url || undefined,
    },
  };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const incident = normalizeDatadog(body);
  const result = await enqueueIncident({ incident, repoPath: body.repoPath, sandbox: body.sandbox });
  return NextResponse.json(result);
}
