import { NextResponse } from 'next/server';
import { enqueueIncident } from '../ingest';

function normalizeOtel(payload: any) {
  const attrs = payload?.resource?.attributes || payload?.resourceAttributes || {};
  const scope = payload?.scope || payload?.instrumentationScope || {};
  return {
    id: payload?.traceId || payload?.spanId || `otel-${Date.now()}`,
    source: 'otel',
    title: payload?.name || payload?.eventName || 'OpenTelemetry event',
    stack: payload?.stack || payload?.exception?.stacktrace || undefined,
    payload,
    repo: {
      url: attrs['service.name'] || undefined,
      owner: attrs['service.namespace'] || undefined,
    },
    scope,
  };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const incident = normalizeOtel(body);
  const result = await enqueueIncident({ incident, repoPath: body.repoPath, sandbox: body.sandbox });
  return NextResponse.json(result);
}
