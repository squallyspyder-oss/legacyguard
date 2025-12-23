import { NextResponse } from 'next/server';
import { enqueueIncident } from './ingest';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  if (!body?.incident) {
    return NextResponse.json({ error: 'Campo incident é obrigatório' }, { status: 400 });
  }
  const result = await enqueueIncident({
    incident: body.incident,
    repoPath: body.repoPath,
    sandbox: body.sandbox,
  });

  return NextResponse.json(result);
}
