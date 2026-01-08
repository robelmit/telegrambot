import { TopupAmount, PaymentProvider, Language } from '../types';
/**
 * Validate Telegram user ID
 */
export declare function isValidTelegramId(id: unknown): id is number;
/**
 * Validate transaction ID format
 */
export declare function isValidTransactionId(id: unknown): id is string;
/**
 * Validate top-up amount
 */
export declare function isValidTopupAmount(amount: unknown): amount is TopupAmount;
/**
 * Validate payment provider
 */
export declare function isValidPaymentProvider(provider: unknown): provider is PaymentProvider;
/**
 * Validate language code
 */
export declare function isValidLanguage(lang: unknown): lang is Language;
/**
 * Validate phone number (Ethiopian format)
 */
export declare function isValidPhoneNumber(phone: unknown): phone is string;
/**
 * Validate file name (no path traversal)
 */
export declare function isValidFileName(name: unknown): name is string;
/**
 * Sanitize string input
 */
export declare function sanitizeString(input: string, maxLength?: number): string;
/**
 * Sanitize file name
 */
export declare function sanitizeFileName(name: string): string;
/**
 * Sanitize path (prevent traversal)
 */
export declare function sanitizePath(inputPath: string, baseDir: string): string | null;
/**
 * Validate and sanitize user input object
 */
export declare function validateUserInput<T extends Record<string, unknown>>(input: T, schema: Record<keyof T, (value: unknown) => boolean>): {
    valid: boolean;
    errors: string[];
};
/**
 * Escape special characters for safe display
 */
export declare function escapeHtml(text: string): string;
/**
 * Validate PDF file buffer
 */
export declare function isValidPdfBuffer(buffer: Buffer): boolean;
/**
 * Check if string contains only allowed characters
 */
export declare function containsOnlyAllowed(str: string, allowedPattern: RegExp): boolean;
declare const _default: {
    isValidTelegramId: typeof isValidTelegramId;
    isValidTransactionId: typeof isValidTransactionId;
    isValidTopupAmount: typeof isValidTopupAmount;
    isValidPaymentProvider: typeof isValidPaymentProvider;
    isValidLanguage: typeof isValidLanguage;
    isValidPhoneNumber: typeof isValidPhoneNumber;
    isValidFileName: typeof isValidFileName;
    sanitizeString: typeof sanitizeString;
    sanitizeFileName: typeof sanitizeFileName;
    sanitizePath: typeof sanitizePath;
    validateUserInput: typeof validateUserInput;
    escapeHtml: typeof escapeHtml;
    isValidPdfBuffer: typeof isValidPdfBuffer;
    containsOnlyAllowed: typeof containsOnlyAllowed;
};
export default _default;
//# sourceMappingURL=validator.d.ts.map