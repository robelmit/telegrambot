import { EfaydaData } from '../../types';
import { DataNormalizer } from './types';
import { logger } from '../../utils/logger';

export class DataNormalizerImpl implements DataNormalizer {
  /**
   * Normalize phone number to standard Ethiopian format
   */
  normalizePhoneNumber(phone: string): string {
    if (!phone) return '';
    
    // Remove all non-digit characters except +
    let normalized = phone.replace(/[^\d+]/g, '');
    
    // Handle different formats
    if (normalized.startsWith('+251')) {
      // International format: +251912345678 -> 0912345678
      normalized = '0' + normalized.slice(4);
    } else if (normalized.startsWith('251')) {
      // Without +: 251912345678 -> 0912345678
      normalized = '0' + normalized.slice(3);
    } else if (normalized.length === 9 && normalized.startsWith('9')) {
      // Missing leading 0: 912345678 -> 0912345678
      normalized = '0' + normalized;
    }
    
    // Validate format
    if (!/^09\d{8}$/.test(normalized)) {
      logger.warn(`Invalid phone number format: ${phone}`);
    }
    
    return normalized;
  }

  /**
   * Normalize date to standard format
   * Returns both Ethiopian and Gregorian calendar dates
   */
  normalizeDate(date: string): { ethiopian: string; gregorian: string } {
    if (!date) {
      return { ethiopian: '', gregorian: '' };
    }

    // Try to parse the date
    const datePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/;
    const match = date.match(datePattern);
    
    if (!match) {
      return { ethiopian: date, gregorian: '' };
    }

    const [, day, month, year] = match;
    const normalizedDate = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    
    // Simple heuristic: Ethiopian calendar years are ~7-8 years behind Gregorian
    const yearNum = parseInt(year, 10);
    
    if (yearNum < 2015) {
      // Likely Ethiopian calendar
      return {
        ethiopian: normalizedDate,
        gregorian: this.ethiopianToGregorian(normalizedDate)
      };
    } else {
      // Likely Gregorian calendar
      return {
        ethiopian: this.gregorianToEthiopian(normalizedDate),
        gregorian: normalizedDate
      };
    }
  }

  /**
   * Convert Ethiopian date to Gregorian (approximate)
   */
  private ethiopianToGregorian(ethDate: string): string {
    const match = ethDate.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!match) return '';
    
    const [, day, month, year] = match;
    const ethYear = parseInt(year, 10);
    const ethMonth = parseInt(month, 10);
    const ethDay = parseInt(day, 10);
    
    // Ethiopian calendar is approximately 7-8 years behind Gregorian
    // This is a simplified conversion - for accuracy, use a proper library
    let gregYear = ethYear + 7;
    let gregMonth = ethMonth + 8;
    let gregDay = ethDay + 10;
    
    // Handle month overflow
    if (gregMonth > 12) {
      gregMonth -= 12;
      gregYear += 1;
    }
    
    // Handle day overflow (simplified)
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (gregDay > daysInMonth[gregMonth - 1]) {
      gregDay -= daysInMonth[gregMonth - 1];
      gregMonth += 1;
      if (gregMonth > 12) {
        gregMonth = 1;
        gregYear += 1;
      }
    }
    
    return `${String(gregDay).padStart(2, '0')}/${String(gregMonth).padStart(2, '0')}/${gregYear}`;
  }

  /**
   * Convert Gregorian date to Ethiopian (approximate)
   */
  private gregorianToEthiopian(gregDate: string): string {
    const match = gregDate.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!match) return '';
    
    const [, day, month, year] = match;
    const gregYear = parseInt(year, 10);
    const gregMonth = parseInt(month, 10);
    const gregDay = parseInt(day, 10);
    
    // Simplified conversion
    let ethYear = gregYear - 7;
    let ethMonth = gregMonth - 8;
    let ethDay = gregDay - 10;
    
    // Handle month underflow
    if (ethMonth < 1) {
      ethMonth += 12;
      ethYear -= 1;
    }
    
    // Handle day underflow
    if (ethDay < 1) {
      ethMonth -= 1;
      if (ethMonth < 1) {
        ethMonth = 12;
        ethYear -= 1;
      }
      const daysInMonth = [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 5];
      ethDay += daysInMonth[ethMonth - 1];
    }
    
    return `${String(ethDay).padStart(2, '0')}/${String(ethMonth).padStart(2, '0')}/${ethYear}`;
  }

  /**
   * Normalize address components
   */
  normalizeAddress(
    region: string, 
    city: string, 
    subcity: string
  ): { region: string; city: string; subcity: string } {
    return {
      region: this.normalizeText(region),
      city: this.normalizeText(city),
      subcity: this.normalizeText(subcity)
    };
  }

  /**
   * Normalize name (extract Amharic and English versions)
   */
  normalizeName(name: string): { amharic: string; english: string } {
    if (!name) {
      return { amharic: '', english: '' };
    }

    // Check if name contains Ethiopic characters
    const hasEthiopic = /[\u1200-\u137F]/.test(name);
    const hasLatin = /[A-Za-z]/.test(name);

    if (hasEthiopic && !hasLatin) {
      return { amharic: name.trim(), english: '' };
    }
    
    if (hasLatin && !hasEthiopic) {
      return { amharic: '', english: this.normalizeEnglishName(name) };
    }

    // Mixed - try to separate
    const amharicPart = name.match(/[\u1200-\u137F\s]+/g)?.join(' ').trim() || '';
    const englishPart = name.match(/[A-Za-z\s]+/g)?.join(' ').trim() || '';

    return {
      amharic: amharicPart,
      english: this.normalizeEnglishName(englishPart)
    };
  }

  /**
   * Normalize English name (proper case)
   */
  private normalizeEnglishName(name: string): string {
    if (!name) return '';
    
    return name
      .toLowerCase()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim();
  }

  /**
   * Normalize general text
   */
  private normalizeText(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Normalize complete EfaydaData object
   */
  normalizeEfaydaData(data: Partial<EfaydaData>): EfaydaData {
    const normalizedName = this.normalizeName(
      data.fullNameEnglish || data.fullNameAmharic || ''
    );
    
    const normalizedDOB = this.normalizeDate(
      data.dateOfBirthEthiopian || data.dateOfBirthGregorian || ''
    );
    
    const normalizedAddress = this.normalizeAddress(
      data.region || '',
      data.city || '',
      data.subcity || ''
    );

    return {
      fullNameAmharic: data.fullNameAmharic || normalizedName.amharic,
      fullNameEnglish: data.fullNameEnglish || normalizedName.english,
      dateOfBirthEthiopian: data.dateOfBirthEthiopian || normalizedDOB.ethiopian,
      dateOfBirthGregorian: data.dateOfBirthGregorian || normalizedDOB.gregorian,
      sex: data.sex || 'Male',
      nationality: data.nationality || 'Ethiopian',
      phoneNumber: this.normalizePhoneNumber(data.phoneNumber || ''),
      region: normalizedAddress.region,
      city: normalizedAddress.city,
      subcity: normalizedAddress.subcity,
      fcn: data.fcn || '',
      fin: data.fin || '',
      fan: data.fan || '',
      serialNumber: data.serialNumber || '',
      issueDate: data.issueDate || '',
      expiryDate: data.expiryDate || '',
      photo: data.photo,
      qrCode: data.qrCode,
      barcode: data.barcode
    };
  }
}

// Export singleton instance
export const dataNormalizer = new DataNormalizerImpl();
export default dataNormalizer;
