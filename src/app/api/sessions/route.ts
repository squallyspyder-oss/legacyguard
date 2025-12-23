import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.legacyguard');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

type SessionItem = {
  id: string;
  title: string;
  tag: string;
  recency: string;
  risk: 'baixo' | 'medio' | 'alto';
  createdAt: string;
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readSessions(): SessionItem[] {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) return [];
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
    return JSON.parse(raw) as SessionItem[];
  } catch {
    return [];
  }
}

function writeSessions(sessions: SessionItem[]) {
  ensureDataDir();
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
}

export async function GET() {
  const sessions = readSessions();
  return NextResponse.json({ sessions });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const title = body?.title as string | undefined;
  const tag = body?.tag as string | undefined;
  const risk = body?.risk as 'baixo' | 'medio' | 'alto' | undefined;

  if (!title || !tag || !risk) {
    return NextResponse.json({ error: 'title, tag, risk são obrigatórios' }, { status: 400 });
  }

  const sessions = readSessions();
  const item: SessionItem = {
    id: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    tag,
    risk,
    recency: 'agora',
    createdAt: new Date().toISOString(),
  };
  sessions.unshift(item);
  writeSessions(sessions.slice(0, 50));

  return NextResponse.json({ saved: true, session: item });
}
