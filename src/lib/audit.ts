import { Pool } from 'pg';
import crypto from 'crypto';
import { sanitizeMetadata } from './secrets';

export type AuditSeverity = 'info' | 'warn' | 'error';

export type AuditRepo = {
  provider?: string;
  owner: string;
  repo: string;
  default_branch?: string;
};

export type AuditLogInput = {
  actor?: string;
  action: string;
  severity?: AuditSeverity;
  message?: string;
  metadata?: Record<string, unknown>;
  repo?: AuditRepo;
};

export type AuditArtifactInput = {
  repo?: AuditRepo;
  logId?: number;
  kind: string;
  storageUrl?: string;
  checksum?: string;
  sizeBytes?: number;
};

let pool: Pool | null = null;
const inMemoryLogs: Array<AuditLogInput & { id: number; created_at: string }> = [];
const inMemoryArtifacts: Array<AuditArtifactInput & { id: number; created_at: string }> = [];
let memoryId = 1;

function getPool() {
  if (pool) return pool;
  const url = process.env.AUDIT_DB_URL || process.env.PGVECTOR_URL;
  if (!url) return null; // fallback em memória quando DB não configurado
  pool = new Pool({ connectionString: url });
  return pool;
}

async function ensureSchema() {
  const client = getPool();
  if (!client) return; // modo memória
  await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await client.query(`
    CREATE TABLE IF NOT EXISTS audit_repos (
      id SERIAL PRIMARY KEY,
      provider TEXT NOT NULL DEFAULT 'github',
      owner TEXT NOT NULL,
      repo TEXT NOT NULL,
      default_branch TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (provider, owner, repo)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      repo_id INTEGER REFERENCES audit_repos(id) ON DELETE SET NULL,
      actor TEXT,
      action TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'info',
      message TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_artifacts (
      id BIGSERIAL PRIMARY KEY,
      repo_id INTEGER REFERENCES audit_repos(id) ON DELETE SET NULL,
      log_id BIGINT REFERENCES audit_logs(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      storage_url TEXT,
      checksum TEXT,
      size_bytes BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_repo_created_at ON audit_logs (repo_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
    CREATE INDEX IF NOT EXISTS idx_audit_artifacts_repo_created_at ON audit_artifacts (repo_id, created_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_repos_provider_owner_repo ON audit_repos (provider, owner, repo);
  `);
}

async function upsertRepo(repo?: AuditRepo): Promise<number | null> {
  if (!repo) return null;
  const client = getPool();
  if (!client) return null;
  const { provider = 'github', owner, repo: repoName, default_branch } = repo;
  const res = await client.query(
    `INSERT INTO audit_repos (provider, owner, repo, default_branch)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (provider, owner, repo) DO UPDATE SET default_branch = EXCLUDED.default_branch
     RETURNING id`,
    [provider, owner, repoName, default_branch || null]
  );
  return res.rows[0]?.id as number;
}

export async function logEvent(input: AuditLogInput) {
  await ensureSchema();
  const safeMetadata = input.metadata ? sanitizeMetadata(input.metadata) : null;
  let id: number;
  const client = getPool();
  if (client) {
    const repoId = await upsertRepo(input.repo);
    const res = await client.query(
      `INSERT INTO audit_logs (repo_id, actor, action, severity, message, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [repoId || null, input.actor || null, input.action, input.severity || 'info', input.message || null, safeMetadata]
    );
    id = res.rows[0]?.id as number;
  } else {
    id = memoryId++;
  }

  inMemoryLogs.unshift({ ...input, id, created_at: new Date().toISOString(), metadata: safeMetadata || undefined });
  if (inMemoryLogs.length > 200) inMemoryLogs.splice(200);
  return id;
}

export async function logArtifact(input: AuditArtifactInput) {
  await ensureSchema();
  let id: number;
  const client = getPool();
  if (client) {
    const repoId = await upsertRepo(input.repo);
    const res = await client.query(
      `INSERT INTO audit_artifacts (repo_id, log_id, kind, storage_url, checksum, size_bytes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [repoId || null, input.logId || null, input.kind, input.storageUrl || null, input.checksum || null, input.sizeBytes || null]
    );
    id = res.rows[0]?.id as number;
  } else {
    id = memoryId++;
  }

  inMemoryArtifacts.unshift({ ...input, id, created_at: new Date().toISOString() });
  if (inMemoryArtifacts.length > 200) inMemoryArtifacts.splice(200);
  return id;
}

export function getAuditSnapshot(limit = 100) {
  return {
    logs: inMemoryLogs.slice(0, limit),
    artifacts: inMemoryArtifacts.slice(0, limit),
  };
}

export function resetAuditMemory() {
  inMemoryLogs.length = 0;
  inMemoryArtifacts.length = 0;
  memoryId = 1;
}

function signPayload(payload: unknown, key: string) {
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}

export function exportEvidenceBundle(options?: { format?: 'soc2' | 'iso'; scope?: string }) {
  const format = options?.format || 'soc2';
  const scope = options?.scope || 'legacyguard';
  const generatedAt = new Date().toISOString();
  const snapshot = getAuditSnapshot(150);
  const bundle = {
    format,
    scope,
    generatedAt,
    logs: snapshot.logs,
    artifacts: snapshot.artifacts,
  };
  const signingKey = process.env.AUDIT_SIGNING_KEY || 'legacyguard-dev-key';
  const signature = signPayload(bundle, signingKey);
  return { ...bundle, signature, signer: 'legacyguard-hmac-sha256' };
}
