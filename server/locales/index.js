"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORTED_LANGUAGES = void 0;
exports.t = t;
exports.getMessageKeys = getMessageKeys;
exports.hasMessage = hasMessage;
exports.getMessages = getMessages;
exports.validateLocaleCompleteness = validateLocaleCompleteness;
const en_json_1 = __importDefault(require("./en.json"));
const am_json_1 = __importDefault(require("./am.json"));
const ti_json_1 = __importDefault(require("./ti.json"));
exports.SUPPORTED_LANGUAGES = ['en', 'am', 'ti'];
const locales = {
    en: en_json_1.default,
    am: am_json_1.default,
    ti: ti_json_1.default
};
/**
 * Get translated message by key
 * Supports placeholder replacement with {key} syntax
 */
function t(language, key, params) {
    const messages = locales[language] || locales.en;
    let message = messages[key];
    // Fallback to English if key not found
    if (!message && language !== 'en') {
        message = locales.en[key];
    }
    // Return key if message not found
    if (!message) {
        return key;
    }
    // Replace placeholders
    if (params) {
        for (const [paramKey, value] of Object.entries(params)) {
            message = message.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value));
        }
    }
    return message;
}
/**
 * Get all message keys for a language
 */
function getMessageKeys(language) {
    return Object.keys(locales[language] || locales.en);
}
/**
 * Check if a message key exists
 */
function hasMessage(language, key) {
    const messages = locales[language] || locales.en;
    return key in messages;
}
/**
 * Get all messages for a language
 */
function getMessages(language) {
    return { ...(locales[language] ?? locales.en) };
}
/**
 * Check if all languages have the same keys
 */
function validateLocaleCompleteness() {
    const englishKeys = new Set(Object.keys(locales.en));
    const missing = {
        en: [],
        am: [],
        ti: []
    };
    for (const lang of exports.SUPPORTED_LANGUAGES) {
        if (lang === 'en')
            continue;
        const langKeys = new Set(Object.keys(locales[lang]));
        for (const key of englishKeys) {
            if (!langKeys.has(key)) {
                missing[lang].push(key);
            }
        }
    }
    const complete = Object.values(missing).every(arr => arr.length === 0);
    return { complete, missing };
}
exports.default = { t, getMessageKeys, hasMessage, getMessages, validateLocaleCompleteness, SUPPORTED_LANGUAGES: exports.SUPPORTED_LANGUAGES };
//# sourceMappingURL=index.js.map