import { NextRequest, NextResponse } from 'next/server';
import { exportEvidenceBundle } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const format = (url.searchParams.get('format') as 'soc2' | 'iso' | null) || 'soc2';
  const scope = url.searchParams.get('scope') || 'legacyguard';
  const bundle = exportEvidenceBundle({ format: format === 'iso' ? 'iso' : 'soc2', scope });
  return NextResponse.json(bundle);
}
