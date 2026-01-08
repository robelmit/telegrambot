"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidTelegramId = isValidTelegramId;
exports.isValidTransactionId = isValidTransactionId;
exports.isValidTopupAmount = isValidTopupAmount;
exports.isValidPaymentProvider = isValidPaymentProvider;
exports.isValidLanguage = isValidLanguage;
exports.isValidPhoneNumber = isValidPhoneNumber;
exports.isValidFileName = isValidFileName;
exports.sanitizeString = sanitizeString;
exports.sanitizeFileName = sanitizeFileName;
exports.sanitizePath = sanitizePath;
exports.validateUserInput = validateUserInput;
exports.escapeHtml = escapeHtml;
exports.isValidPdfBuffer = isValidPdfBuffer;
exports.containsOnlyAllowed = containsOnlyAllowed;
const types_1 = require("../types");
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
function isValidTelegramId(id) {
    if (typeof id !== 'number')
        return false;
    return id > 0 && id < 10000000000000000;
}
/**
 * Validate transaction ID format
 */
function isValidTransactionId(id) {
    if (typeof id !== 'string')
        return false;
    const cleaned = id.trim();
    return cleaned.length >= 6 && cleaned.length <= 30 && PATTERNS.transactionId.test(cleaned);
}
/**
 * Validate top-up amount
 */
function isValidTopupAmount(amount) {
    if (typeof amount !== 'number')
        return false;
    return types_1.TOPUP_AMOUNTS.includes(amount);
}
/**
 * Validate payment provider
 */
function isValidPaymentProvider(provider) {
    return provider === 'telebirr' || provider === 'cbe';
}
/**
 * Validate language code
 */
function isValidLanguage(lang) {
    return lang === 'en' || lang === 'am' || lang === 'ti';
}
/**
 * Validate phone number (Ethiopian format)
 */
function isValidPhoneNumber(phone) {
    if (typeof phone !== 'string')
        return false;
    const cleaned = phone.replace(/[\s\-]/g, '');
    return PATTERNS.phoneNumber.test(cleaned);
}
/**
 * Validate file name (no path traversal)
 */
function isValidFileName(name) {
    if (typeof name !== 'string')
        return false;
    if (name.includes('..') || name.includes('/') || name.includes('\\'))
        return false;
    return PATTERNS.fileName.test(name);
}
/**
 * Sanitize string input
 */
function sanitizeString(input, maxLength = 255) {
    return input
        .trim()
        .substring(0, maxLength)
        .replace(/[<>]/g, ''); // Remove potential HTML/XML tags
}
/**
 * Sanitize file name
 */
function sanitizeFileName(name) {
    return name
        .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
        .replace(/\.{2,}/g, '.')
        .substring(0, 100);
}
/**
 * Sanitize path (prevent traversal)
 */
function sanitizePath(inputPath, baseDir) {
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
function validateUserInput(input, schema) {
    const errors = [];
    for (const [key, validator] of Object.entries(schema)) {
        if (!validator(input[key])) {
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
function escapeHtml(text) {
    const map = {
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
function isValidPdfBuffer(buffer) {
    // Check PDF magic bytes
    const pdfHeader = buffer.slice(0, 5).toString();
    return pdfHeader === '%PDF-';
}
/**
 * Check if string contains only allowed characters
 */
function containsOnlyAllowed(str, allowedPattern) {
    return allowedPattern.test(str);
}
exports.default = {
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
//# sourceMappingURL=validator.js.map