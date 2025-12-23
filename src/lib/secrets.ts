// Utility to mask sensitive data in logs and metadata
// Use before logging or sending to SSE/audit

const SENSITIVE_PATTERNS = [
  { pattern: /(sk-[a-zA-Z0-9]{20,})/g, replacement: 'sk-***REDACTED***' }, // OpenAI keys
  { pattern: /(ghp_[a-zA-Z0-9]{36,})/g, replacement: 'ghp_***REDACTED***' }, // GitHub PAT
  { pattern: /(github_pat_[a-zA-Z0-9_]{22,})/g, replacement: 'github_pat_***REDACTED***' }, // GitHub fine-grained
  { pattern: /(gho_[a-zA-Z0-9]{36})/g, replacement: 'gho_***REDACTED***' }, // GitHub OAuth
  { pattern: /(xox[baprs]-[a-zA-Z0-9-]+)/g, replacement: 'xox*-***REDACTED***' }, // Slack tokens
  { pattern: /("?password"?\s*[:=]\s*)"[^"]+"/gi, replacement: '$1"***REDACTED***"' },
  { pattern: /("?secret"?\s*[:=]\s*)"[^"]+"/gi, replacement: '$1"***REDACTED***"' },
  { pattern: /("?token"?\s*[:=]\s*)"[^"]+"/gi, replacement: '$1"***REDACTED***"' },
  { pattern: /("?api_key"?\s*[:=]\s*)"[^"]+"/gi, replacement: '$1"***REDACTED***"' },
  { pattern: /("?apiKey"?\s*[:=]\s*)"[^"]+"/gi, replacement: '$1"***REDACTED***"' },
  { pattern: /("?accessToken"?\s*[:=]\s*)"[^"]+"/gi, replacement: '$1"***REDACTED***"' },
  { pattern: /(Bearer\s+)[a-zA-Z0-9._-]+/gi, replacement: '$1***REDACTED***' },
];

export function maskSecrets(input: string): string {
  let result = input;
  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function maskObject<T extends Record<string, unknown>>(obj: T): T {
  const json = JSON.stringify(obj);
  const masked = maskSecrets(json);
  return JSON.parse(masked) as T;
}

// Keys to completely omit from logs
const OMIT_KEYS = new Set([
  'accessToken',
  'access_token',
  'token',
  'password',
  'secret',
  'apiKey',
  'api_key',
  'OPENAI_API_KEY',
  'GITHUB_TOKEN',
]);

export function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (OMIT_KEYS.has(key)) {
      result[key] = '***OMITTED***';
    } else if (typeof value === 'string') {
      result[key] = maskSecrets(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}
