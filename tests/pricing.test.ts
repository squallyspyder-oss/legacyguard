import { describe, it, expect } from 'vitest';
import { estimateCostUSD, PLAN_LIMITS, InMemoryUsageTracker } from '../src/lib/pricing';

describe('pricing', () => {
  describe('estimateCostUSD', () => {
    it('calculates cost for gpt-4o-mini', () => {
      const result = estimateCostUSD({
        model: 'gpt-4o-mini',
        promptTokens: 1000,
        completionTokens: 500,
      });
      expect(result.usd).toBeGreaterThan(0);
      expect(result.per1kPrompt).toBe(0.00015);
      expect(result.per1kCompletion).toBe(0.0006);
    });

    it('returns zero for unknown model', () => {
      const result = estimateCostUSD({
        model: 'unknown-model',
        promptTokens: 1000,
        completionTokens: 500,
      });
      expect(result.usd).toBe(0);
    });
  });

  describe('PLAN_LIMITS', () => {
    it('has correct free tier limits', () => {
      expect(PLAN_LIMITS.free.monthlyTokens).toBe(200_000);
      expect(PLAN_LIMITS.free.hardCap).toBe(true);
    });

    it('has correct pro tier limits', () => {
      expect(PLAN_LIMITS.pro.monthlyTokens).toBe(5_000_000);
      expect(PLAN_LIMITS.pro.hardCap).toBe(false);
    });
  });

  describe('InMemoryUsageTracker', () => {
    it('tracks usage correctly', () => {
      const tracker = new InMemoryUsageTracker();
      const record = tracker.record('user1', '2025-01', 1000, 0.05);
      expect(record.tokensUsed).toBe(1000);
      expect(record.usdEstimated).toBe(0.05);

      const record2 = tracker.record('user1', '2025-01', 500, 0.02);
      expect(record2.tokensUsed).toBe(1500);
      expect(record2.usdEstimated).toBe(0.07);
    });

    it('detects over limit', () => {
      const tracker = new InMemoryUsageTracker();
      expect(tracker.isOverLimit('free', 100_000)).toBe(false);
      expect(tracker.isOverLimit('free', 200_000)).toBe(true);
    });
  });
});
