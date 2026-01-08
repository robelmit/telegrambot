"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
exports.getRateLimiter = getRateLimiter;
const logger_1 = __importDefault(require("./logger"));
const DEFAULT_CONFIG = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10 // 10 requests per minute
};
/**
 * Simple in-memory rate limiter (no Redis required)
 */
class RateLimiter {
    config;
    users = new Map();
    cleanupInterval = null;
    constructor(config) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        // Cleanup old entries every minute
        this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    }
    /**
     * Check if request is allowed for a given user
     */
    async checkLimit(userId) {
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
            logger_1.default.warn(`Rate limit exceeded for user ${userId}`);
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
    async resetLimit(userId) {
        this.users.delete(String(userId));
    }
    /**
     * Get current usage for a user
     */
    async getUsage(userId) {
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
    cleanup() {
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
    getConfig() {
        return { ...this.config };
    }
    /**
     * Stop cleanup interval
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
}
exports.RateLimiter = RateLimiter;
// Create default rate limiter instance
let defaultRateLimiter = null;
function getRateLimiter() {
    if (!defaultRateLimiter) {
        defaultRateLimiter = new RateLimiter({
            windowMs: 60 * 1000, // 1 minute
            maxRequests: 10 // 10 requests per minute
        });
    }
    return defaultRateLimiter;
}
exports.default = RateLimiter;
//# sourceMappingURL=rateLimiter.js.map