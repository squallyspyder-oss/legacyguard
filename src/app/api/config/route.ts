import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.legacyguard');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

const DEFAULT_CONFIG = {
  sandboxEnabled: true,
  sandboxFailMode: 'fail',
  safeMode: true,
  workerEnabled: true,
  maskingEnabled: true,
  deepSearch: false,
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return { ...DEFAULT_CONFIG };
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Record<string, unknown>) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function writeConfig(cfg: Record<string, unknown>) {
  ensureDataDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
}

export async function GET() {
  const cfg = readConfig();
  return NextResponse.json({ config: cfg });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const current = readConfig();
  const merged = { ...current, ...body };
  writeConfig(merged);
  return NextResponse.json({ saved: true, config: merged });
}
