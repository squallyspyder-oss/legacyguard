import { describe, it, expect } from 'vitest';
import {
  validateRequest,
  agentsRequestSchema,
  chatRequestSchema,
  configUpdateSchema,
} from '../src/lib/schemas';

describe('schemas', () => {
  describe('agentsRequestSchema', () => {
    it('validates orchestrate request', () => {
      const result = validateRequest(agentsRequestSchema, {
        role: 'orchestrate',
        request: 'Analyze this codebase',
      });
      expect(result.success).toBe(true);
    });

    it('validates approve request', () => {
      const result = validateRequest(agentsRequestSchema, {
        role: 'approve',
        orchestrationId: 'orch-123',
      });
      expect(result.success).toBe(true);
    });

    it('validates direct agent request', () => {
      const result = validateRequest(agentsRequestSchema, {
        role: 'advisor',
        payload: { code: 'console.log("test")' },
      });
      expect(result.success).toBe(true);
    });

    it('rejects orchestrate without request', () => {
      const result = validateRequest(agentsRequestSchema, {
        role: 'orchestrate',
      });
      expect(result.success).toBe(false);
    });

    it('rejects approve without orchestrationId', () => {
      const result = validateRequest(agentsRequestSchema, {
        role: 'approve',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('chatRequestSchema', () => {
    it('validates basic chat request', () => {
      const result = validateRequest(chatRequestSchema, {
        message: 'Hello',
      });
      expect(result.success).toBe(true);
    });

    it('validates chat with options', () => {
      const result = validateRequest(chatRequestSchema, {
        message: 'Analyze this code',
        deepSearch: true,
        history: [
          { role: 'user', content: 'Hi' },
          { role: 'assistant', content: 'Hello!' },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty message', () => {
      const result = validateRequest(chatRequestSchema, {
        message: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects message over max length', () => {
      const result = validateRequest(chatRequestSchema, {
        message: 'a'.repeat(10001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('configUpdateSchema', () => {
    it('validates partial config update', () => {
      const result = validateRequest(configUpdateSchema, {
        sandboxEnabled: true,
        safeMode: true,
      });
      expect(result.success).toBe(true);
    });

    it('validates temperature cap within range', () => {
      const result = validateRequest(configUpdateSchema, {
        temperatureCap: 0.7,
      });
      expect(result.success).toBe(true);
    });

    it('rejects temperature cap out of range', () => {
      const result = validateRequest(configUpdateSchema, {
        temperatureCap: 2.5,
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid sandbox mode', () => {
      const result = validateRequest(configUpdateSchema, {
        sandboxMode: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });
});
