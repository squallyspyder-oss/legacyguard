import { NextRequest, NextResponse } from 'next/server';
import { parsePlaybook } from '@/lib/playbook-dsl';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.dsl !== 'string') {
    return NextResponse.json({ error: 'Campo dsl obrigatório' }, { status: 400 });
  }
  try {
    const parsed = parsePlaybook(body.dsl);
    return NextResponse.json({ playbook: parsed });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
