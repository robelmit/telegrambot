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
export declare class AuditLogger {
    private encryptionKey;
    constructor();
    /**
     * Log an audit event
     */
    log(entry: AuditLogEntry): void;
    /**
     * Log a payment-related event
     */
    logPayment(action: 'topup_initiated' | 'topup_verified' | 'topup_failed' | 'debit' | 'refund', userId: string | number, details: {
        amount?: number;
        provider?: string;
        transactionId?: string;
        success: boolean;
        error?: string;
    }): void;
    /**
     * Log a job-related event
     */
    logJob(action: 'created' | 'started' | 'completed' | 'failed' | 'retried', jobId: string, userId: string | number, details?: Record<string, unknown>): void;
    /**
     * Log an authentication event
     */
    logAuth(action: 'login' | 'logout' | 'session_created', telegramId: number, success: boolean, details?: Record<string, unknown>): void;
    /**
     * Log a file operation
     */
    logFileOperation(action: 'upload' | 'download' | 'delete' | 'generate', userId: string | number, details: {
        fileType?: string;
        fileSize?: number;
        success: boolean;
        error?: string;
    }): void;
    /**
     * Log rate limit event
     */
    logRateLimit(userId: string | number, action: string, allowed: boolean): void;
    /**
     * Log security event
     */
    logSecurity(event: 'invalid_input' | 'path_traversal_attempt' | 'suspicious_activity', userId: string | number | undefined, details: Record<string, unknown>): void;
    /**
     * Sanitize entry to remove sensitive data
     */
    private sanitizeEntry;
    /**
     * Sanitize details object
     */
    private sanitizeDetails;
    /**
     * Sanitize security-related details
     */
    private sanitizeSecurityDetails;
    /**
     * Hash sensitive data for logging
     */
    private hashSensitive;
    /**
     * Encrypt sensitive data (for storage if needed)
     */
    encrypt(data: string): string;
    /**
     * Decrypt sensitive data
     */
    decrypt(encryptedData: string): string;
}
export declare function getAuditLogger(): AuditLogger;
export default AuditLogger;
//# sourceMappingURL=auditLogger.d.ts.map