import { Language } from '../types';
import en from './en.json';
import am from './am.json';
import ti from './ti.json';

export const SUPPORTED_LANGUAGES: Language[] = ['en', 'am', 'ti'];

type LocaleMessages = Record<string, string>;

const locales: Record<Language, LocaleMessages> = {
  en: en as LocaleMessages,
  am: am as LocaleMessages,
  ti: ti as LocaleMessages
};

/**
 * Get translated message by key
 * Supports placeholder replacement with {key} syntax
 */
export function t(
  language: Language,
  key: string,
  params?: Record<string, string | number>
): string {
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
export function getMessageKeys(language: Language): string[] {
  return Object.keys(locales[language] || locales.en);
}

/**
 * Check if a message key exists
 */
export function hasMessage(language: Language, key: string): boolean {
  const messages = locales[language] || locales.en;
  return key in messages;
}

/**
 * Get all messages for a language
 */
export function getMessages(language: Language): LocaleMessages {
  return { ...locales[language] } || { ...locales.en };
}

/**
 * Check if all languages have the same keys
 */
export function validateLocaleCompleteness(): { complete: boolean; missing: Record<Language, string[]> } {
  const englishKeys = new Set(Object.keys(locales.en));
  const missing: Record<Language, string[]> = {
    en: [],
    am: [],
    ti: []
  };

  for (const lang of SUPPORTED_LANGUAGES) {
    if (lang === 'en') continue;
    
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

export default { t, getMessageKeys, hasMessage, getMessages, validateLocaleCompleteness, SUPPORTED_LANGUAGES };
