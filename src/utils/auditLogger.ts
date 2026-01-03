import logger from './logger';
import crypto from 'crypto';

export interface AuditLogEntry {
  timestamp: Date;
  action: string;
  userId?: string | number;
  telegramId?: number;
  details: Record<string, unknown>;
  ip?: string;
  success: boolean;
  errorCode?: string;
}

/**
 * Audit logger for security-sensitive operations
 * Logs without exposing sensitive data
 */
export class AuditLogger {
  private encryptionKey: string;

  constructor() {
    this.encryptionKey = process.env.AUDIT_ENCRYPTION_KEY || 'default-key-change-in-production';
  }

  /**
   * Log an audit event
   */
  log(entry: AuditLogEntry): void {
    const sanitizedEntry = this.sanitizeEntry(entry);
    
    logger.info('AUDIT', {
      ...sanitizedEntry,
      timestamp: entry.timestamp.toISOString()
    });
  }

  /**
   * Log a payment-related event
   */
  logPayment(
    action: 'topup_initiated' | 'topup_verified' | 'topup_failed' | 'debit' | 'refund',
    userId: string | number,
    details: {
      amount?: number;
      provider?: string;
      transactionId?: string;
      success: boolean;
      error?: string;
    }
  ): void {
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
  logJob(
    action: 'created' | 'started' | 'completed' | 'failed' | 'retried',
    jobId: string,
    userId: string | number,
    details?: Record<string, unknown>
  ): void {
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
  logAuth(
    action: 'login' | 'logout' | 'session_created',
    telegramId: number,
    success: boolean,
    details?: Record<string, unknown>
  ): void {
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
  logFileOperation(
    action: 'upload' | 'download' | 'delete' | 'generate',
    userId: string | number,
    details: {
      fileType?: string;
      fileSize?: number;
      success: boolean;
      error?: string;
    }
  ): void {
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
  logRateLimit(
    userId: string | number,
    action: string,
    allowed: boolean
  ): void {
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
  logSecurity(
    event: 'invalid_input' | 'path_traversal_attempt' | 'suspicious_activity',
    userId: string | number | undefined,
    details: Record<string, unknown>
  ): void {
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
  private sanitizeEntry(entry: AuditLogEntry): AuditLogEntry {
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
  private sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'phone', 'email'];
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(details)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 100) {
        sanitized[key] = value.substring(0, 100) + '...';
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Sanitize security-related details
   */
  private sanitizeSecurityDetails(details: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(details)) {
      if (typeof value === 'string') {
        // Truncate long strings that might contain attack payloads
        sanitized[key] = value.substring(0, 50);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Hash sensitive data for logging
   */
  private hashSensitive(data: string): string {
    return crypto
      .createHash('sha256')
      .update(data + this.encryptionKey)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Encrypt sensitive data (for storage if needed)
   */
  encrypt(data: string): string {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string): string {
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// Singleton instance
let auditLoggerInstance: AuditLogger | null = null;

export function getAuditLogger(): AuditLogger {
  if (!auditLoggerInstance) {
    auditLoggerInstance = new AuditLogger();
  }
  return auditLoggerInstance;
}

export default AuditLogger;
