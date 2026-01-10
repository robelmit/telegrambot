import * as fc from 'fast-check';
import { RateLimiter, RateLimitConfig } from '../rateLimiter';

describe('Rate Limiter Property Tests', () => {
  let limiter: RateLimiter;

  afterEach(() => {
    if (limiter) {
      limiter.destroy();
    }
  });

  /**
   * Property 18: Rate Limiting
   * Users should be rate limited after exceeding the configured limit.
   */
  describe('Property 18: Rate Limiting', () => {
    it('should allow requests up to the limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100000 }),
          fc.integer({ min: 1, max: 20 }),
          async (userId, maxRequests) => {
            limiter = new RateLimiter({
              windowMs: 60000,
              maxRequests
            });

            // Make requests up to the limit
            for (let i = 0; i < maxRequests; i++) {
              const result = await limiter.checkLimit(userId);
              expect(result.allowed).toBe(true);
              expect(result.remaining).toBe(maxRequests - i - 1);
            }

            limiter.destroy();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should block requests after exceeding limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100000 }),
          fc.integer({ min: 1, max: 10 }),
          async (userId, maxRequests) => {
            limiter = new RateLimiter({
              windowMs: 60000,
              maxRequests
            });

            // Exhaust the limit
            for (let i = 0; i < maxRequests; i++) {
              await limiter.checkLimit(userId);
            }

            // Next request should be blocked
            const result = await limiter.checkLimit(userId);
            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(0);
            expect(result.retryAfter).toBeDefined();

            limiter.destroy();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should track remaining requests correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100000 }),
          fc.integer({ min: 5, max: 15 }),
          fc.integer({ min: 1, max: 5 }),
          async (userId, maxRequests, requestCount) => {
            limiter = new RateLimiter({
              windowMs: 60000,
              maxRequests
            });

            const actualRequests = Math.min(requestCount, maxRequests);
            
            for (let i = 0; i < actualRequests; i++) {
              const result = await limiter.checkLimit(userId);
              expect(result.remaining).toBe(maxRequests - i - 1);
            }

            limiter.destroy();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reset limit correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100000 }),
          async (userId) => {
            limiter = new RateLimiter({
              windowMs: 60000,
              maxRequests: 5
            });

            // Make some requests
            await limiter.checkLimit(userId);
            await limiter.checkLimit(userId);

            // Reset
            await limiter.resetLimit(userId);

            // Should have full limit again
            const result = await limiter.checkLimit(userId);
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(4); // 5 - 1

            limiter.destroy();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: Config should be immutable
   */
  describe('Config Immutability', () => {
    it('should return config copy', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 120000 }),
          fc.integer({ min: 1, max: 100 }),
          (windowMs, maxRequests) => {
            limiter = new RateLimiter({
              windowMs,
              maxRequests
            });

            const config1 = limiter.getConfig();
            const config2 = limiter.getConfig();

            // Should be equal but not same reference
            expect(config1).toEqual(config2);
            expect(config1).not.toBe(config2);

            // Modifying returned config should not affect limiter
            config1.maxRequests = 999;
            expect(limiter.getConfig().maxRequests).toBe(maxRequests);

            limiter.destroy();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
