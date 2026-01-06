/**
 * PDF Parser - EXACTLY like test-pdf-full.ts from commit a8d0b98
 */
import pdfParse from 'pdf-parse';
import { EfaydaData } from '../../types';
import { PDFParser, ExtractedImages } from './types';
import { logger } from '../../utils/logger';

export class PDFParserImpl implements PDFParser {
  /**
   * Extract text content from PDF
   */
  async extractText(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer);
      return data.text || '';
    } catch (error) {
      logger.error('Failed to extract text from PDF:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Extract images from PDF - EXACTLY like test script
   */
  async extractImages(buffer: Buffer): Promise<ExtractedImages> {
    const result: ExtractedImages = {
      photo: null,
      qrCode: null,
      barcode: null
    };

    // Find JPEG images
    const jpegStart = Buffer.from([0xFF, 0xD8, 0xFF]);
    const jpegEnd = Buffer.from([0xFF, 0xD9]);

    const images: Buffer[] = [];
    let startIndex = 0;

    while (startIndex < buffer.length) {
      const start = buffer.indexOf(jpegStart, startIndex);
      if (start === -1) break;

      const end = buffer.indexOf(jpegEnd, start + 3);
      if (end === -1) break;

      const imageBuffer = buffer.slice(start, end + 2);
      if (imageBuffer.length > 500) {
        images.push(imageBuffer);
      }
      startIndex = end + 2;
    }

    logger.info(`Found ${images.length} images in PDF`);

    // First image is the user photo, second is QR code
    if (images.length >= 1) {
      result.photo = images[0];
      logger.info(`Photo size: ${images[0].length} bytes`);
    }

    if (images.length >= 2) {
      result.qrCode = images[1];
      logger.info(`QR code size: ${images[1].length} bytes`);
    }

    return result;
  }

  /**
   * Parse PDF text - EXACTLY like test script parsePdfText function
   */
  private parsePdfText(text: string): {
    fullNameAmharic: string;
    fullNameEnglish: string;
    dateOfBirthEthiopian: string;
    dateOfBirthGregorian: string;
    sex: 'Male' | 'Female';
    sexAmharic: string;
    phoneNumber: string;
    regionAmharic: string;
    regionEnglish: string;
    zoneAmharic: string;
    zoneEnglish: string;
    woredaAmharic: string;
    woredaEnglish: string;
    fcn: string;
    fin: string;
  } {
    const data = {
      fullNameAmharic: '',
      fullNameEnglish: '',
      dateOfBirthEthiopian: '',
      dateOfBirthGregorian: '',
      sex: 'Male' as 'Male' | 'Female',
      sexAmharic: '',
      phoneNumber: '',
      regionAmharic: '',
      regionEnglish: '',
      zoneAmharic: '',
      zoneEnglish: '',
      woredaAmharic: '',
      woredaEnglish: '',
      fcn: '',
      fin: ''
    };

    // Extract ALL dates from PDF
    // Format 1: DD/MM/YYYY (Gregorian style)
    // Format 2: YYYY/MM/DD (Ethiopian style)
    const datePattern1 = /(\d{2}\/\d{2}\/\d{4})/g;
    const datePattern2 = /(\d{4}\/\d{2}\/\d{2})/g;

    const dates1 = text.match(datePattern1) || [];
    const dates2 = text.match(datePattern2) || [];

    // DOB is typically the first date
    if (dates1.length > 0) data.dateOfBirthGregorian = dates1[0] || '';
    if (dates2.length > 0) data.dateOfBirthEthiopian = dates2[0] || '';

    // Extract phone number
    const phonePattern = /(09\d{8})/;
    const phoneMatch = text.match(phonePattern);
    if (phoneMatch) data.phoneNumber = phoneMatch[1];

    // Extract FCN (16 digits with spaces) - this is the FAN
    const fcnPattern = /(\d{4}\s+\d{4}\s+\d{4}\s+\d{4})/;
    const fcnMatch = text.match(fcnPattern);
    if (fcnMatch) data.fcn = fcnMatch[1];

    // Extract FIN (12 digits with spaces) - look for different pattern
    // FIN format is typically XXXX XXXX XXXX (12 digits)
    const finPattern = /(\d{4}\s+\d{4}\s+\d{4})(?!\s+\d)/;
    const finMatch = text.match(finPattern);
    if (finMatch) {
      data.fin = finMatch[1];
    } else {
      // If no separate FIN found, generate from FCN (first 12 digits)
      const fcnDigits = data.fcn.replace(/\s/g, '');
      if (fcnDigits.length >= 12) {
        const finDigits = fcnDigits.substring(0, 12);
        data.fin = `${finDigits.substring(0,4)} ${finDigits.substring(4,8)} ${finDigits.substring(8,12)}`;
      }
    }

    // Extract sex
    if (text.includes('ወንድ')) {
      data.sexAmharic = 'ወንድ';
      data.sex = 'Male';
    } else if (text.includes('ሴት')) {
      data.sexAmharic = 'ሴት';
      data.sex = 'Female';
    }

    // Extract English name
    const englishNamePattern = /([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)/g;
    const englishMatches = [...text.matchAll(englishNamePattern)];

    const excludeEnglish = ['Ethiopian', 'Digital', 'National', 'Date', 'Birth', 'Sub', 'City', 'Phone', 'Number', 'Region', 'Woreda', 'Demographic', 'Data', 'Disclaimer', 'Personal'];

    for (let i = englishMatches.length - 1; i >= 0; i--) {
      const fullMatch = englishMatches[i][0];
      const words = fullMatch.split(/\s+/);
      const isExcluded = words.some(w => excludeEnglish.includes(w));
      if (!isExcluded) {
        data.fullNameEnglish = fullMatch;
        break;
      }
    }

    // Extract Amharic name
    const amharicNamePattern = /^([\u1200-\u137F]+\s+[\u1200-\u137F]+\s+[\u1200-\u137F]+)$/gm;
    const amharicMatches = [...text.matchAll(amharicNamePattern)];

    const excludeAmharic = ['ኢትዮጵያ', 'ብሔራዊ', 'መታወቂያ', 'ፕሮግራም', 'ዲጂታል', 'ካርድ', 'ክፍለ', 'ከተማ', 'ወረዳ', 'ክልል', 'ዜግነት', 'ስልክ', 'የስነ', 'ሕዝብ', 'መረጃ', 'ማሳሰቢያ'];

    for (let i = amharicMatches.length - 1; i >= 0; i--) {
      const fullMatch = amharicMatches[i][1];
      const words = fullMatch.split(/\s+/);
      const isExcluded = words.some(w => excludeAmharic.some(e => w.includes(e)));
      if (!isExcluded && words.length >= 3) {
        data.fullNameAmharic = fullMatch;
        break;
      }
    }

    // Region
    if (text.includes('ትግራይ')) {
      data.regionAmharic = 'ትግራይ';
      data.regionEnglish = 'Tigray';
    } else if (text.includes('አዲስ አበባ')) {
      data.regionAmharic = 'አዲስ አበባ';
      data.regionEnglish = 'Addis Ababa';
    } else if (text.includes('አማራ')) {
      data.regionAmharic = 'አማራ';
      data.regionEnglish = 'Amhara';
    } else if (text.includes('ኦሮሚያ')) {
      data.regionAmharic = 'ኦሮሚያ';
      data.regionEnglish = 'Oromia';
    }

    // Zone/City
    if (text.includes('መቐለ')) {
      data.zoneAmharic = 'መቐለ';
      data.zoneEnglish = 'Mekelle';
    } else if (text.includes('አዲስ አበባ') && !data.zoneAmharic) {
      data.zoneAmharic = 'አዲስ አበባ';
      data.zoneEnglish = 'Addis Ababa';
    }

    // Woreda
    const woredaAmharicPattern = /([\u1200-\u137F]+)\s*ክ\/ከተማ/;
    const woredaMatch = text.match(woredaAmharicPattern);
    if (woredaMatch) {
      data.woredaAmharic = woredaMatch[0];
    }

    const woredaEnglishPattern = /([A-Za-z]+)\s+Sub\s+City/i;
    const woredaEnglishMatch = text.match(woredaEnglishPattern);
    if (woredaEnglishMatch) {
      data.woredaEnglish = woredaEnglishMatch[0];
    }

    return data;
  }

  /**
   * Parse eFayda PDF and extract all data
   */
  async parse(buffer: Buffer): Promise<EfaydaData> {
    const text = await this.extractText(buffer);
    const images = await this.extractImages(buffer);
    const parsed = this.parsePdfText(text);

    logger.info(`Parsed: FCN=${parsed.fcn}, FIN=${parsed.fin}`);
    logger.info(`Parsed Amharic: region=${parsed.regionAmharic}, zone=${parsed.zoneAmharic}, woreda=${parsed.woredaAmharic}`);

    return {
      fullNameAmharic: parsed.fullNameAmharic,
      fullNameEnglish: parsed.fullNameEnglish,
      dateOfBirthEthiopian: parsed.dateOfBirthEthiopian,
      dateOfBirthGregorian: parsed.dateOfBirthGregorian,
      sex: parsed.sex,
      nationality: 'Ethiopian',
      phoneNumber: parsed.phoneNumber,
      region: parsed.regionEnglish,
      city: parsed.zoneEnglish,
      subcity: parsed.woredaEnglish,
      fcn: parsed.fcn,
      fin: parsed.fin,
      fan: parsed.fcn,
      serialNumber: String(Math.floor(1000000 + Math.random() * 9000000)),
      // Extract dates from PDF or generate based on DOB
      issueDate: this.calculateIssueDate(parsed.dateOfBirthGregorian),
      issueDateEthiopian: this.calculateIssueDateEthiopian(parsed.dateOfBirthEthiopian),
      expiryDate: this.calculateExpiryDate(parsed.dateOfBirthGregorian),
      expiryDateGregorian: this.calculateExpiryDate(parsed.dateOfBirthGregorian),
      expiryDateEthiopian: this.calculateExpiryDateEthiopian(parsed.dateOfBirthEthiopian),
      photo: images.photo || undefined,
      qrCode: images.qrCode || undefined,
      barcode: images.barcode || undefined,
      // Store Amharic values for rendering
      regionAmharic: parsed.regionAmharic,
      zoneAmharic: parsed.zoneAmharic,
      woredaAmharic: parsed.woredaAmharic,
      sexAmharic: parsed.sexAmharic
    } as EfaydaData;
  }

  /**
   * Calculate issue date (current date in YYYY/MM/DD format)
   */
  private calculateIssueDate(_dobGregorian: string): string {
    const now = new Date();
    return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
  }

  /**
   * Calculate issue date in Ethiopian calendar (approximately 7-8 years behind)
   */
  private calculateIssueDateEthiopian(_dobEthiopian: string): string {
    const now = new Date();
    const ethYear = now.getFullYear() - 8;
    return `${ethYear}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
  }

  /**
   * Calculate expiry date (10 years from now in YYYY/MM/DD format)
   */
  private calculateExpiryDate(_dobGregorian: string): string {
    const now = new Date();
    const expiry = new Date(now);
    expiry.setFullYear(expiry.getFullYear() + 10);
    return `${expiry.getFullYear()}/${String(expiry.getMonth() + 1).padStart(2, '0')}/${String(expiry.getDate()).padStart(2, '0')}`;
  }

  /**
   * Calculate expiry date in Ethiopian calendar
   */
  private calculateExpiryDateEthiopian(_dobEthiopian: string): string {
    const now = new Date();
    const expiry = new Date(now);
    expiry.setFullYear(expiry.getFullYear() + 10);
    const ethYear = expiry.getFullYear() - 8;
    return `${ethYear}/${String(expiry.getMonth() + 1).padStart(2, '0')}/${String(expiry.getDate()).padStart(2, '0')}`;
  }
}

export const pdfParser = new PDFParserImpl();
export default pdfParser;
