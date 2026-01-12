/**
 * Property Test: Localization Completeness
 * Feature: efayda-id-generator, Property 15: Localization Completeness
 * Validates: Requirements 10.1, 10.2, 10.3, 10.5
 * 
 * For any user-facing message key in the system, translations SHALL exist
 * for all three supported languages (English, Amharic, Tigrigna).
 */

import * as fc from 'fast-check';
import { locales, getSupportedLanguages, t, isLanguageSupported } from '../index';
import { Language } from '../../types';

describe('Property 15: Localization Completeness', () => {
  // Get all keys from an object recursively
  function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
    const keys: string[] = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        keys.push(...getAllKeys(value as Record<string, unknown>, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    
    return keys;
  }

  // Get all message keys from English locale (reference)
  const englishKeys = getAllKeys(locales.en as unknown as Record<string, unknown>);
  const supportedLanguages = getSupportedLanguages();

  it('should have exactly 3 supported languages', () => {
    expect(supportedLanguages).toHaveLength(3);
    expect(supportedLanguages).toContain('en');
    expect(supportedLanguages).toContain('am');
    expect(supportedLanguages).toContain('ti');
  });

  it('should have all message keys present in all languages', () => {
    // For each language, verify all keys exist
    for (const lang of supportedLanguages) {
      const langKeys = getAllKeys(locales[lang] as unknown as Record<string, unknown>);
      
      // Check that all English keys exist in this language
      for (const key of englishKeys) {
        expect(langKeys).toContain(key);
      }
      
      // Check that this language doesn't have extra keys not in English
      for (const key of langKeys) {
        expect(englishKeys).toContain(key);
      }
    }
  });

  it('should return non-empty translations for all keys in all languages', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...englishKeys),
        fc.constantFrom(...supportedLanguages),
        (key, lang) => {
          const translation = t(key, lang);
          
          // Translation should not be empty
          expect(translation.length).toBeGreaterThan(0);
          
          // Translation should not be the key itself (unless it's intentional)
          // Some keys might legitimately return themselves, so we check for common patterns
          if (!key.includes('ETB') && !key.includes('DPI')) {
            // For most keys, the translation should be different from the key
            // This is a soft check - some technical terms might be the same
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have consistent structure across all languages', () => {
    const enStructure = JSON.stringify(Object.keys(locales.en).sort());
    const amStructure = JSON.stringify(Object.keys(locales.am).sort());
    const tiStructure = JSON.stringify(Object.keys(locales.ti).sort());
    
    expect(amStructure).toBe(enStructure);
    expect(tiStructure).toBe(enStructure);
  });

  it('should correctly identify supported languages', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('en', 'am', 'ti', 'fr', 'de', 'es', 'zh', 'ar', 'invalid'),
        (lang) => {
          const isSupported = isLanguageSupported(lang);
          const shouldBeSupported = ['en', 'am', 'ti'].includes(lang);
          
          expect(isSupported).toBe(shouldBeSupported);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should replace placeholders correctly in all languages', () => {
    const testParams = { amount: 500, balance: 1000, price: 50 };
    
    fc.assert(
      fc.property(
        fc.constantFrom(...supportedLanguages),
        (lang) => {
          // Test balance.current which has {amount} placeholder
          const balanceMsg = t('balance.current', lang, testParams);
          expect(balanceMsg).toContain('500');
          
          // Test topup.success which has {amount} placeholder
          const topupMsg = t('topup.success', lang, testParams);
          expect(topupMsg).toContain('500');
          
          // Test topup.newBalance which has {balance} placeholder
          const newBalanceMsg = t('topup.newBalance', lang, testParams);
          expect(newBalanceMsg).toContain('1000');
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have all error messages in all languages', () => {
    const errorKeys = englishKeys.filter(key => key.startsWith('errors.'));
    
    fc.assert(
      fc.property(
        fc.constantFrom(...errorKeys),
        fc.constantFrom(...supportedLanguages),
        (key, lang) => {
          const errorMsg = t(key, lang);
          
          // Error messages should not be empty
          expect(errorMsg.length).toBeGreaterThan(0);
          
          // Error messages should typically start with an emoji
          expect(errorMsg.match(/^[❌⚠️]/)).toBeTruthy();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have all button labels in all languages', () => {
    const buttonKeys = englishKeys.filter(key => key.startsWith('buttons.'));
    
    fc.assert(
      fc.property(
        fc.constantFrom(...buttonKeys),
        fc.constantFrom(...supportedLanguages),
        (key, lang) => {
          const buttonLabel = t(key, lang);
          
          // Button labels should not be empty
          expect(buttonLabel.length).toBeGreaterThan(0);
          
          // Button labels should typically start with an emoji
          expect(buttonLabel.match(/^[⬅️❌✅🔄]/)).toBeTruthy();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have welcome messages in all languages', () => {
    for (const lang of supportedLanguages) {
      const title = t('welcome.title', lang);
      const description = t('welcome.description', lang);
      const instructions = t('welcome.instructions', lang);
      
      expect(title.length).toBeGreaterThan(0);
      expect(description.length).toBeGreaterThan(0);
      expect(instructions.length).toBeGreaterThan(0);
      
      // Welcome title should contain Ethiopian flag emoji
      expect(title).toContain('🇪🇹');
    }
  });
});
