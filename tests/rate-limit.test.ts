import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkRateLimit,
  RATE_LIMIT_PRESETS,
} from '../src/lib/rate-limit';

describe('rate-limit', () => {
  // Mock request helper
  function mockRequest(ip: string = '127.0.0.1'): Request {
    return {
      headers: new Headers({
        'x-forwarded-for': ip,
      }),
    } as unknown as Request;
  }

  describe('checkRateLimit', () => {
    it('allows requests under limit', async () => {
      const req = mockRequest('test-ip-1');
      const result = await checkRateLimit(req, { ...RATE_LIMIT_PRESETS.relaxed, keyPrefix: 'test1' });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('blocks requests over limit', async () => {
      const config = { windowMs: 60000, maxRequests: 2, keyPrefix: 'test2' };
      const req = mockRequest('test-ip-2');

      // First two should pass
      const r1 = await checkRateLimit(req, config);
      const r2 = await checkRateLimit(req, config);
      expect(r1.allowed).toBe(true);
      expect(r2.allowed).toBe(true);

      // Third should be blocked
      const r3 = await checkRateLimit(req, config);
      expect(r3.allowed).toBe(false);
      expect(r3.remaining).toBe(0);
    });

    it('tracks different IPs separately', async () => {
      const config = { windowMs: 60000, maxRequests: 1, keyPrefix: 'test3' };

      const r1 = await checkRateLimit(mockRequest('ip-a'), config);
      const r2 = await checkRateLimit(mockRequest('ip-b'), config);

      expect(r1.allowed).toBe(true);
      expect(r2.allowed).toBe(true);
    });
  });

  describe('RATE_LIMIT_PRESETS', () => {
    it('has expected presets', () => {
      expect(RATE_LIMIT_PRESETS.strict.maxRequests).toBeLessThan(RATE_LIMIT_PRESETS.standard.maxRequests);
      expect(RATE_LIMIT_PRESETS.standard.maxRequests).toBeLessThan(RATE_LIMIT_PRESETS.relaxed.maxRequests);
    });
  });
});
