import { NextResponse } from 'next/server';
import { getMetricsSummary } from '@/lib/metrics';

export async function GET() {
  const metrics = getMetricsSummary();
  return NextResponse.json({ metrics });
}
