import { Language } from '../types';
import en from './en.json';
import am from './am.json';
import ti from './ti.json';

// Type definitions for locale messages
export interface LocaleMessages {
  welcome: {
    title: string;
    description: string;
    instructions: string;
  };
  commands: {
    start: string;
    language: string;
    upload: string;
    balance: string;
    topup: string;
    pricing: string;
    settings: string;
    help: string;
  };
  language: {
    select: string;
    changed: string;
    english: string;
    amharic: string;
    tigrigna: string;
  };
  upload: {
    prompt: string;
    instructions: string;
    processing: string;
    validating: string;
    extracting: string;
    generating: string;
    success: string;
    delivering: string;
  };
  balance: {
    title: string;
    current: string;
    insufficient: string;
    required: string;
  };
  topup: {
    title: string;
    selectAmount: string;
    selectProvider: string;
    telebirr: string;
    cbe: string;
    instructions: {
      telebirr: string;
      cbe: string;
    };
    enterTxId: string;
    verifying: string;
    success: string;
    newBalance: string;
  };
  pricing: {
    title: string;
    perDocument: string;
    includes: string;
    item1: string;
    item2: string;
    item3: string;
  };
  settings: {
    title: string;
    language: string;
    notifications: string;
    on: string;
    off: string;
  };
  help: {
    title: string;
    howToUse: string;
    step1: string;
    step2: string;
    step3: string;
    support: string;
  };
  errors: {
    invalidPdf: string;
    notEfayda: string;
    corruptedPdf: string;
    parseFailed: string;
    invalidTxId: string;
    txAlreadyUsed: string;
    txWrongAmount: string;
    txWrongReceiver: string;
    insufficientBalance: string;
    generationFailed: string;
    rateLimitExceeded: string;
    serviceUnavailable: string;
    generic: string;
  };
  buttons: {
    back: string;
    cancel: string;
    confirm: string;
    retry: string;
  };
}

// Locale map
const locales: Record<Language, LocaleMessages> = {
  en: en as LocaleMessages,
  am: am as LocaleMessages,
  ti: ti as LocaleMessages,
};

// Get all message keys recursively
type PathsToStringProps<T> = T extends string
  ? []
  : {
      [K in Extract<keyof T, string>]: [K, ...PathsToStringProps<T[K]>];
    }[Extract<keyof T, string>];

type Join<T extends string[], D extends string> = T extends []
  ? never
  : T extends [infer F]
  ? F
  : T extends [infer F, ...infer R]
  ? F extends string
    ? `${F}${D}${Join<Extract<R, string[]>, D>}`
    : never
  : string;

export type MessageKey = Join<PathsToStringProps<LocaleMessages>, '.'>;

// Get nested value from object using dot notation
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path; // Return the key if not found
    }
  }
  
  return typeof current === 'string' ? current : path;
}

// Replace placeholders in message
function replacePlaceholders(message: string, params?: Record<string, string | number>): string {
  if (!params) return message;
  
  let result = message;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return result;
}

// i18n class for internationalization
export class I18n {
  private language: Language;
  
  constructor(language: Language = 'en') {
    this.language = language;
  }
  
  setLanguage(language: Language): void {
    this.language = language;
  }
  
  getLanguage(): Language {
    return this.language;
  }
  
  t(key: string, params?: Record<string, string | number>): string {
    const messages = locales[this.language];
    const message = getNestedValue(messages as unknown as Record<string, unknown>, key);
    return replacePlaceholders(message, params);
  }
  
  // Get all messages for current language
  getMessages(): LocaleMessages {
    return locales[this.language];
  }
}

// Default i18n instance
export const i18n = new I18n();

// Helper function to get translation
export function t(key: string, language: Language = 'en', params?: Record<string, string | number>): string {
  const messages = locales[language];
  const message = getNestedValue(messages as unknown as Record<string, unknown>, key);
  return replacePlaceholders(message, params);
}

// Get all supported languages
export function getSupportedLanguages(): Language[] {
  return ['en', 'am', 'ti'];
}

// Check if language is supported
export function isLanguageSupported(lang: string): lang is Language {
  return ['en', 'am', 'ti'].includes(lang);
}

// Get language display name
export function getLanguageDisplayName(lang: Language, inLanguage: Language = 'en'): string {
  const names: Record<Language, Record<Language, string>> = {
    en: { en: 'English', am: 'English', ti: 'English' },
    am: { en: 'Amharic', am: 'አማርኛ', ti: 'አማርኛ' },
    ti: { en: 'Tigrigna', am: 'ትግርኛ', ti: 'ትግርኛ' },
  };
  return names[lang][inLanguage];
}

// Export locales for testing
export { locales };
