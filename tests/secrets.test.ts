import { describe, it, expect } from 'vitest';
import { maskSecrets, sanitizeMetadata } from '../src/lib/secrets';

describe('secrets masking', () => {
  describe('maskSecrets', () => {
    it('masks OpenAI API keys', () => {
      const input = 'key is sk-1234567890abcdefghijklmnop';
      const result = maskSecrets(input);
      expect(result).toContain('sk-***REDACTED***');
      expect(result).not.toContain('1234567890');
    });

    it('masks GitHub PAT', () => {
      const input = 'token: ghp_1234567890abcdefghijklmnopqrstuvwxyz';
      const result = maskSecrets(input);
      expect(result).toContain('ghp_***REDACTED***');
    });

    it('masks Bearer tokens', () => {
      const input = 'Authorization: Bearer abc123xyz';
      const result = maskSecrets(input);
      expect(result).toContain('Bearer ***REDACTED***');
    });

    it('masks password in JSON', () => {
      const input = '{"password": "mysecret123"}';
      const result = maskSecrets(input);
      expect(result).toContain('"***REDACTED***"');
      expect(result).not.toContain('mysecret123');
    });
  });

  describe('sanitizeMetadata', () => {
    it('omits sensitive keys', () => {
      const input = {
        action: 'test',
        accessToken: 'secret-token',
        user: 'john',
      };
      const result = sanitizeMetadata(input);
      expect(result.accessToken).toBe('***OMITTED***');
      expect(result.action).toBe('test');
      expect(result.user).toBe('john');
    });

    it('masks secrets in string values', () => {
      const input = {
        log: 'Used token sk-abcdefghij1234567890',
      };
      const result = sanitizeMetadata(input);
      expect(result.log).toContain('sk-***REDACTED***');
    });

    it('handles nested objects', () => {
      const input = {
        data: {
          token: 'should-be-omitted',
          name: 'test',
        },
      };
      const result = sanitizeMetadata(input);
      expect((result.data as Record<string, unknown>).token).toBe('***OMITTED***');
      expect((result.data as Record<string, unknown>).name).toBe('test');
    });
  });
});
