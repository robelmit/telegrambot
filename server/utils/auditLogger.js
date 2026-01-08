"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogger = void 0;
exports.getAuditLogger = getAuditLogger;
const logger_1 = __importDefault(require("./logger"));
const crypto_1 = __importDefault(require("crypto"));
/**
 * Audit logger for security-sensitive operations
 * Logs without exposing sensitive data
 */
class AuditLogger {
    encryptionKey;
    constructor() {
        this.encryptionKey = process.env.AUDIT_ENCRYPTION_KEY || 'default-key-change-in-production';
    }
    /**
     * Log an audit event
     */
    log(entry) {
        const sanitizedEntry = this.sanitizeEntry(entry);
        logger_1.default.info('AUDIT', {
            ...sanitizedEntry,
            timestamp: entry.timestamp.toISOString()
        });
    }
    /**
     * Log a payment-related event
     */
    logPayment(action, userId, details) {
        this.log({
            timestamp: new Date(),
            action: `payment.${action}`,
            userId,
            details: {
                amount: details.amount,
                provider: details.provider,
                transactionIdHash: details.transactionId ? this.hashSensitive(details.transactionId) : undefined,
                error: details.error
            },
            success: details.success
        });
    }
    /**
     * Log a job-related event
     */
    logJob(action, jobId, userId, details) {
        this.log({
            timestamp: new Date(),
            action: `job.${action}`,
            userId,
            details: {
                jobId,
                ...details
            },
            success: action !== 'failed'
        });
    }
    /**
     * Log an authentication event
     */
    logAuth(action, telegramId, success, details) {
        this.log({
            timestamp: new Date(),
            action: `auth.${action}`,
            telegramId,
            details: details || {},
            success
        });
    }
    /**
     * Log a file operation
     */
    logFileOperation(action, userId, details) {
        this.log({
            timestamp: new Date(),
            action: `file.${action}`,
            userId,
            details: {
                fileType: details.fileType,
                fileSize: details.fileSize,
                error: details.error
            },
            success: details.success
        });
    }
    /**
     * Log rate limit event
     */
    logRateLimit(userId, action, allowed) {
        this.log({
            timestamp: new Date(),
            action: 'security.rate_limit',
            userId,
            details: {
                attemptedAction: action,
                allowed
            },
            success: allowed
        });
    }
    /**
     * Log security event
     */
    logSecurity(event, userId, details) {
        this.log({
            timestamp: new Date(),
            action: `security.${event}`,
            userId,
            details: this.sanitizeSecurityDetails(details),
            success: false
        });
    }
    /**
     * Sanitize entry to remove sensitive data
     */
    sanitizeEntry(entry) {
        const sanitized = { ...entry };
        // Remove or hash sensitive fields
        if (sanitized.details) {
            sanitized.details = this.sanitizeDetails(sanitized.details);
        }
        return sanitized;
    }
    /**
     * Sanitize details object
     */
    sanitizeDetails(details) {
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'phone', 'email'];
        const sanitized = {};
        for (const [key, value] of Object.entries(details)) {
            if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
                sanitized[key] = '[REDACTED]';
            }
            else if (typeof value === 'string' && value.length > 100) {
                sanitized[key] = value.substring(0, 100) + '...';
            }
            else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    /**
     * Sanitize security-related details
     */
    sanitizeSecurityDetails(details) {
        const sanitized = {};
        for (const [key, value] of Object.entries(details)) {
            if (typeof value === 'string') {
                // Truncate long strings that might contain attack payloads
                sanitized[key] = value.substring(0, 50);
            }
            else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    /**
     * Hash sensitive data for logging
     */
    hashSensitive(data) {
        return crypto_1.default
            .createHash('sha256')
            .update(data + this.encryptionKey)
            .digest('hex')
            .substring(0, 16);
    }
    /**
     * Encrypt sensitive data (for storage if needed)
     */
    encrypt(data) {
        const iv = crypto_1.default.randomBytes(16);
        const key = crypto_1.default.scryptSync(this.encryptionKey, 'salt', 32);
        const cipher = crypto_1.default.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }
    /**
     * Decrypt sensitive data
     */
    decrypt(encryptedData) {
        const [ivHex, encrypted] = encryptedData.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const key = crypto_1.default.scryptSync(this.encryptionKey, 'salt', 32);
        const decipher = crypto_1.default.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
exports.AuditLogger = AuditLogger;
// Singleton instance
let auditLoggerInstance = null;
function getAuditLogger() {
    if (!auditLoggerInstance) {
        auditLoggerInstance = new AuditLogger();
    }
    return auditLoggerInstance;
}
exports.default = AuditLogger;
//# sourceMappingURL=auditLogger.js.map