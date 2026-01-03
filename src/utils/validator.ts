import { TOPUP_AMOUNTS, TopupAmount, PaymentProvider, Language } from '../types';

/**
 * Input validation and sanitization utilities
 */

// Regex patterns for validation
const PATTERNS = {
  telegramId: /^\d{1,15}$/,
  transactionId: /^[A-Za-z0-9]{6,30}$/,
  phoneNumber: /^(\+?251|0)?[79]\d{8}$/,
  fileName: /^[a-zA-Z0-9_\-\.]+$/,
  path: /^[a-zA-Z0-9_\-\.\/\\]+$/
};

/**
 * Validate Telegram user ID
 */
export function isValidTelegramId(id: unknown): id is number {
  if (typeof id !== 'number') return false;
  return id > 0 && id < 10000000000000000;
}

/**
 * Validate transaction ID format
 */
export function isValidTransactionId(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  const cleaned = id.trim();
  return cleaned.length >= 6 && cleaned.length <= 30 && PATTERNS.transactionId.test(cleaned);
}

/**
 * Validate top-up amount
 */
export function isValidTopupAmount(amount: unknown): amount is TopupAmount {
  if (typeof amount !== 'number') return false;
  return TOPUP_AMOUNTS.includes(amount as TopupAmount);
}

/**
 * Validate payment provider
 */
export function isValidPaymentProvider(provider: unknown): provider is PaymentProvider {
  return provider === 'telebirr' || provider === 'cbe';
}

/**
 * Validate language code
 */
export function isValidLanguage(lang: unknown): lang is Language {
  return lang === 'en' || lang === 'am' || lang === 'ti';
}

/**
 * Validate phone number (Ethiopian format)
 */
export function isValidPhoneNumber(phone: unknown): phone is string {
  if (typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-]/g, '');
  return PATTERNS.phoneNumber.test(cleaned);
}

/**
 * Validate file name (no path traversal)
 */
export function isValidFileName(name: unknown): name is string {
  if (typeof name !== 'string') return false;
  if (name.includes('..') || name.includes('/') || name.includes('\\')) return false;
  return PATTERNS.fileName.test(name);
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string, maxLength: number = 255): string {
  return input
    .trim()
    .substring(0, maxLength)
    .replace(/[<>]/g, ''); // Remove potential HTML/XML tags
}

/**
 * Sanitize file name
 */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
    .replace(/\.{2,}/g, '.')
    .substring(0, 100);
}

/**
 * Sanitize path (prevent traversal)
 */
export function sanitizePath(inputPath: string, baseDir: string): string | null {
  const path = require('path');
  const resolved = path.resolve(baseDir, inputPath);
  
  // Ensure the resolved path is within the base directory
  if (!resolved.startsWith(path.resolve(baseDir))) {
    return null;
  }
  
  return resolved;
}

/**
 * Validate and sanitize user input object
 */
export function validateUserInput<T extends Record<string, unknown>>(
  input: T,
  schema: Record<keyof T, (value: unknown) => boolean>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const [key, validator] of Object.entries(schema)) {
    if (!validator(input[key as keyof T])) {
      errors.push(`Invalid ${key}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Escape special characters for safe display
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}

/**
 * Validate PDF file buffer
 */
export function isValidPdfBuffer(buffer: Buffer): boolean {
  // Check PDF magic bytes
  const pdfHeader = buffer.slice(0, 5).toString();
  return pdfHeader === '%PDF-';
}

/**
 * Check if string contains only allowed characters
 */
export function containsOnlyAllowed(str: string, allowedPattern: RegExp): boolean {
  return allowedPattern.test(str);
}

export default {
  isValidTelegramId,
  isValidTransactionId,
  isValidTopupAmount,
  isValidPaymentProvider,
  isValidLanguage,
  isValidPhoneNumber,
  isValidFileName,
  sanitizeString,
  sanitizeFileName,
  sanitizePath,
  validateUserInput,
  escapeHtml,
  isValidPdfBuffer,
  containsOnlyAllowed
};
