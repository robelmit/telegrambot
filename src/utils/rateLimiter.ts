import logger from './logger';

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

interface UserRateData {
  requests: number[];  // Timestamps of requests
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000,  // 1 minute
  maxRequests: 10       // 10 requests per minute
};

/**
 * Simple in-memory rate limiter (no Redis required)
 */
export class RateLimiter {
  private config: RateLimitConfig;
  private users: Map<string, UserRateData> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Cleanup old entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if request is allowed for a given user
   */
  async checkLimit(userId: string | number): Promise<RateLimitResult> {
    const key = String(userId);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get or create user data
    let userData = this.users.get(key);
    if (!userData) {
      userData = { requests: [] };
      this.users.set(key, userData);
    }

    // Remove old requests outside the window
    userData.requests = userData.requests.filter(ts => ts > windowStart);

    const currentCount = userData.requests.length;
    const resetTime = now + this.config.windowMs;

    if (currentCount >= this.config.maxRequests) {
      // Rate limit exceeded
      const oldestRequest = userData.requests[0] || now;
      const retryAfter = Math.ceil((oldestRequest + this.config.windowMs - now) / 1000);

      logger.warn(`Rate limit exceeded for user ${userId}`);

      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter: Math.max(1, retryAfter)
      };
    }

    // Add current request
    userData.requests.push(now);

    return {
      allowed: true,
      remaining: this.config.maxRequests - currentCount - 1,
      resetTime
    };
  }

  /**
   * Reset rate limit for a user
   */
  async resetLimit(userId: string | number): Promise<void> {
    this.users.delete(String(userId));
  }

  /**
   * Get current usage for a user
   */
  async getUsage(userId: string | number): Promise<{ count: number; remaining: number }> {
    const key = String(userId);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    const userData = this.users.get(key);
    if (!userData) {
      return { count: 0, remaining: this.config.maxRequests };
    }

    // Count requests in current window
    const count = userData.requests.filter(ts => ts > windowStart).length;

    return {
      count,
      remaining: Math.max(0, this.config.maxRequests - count)
    };
  }

  /**
   * Cleanup old entries
   */
  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    for (const [key, userData] of this.users) {
      userData.requests = userData.requests.filter(ts => ts > windowStart);
      if (userData.requests.length === 0) {
        this.users.delete(key);
      }
    }
  }

  /**
   * Get config
   */
  getConfig(): RateLimitConfig {
    return { ...this.config };
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Create default rate limiter instance
let defaultRateLimiter: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!defaultRateLimiter) {
    defaultRateLimiter = new RateLimiter({
      windowMs: 60 * 1000,  // 1 minute
      maxRequests: 10       // 10 requests per minute
    });
  }
  return defaultRateLimiter;
}

export default RateLimiter;
