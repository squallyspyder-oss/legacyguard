-- Auditoria persistente para LegacyGuard
-- Requer Postgres

CREATE TABLE IF NOT EXISTS audit_repos (
  id SERIAL PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'github',
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  default_branch TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  repo_id INTEGER REFERENCES audit_repos(id) ON DELETE SET NULL,
  actor TEXT, -- usuário ou integração
  action TEXT NOT NULL, -- ex: plan_created, scan_run, patch_applied, pr_created, merge_requested
  severity TEXT NOT NULL DEFAULT 'info', -- info/warn/error
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_artifacts (
  id BIGSERIAL PRIMARY KEY,
  repo_id INTEGER REFERENCES audit_repos(id) ON DELETE SET NULL,
  log_id BIGINT REFERENCES audit_logs(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- patch, test, report
  storage_url TEXT, -- onde o artefato está armazenado (S3/MinIO)
  checksum TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_repo_created_at ON audit_logs (repo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_artifacts_repo_created_at ON audit_artifacts (repo_id, created_at DESC);
