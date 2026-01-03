import * as fc from 'fast-check';
import { RateLimiter, RateLimitConfig } from '../rateLimiter';

// Mock Redis client
const mockRedisData: Map<string, { scores: Map<string, number> }> = new Map();

jest.mock('../redis', () => ({
  getRedisClient: () => ({
    multi: () => {
      const commands: Array<{ cmd: string; args: any[] }> = [];
      return {
        zremrangebyscore: (key: string, min: number, max: number) => {
          commands.push({ cmd: 'zremrangebyscore', args: [key, min, max] });
          return this;
        },
        zcard: (key: string) => {
          commands.push({ cmd: 'zcard', args: [key] });
          return this;
        },
        zadd: (key: string, score: number, member: string) => {
          commands.push({ cmd: 'zadd', args: [key, score, member] });
          return this;
        },
        expire: (key: string, seconds: number) => {
          commands.push({ cmd: 'expire', args: [key, seconds] });
          return this;
        },
        exec: async () => {
          const results: Array<[null, any]> = [];
          for (const { cmd, args } of commands) {
            const [key] = args;
            if (!mockRedisData.has(key)) {
              mockRedisData.set(key, { scores: new Map() });
            }
            const data = mockRedisData.get(key)!;
            
            switch (cmd) {
              case 'zremrangebyscore':
                const [, min, max] = args;
                for (const [member, score] of data.scores) {
                  if (score >= min && score <= max) {
                    data.scores.delete(member);
                  }
                }
                results.push([null, 0]);
                break;
              case 'zcard':
                results.push([null, data.scores.size]);
                break;
              case 'zadd':
                const [, score, member] = args;
                data.scores.set(member, score);
                results.push([null, 1]);
                break;
              case 'expire':
                results.push([null, 1]);
                break;
            }
          }
          return results;
        }
      };
    },
    zrange: async (key: string) => {
      const data = mockRedisData.get(key);
      if (!data) return [];
      const entries = Array.from(data.scores.entries());
      if (entries.length === 0) return [];
      entries.sort((a, b) => a[1] - b[1]);
      return [entries[0][0], entries[0][1].toString()];
    },
    del: async (key: string) => {
      mockRedisData.delete(key);
      return 1;
    },
    zremrangebyscore: async () => 0,
    zcard: async (key: string) => {
      const data = mockRedisData.get(key);
      return data ? data.scores.size : 0;
    }
  })
}));

describe('Rate Limiter Property Tests', () => {
  beforeEach(() => {
    mockRedisData.clear();
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
            mockRedisData.clear();
            
            const limiter = new RateLimiter({
              windowMs: 60000,
              maxRequests,
              keyPrefix: 'test:'
            });

            // Make requests up to the limit
            for (let i = 0; i < maxRequests; i++) {
              const result = await limiter.checkLimit(userId);
              expect(result.allowed).toBe(true);
              expect(result.remaining).toBe(maxRequests - i - 1);
            }
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
            mockRedisData.clear();
            
            const limiter = new RateLimiter({
              windowMs: 60000,
              maxRequests,
              keyPrefix: 'test:'
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
            mockRedisData.clear();
            
            const limiter = new RateLimiter({
              windowMs: 60000,
              maxRequests,
              keyPrefix: 'test:'
            });

            const actualRequests = Math.min(requestCount, maxRequests);
            
            for (let i = 0; i < actualRequests; i++) {
              const result = await limiter.checkLimit(userId);
              expect(result.remaining).toBe(maxRequests - i - 1);
            }
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
            mockRedisData.clear();
            
            const limiter = new RateLimiter({
              windowMs: 60000,
              maxRequests: 5,
              keyPrefix: 'test:'
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
            const limiter = new RateLimiter({
              windowMs,
              maxRequests,
              keyPrefix: 'test:'
            });

            const config1 = limiter.getConfig();
            const config2 = limiter.getConfig();

            // Should be equal but not same reference
            expect(config1).toEqual(config2);
            expect(config1).not.toBe(config2);

            // Modifying returned config should not affect limiter
            config1.maxRequests = 999;
            expect(limiter.getConfig().maxRequests).toBe(maxRequests);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
