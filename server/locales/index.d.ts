import { Language } from '../types';
export declare const SUPPORTED_LANGUAGES: Language[];
type LocaleMessages = Record<string, string>;
/**
 * Get translated message by key
 * Supports placeholder replacement with {key} syntax
 */
export declare function t(language: Language, key: string, params?: Record<string, string | number>): string;
/**
 * Get all message keys for a language
 */
export declare function getMessageKeys(language: Language): string[];
/**
 * Check if a message key exists
 */
export declare function hasMessage(language: Language, key: string): boolean;
/**
 * Get all messages for a language
 */
export declare function getMessages(language: Language): LocaleMessages;
/**
 * Check if all languages have the same keys
 */
export declare function validateLocaleCompleteness(): {
    complete: boolean;
    missing: Record<Language, string[]>;
};
declare const _default: {
    t: typeof t;
    getMessageKeys: typeof getMessageKeys;
    hasMessage: typeof hasMessage;
    getMessages: typeof getMessages;
    validateLocaleCompleteness: typeof validateLocaleCompleteness;
    SUPPORTED_LANGUAGES: Language[];
};
export default _default;
//# sourceMappingURL=index.d.ts.map