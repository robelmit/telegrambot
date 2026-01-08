export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
}
export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
}
/**
 * Simple in-memory rate limiter (no Redis required)
 */
export declare class RateLimiter {
    private config;
    private users;
    private cleanupInterval;
    constructor(config?: Partial<RateLimitConfig>);
    /**
     * Check if request is allowed for a given user
     */
    checkLimit(userId: string | number): Promise<RateLimitResult>;
    /**
     * Reset rate limit for a user
     */
    resetLimit(userId: string | number): Promise<void>;
    /**
     * Get current usage for a user
     */
    getUsage(userId: string | number): Promise<{
        count: number;
        remaining: number;
    }>;
    /**
     * Cleanup old entries
     */
    private cleanup;
    /**
     * Get config
     */
    getConfig(): RateLimitConfig;
    /**
     * Stop cleanup interval
     */
    destroy(): void;
}
export declare function getRateLimiter(): RateLimiter;
export default RateLimiter;
//# sourceMappingURL=rateLimiter.d.ts.map