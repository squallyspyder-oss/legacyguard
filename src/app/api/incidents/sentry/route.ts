import { NextResponse } from 'next/server';
import { enqueueIncident } from '../ingest';

function normalizeSentry(payload: any) {
  return {
    id: payload?.event_id || payload?.id || `sentry-${Date.now()}`,
    source: 'sentry',
    title: payload?.message || payload?.title || 'Sentry alert',
    stack: payload?.exception?.values?.[0]?.stacktrace ? JSON.stringify(payload.exception.values[0].stacktrace) : undefined,
    payload,
    repo: {
      url: payload?.release || undefined,
      owner: payload?.project ? payload.project.split('/')?.[0] : undefined,
      name: payload?.project ? payload.project.split('/')?.[1] : undefined,
    },
  };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const incident = normalizeSentry(body);
  const result = await enqueueIncident({ incident, repoPath: body.repoPath, sandbox: body.sandbox });
  return NextResponse.json(result);
}
