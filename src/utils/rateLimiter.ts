import { getRedisClient } from './redis';
import logger from './logger';

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  keyPrefix: string;     // Redis key prefix
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000,  // 1 minute
  maxRequests: 10,       // 10 requests per minute
  keyPrefix: 'ratelimit:'
};

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if request is allowed for a given user
   */
  async checkLimit(userId: string | number): Promise<RateLimitResult> {
    const redis = getRedisClient();
    const key = `${this.config.keyPrefix}${userId}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      // Use Redis sorted set for sliding window
      const multi = redis.multi();
      
      // Remove old entries outside the window
      multi.zremrangebyscore(key, 0, windowStart);
      
      // Count current requests in window
      multi.zcard(key);
      
      // Add current request
      multi.zadd(key, now, `${now}-${Math.random()}`);
      
      // Set expiry on the key
      multi.expire(key, Math.ceil(this.config.windowMs / 1000));
      
      const results = await multi.exec();
      
      if (!results) {
        // Redis transaction failed, allow request
        return {
          allowed: true,
          remaining: this.config.maxRequests - 1,
          resetTime: now + this.config.windowMs
        };
      }

      const currentCount = (results[1][1] as number) || 0;
      const remaining = Math.max(0, this.config.maxRequests - currentCount - 1);
      const resetTime = now + this.config.windowMs;

      if (currentCount >= this.config.maxRequests) {
        // Rate limit exceeded
        const oldestEntry = await redis.zrange(key, 0, 0, 'WITHSCORES');
        const retryAfter = oldestEntry.length >= 2 
          ? Math.ceil((parseInt(oldestEntry[1]) + this.config.windowMs - now) / 1000)
          : Math.ceil(this.config.windowMs / 1000);

        logger.warn(`Rate limit exceeded for user ${userId}`);
        
        return {
          allowed: false,
          remaining: 0,
          resetTime,
          retryAfter
        };
      }

      return {
        allowed: true,
        remaining,
        resetTime
      };
    } catch (error) {
      logger.error('Rate limiter error:', error);
      // On error, allow the request
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs
      };
    }
  }

  /**
   * Reset rate limit for a user
   */
  async resetLimit(userId: string | number): Promise<void> {
    const redis = getRedisClient();
    const key = `${this.config.keyPrefix}${userId}`;
    await redis.del(key);
  }

  /**
   * Get current usage for a user
   */
  async getUsage(userId: string | number): Promise<{ count: number; remaining: number }> {
    const redis = getRedisClient();
    const key = `${this.config.keyPrefix}${userId}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      // Remove old entries and count
      await redis.zremrangebyscore(key, 0, windowStart);
      const count = await redis.zcard(key);
      
      return {
        count,
        remaining: Math.max(0, this.config.maxRequests - count)
      };
    } catch (error) {
      logger.error('Get usage error:', error);
      return { count: 0, remaining: this.config.maxRequests };
    }
  }

  /**
   * Get config
   */
  getConfig(): RateLimitConfig {
    return { ...this.config };
  }
}

// Create default rate limiter instance
let defaultRateLimiter: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!defaultRateLimiter) {
    defaultRateLimiter = new RateLimiter({
      windowMs: 60 * 1000,  // 1 minute
      maxRequests: 10,       // 10 requests per minute
      keyPrefix: 'ratelimit:user:'
    });
  }
  return defaultRateLimiter;
}

export default RateLimiter;
