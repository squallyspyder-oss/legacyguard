// Zod schemas for API request validation
import { z } from 'zod';

// ============ Common schemas ============

// Helper for record with unknown values (Zod v4 syntax)
const unknownRecord = z.record(z.string(), z.unknown());

export const repoInfoSchema = z.object({
  provider: z.enum(['github', 'gitlab', 'bitbucket']).default('github'),
  owner: z.string().min(1),
  repo: z.string().min(1),
  branch: z.string().optional(),
});

export const sandboxConfigSchema = z.object({
  enabled: z.boolean().optional(),
  repoPath: z.string().optional(),
  command: z.string().optional(),
  runnerPath: z.string().optional(),
  timeoutMs: z.number().positive().max(1800000).optional(), // max 30min
  failMode: z.enum(['fail', 'warn']).optional(),
  languageHint: z.string().optional(),
});

export const executionPolicySchema = z.object({
  allowedAgents: z.array(z.enum(['advisor', 'operator', 'executor', 'reviewer', 'advisor-impact'])).optional(),
  requireApprovalFor: z.array(z.enum(['executor', 'operator'])).optional(),
  forbiddenKeywords: z.array(z.string()).optional(),
});

// ============ /api/agents schemas ============

export const agentsOrchestrateSchema = z.object({
  role: z.literal('orchestrate'),
  request: z.string().min(1, 'Campo "request" obrigatório').max(10000),
  context: unknownRecord.optional(),
  sandbox: sandboxConfigSchema.optional(),
  safeMode: z.boolean().optional(),
  executionPolicy: executionPolicySchema.optional(),
  guardrails: unknownRecord.optional(),
});

export const agentsApproveSchema = z.object({
  role: z.literal('approve'),
  orchestrationId: z.string().min(1, 'Campo "orchestrationId" obrigatório'),
});

export const agentsDirectSchema = z.object({
  role: z.enum(['advisor', 'operator', 'executor', 'reviewer', 'advisor-impact', 'planner']),
  payload: unknownRecord.optional(),
});

export const agentsRequestSchema = z.discriminatedUnion('role', [
  agentsOrchestrateSchema,
  agentsApproveSchema,
  // For direct agent calls, we use a more flexible schema
]).or(agentsDirectSchema);

// ============ /api/chat schemas ============

export const chatRequestSchema = z.object({
  message: z.string().min(1).max(10000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
  deepSearch: z.boolean().optional(),
  context: unknownRecord.optional(),
});

// ============ /api/index schemas ============

export const indexRequestSchema = z.object({
  repoPath: z.string().optional(),
  githubUrl: z.string().url().optional(),
  includePatterns: z.array(z.string()).optional(),
  excludePatterns: z.array(z.string()).optional(),
});

// ============ /api/incidents schemas ============

export const incidentIngestSchema = z.object({
  source: z.enum(['sentry', 'datadog', 'otel', 'manual']),
  incidentId: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  metadata: unknownRecord.optional(),
  repoPath: z.string().optional(),
});

// ============ /api/playbooks schemas ============

export const playbookSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  steps: z.array(z.object({
    id: z.string(),
    action: z.string(),
    params: unknownRecord.optional(),
    condition: z.string().optional(),
    onFailure: z.enum(['abort', 'continue', 'retry']).optional(),
  })).min(1),
  triggers: z.array(z.object({
    type: z.enum(['incident', 'schedule', 'webhook', 'manual']),
    config: unknownRecord.optional(),
  })).optional(),
});

// ============ /api/config schemas ============

export const configUpdateSchema = z.object({
  sandboxEnabled: z.boolean().optional(),
  sandboxMode: z.enum(['fail', 'warn']).optional(),
  safeMode: z.boolean().optional(),
  reviewGate: z.boolean().optional(),
  workerEnabled: z.boolean().optional(),
  maskingEnabled: z.boolean().optional(),
  tokenCap: z.number().positive().optional(),
  temperatureCap: z.number().min(0).max(2).optional(),
});

// ============ Validation helper ============

// Zod v4 uses issues instead of errors
type ZodIssue = { path: (string | number)[]; message: string };

export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string; details?: ZodIssue[] };

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const issues = result.error.issues as ZodIssue[];
  return {
    success: false,
    error: issues.map((e: ZodIssue) => `${e.path.join('.')}: ${e.message}`).join('; '),
    details: issues,
  };
}

// NextResponse helper for validation errors
import { NextResponse } from 'next/server';

export function validationErrorResponse(error: string, details?: ZodIssue[]): NextResponse {
  return NextResponse.json(
    {
      error: 'Validation Error',
      message: error,
      details,
    },
    { status: 400 }
  );
}
