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
   * Extract images from PDF (photo, QR code, barcode)
   */
  async extractImages(_buffer: Buffer): Promise<ExtractedImages> {
    logger.warn('Image extraction from PDF is not fully implemented');
    return {
      photo: null,
      qrCode: null,
      barcode: null
    };
  }

  /**
   * Parse eFayda PDF and extract all data
   */
  async parse(buffer: Buffer): Promise<EfaydaData> {
    const text = await this.extractText(buffer);
    const images = await this.extractImages(buffer);
    
    // Split text into lines for easier parsing
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    const data: EfaydaData = {
      fullNameAmharic: this.extractField(lines, 'amharic_name'),
      fullNameEnglish: this.extractField(lines, 'english_name'),
      dateOfBirthEthiopian: this.extractField(lines, 'dob_ethiopian'),
      dateOfBirthGregorian: this.extractField(lines, 'dob_gregorian'),
      sex: this.extractSex(text),
      nationality: 'Ethiopian',
      phoneNumber: this.extractPhoneNumber(text),
      region: this.extractField(lines, 'region'),
      city: this.extractField(lines, 'city'),
      subcity: this.extractField(lines, 'subcity'),
      fcn: this.extractFCN(text),
      fin: this.extractFCN(text), // FIN often same format as FCN
      fan: this.extractFCN(text),
      serialNumber: '',
      issueDate: '',
      expiryDate: '',
      photo: images.photo || undefined,
      qrCode: images.qrCode || undefined,
      barcode: images.barcode || undefined
    };

    return data;
  }

  /**
   * Extract specific field based on eFayda PDF structure
   */
  private extractField(lines: string[], fieldType: string): string {
    const fullText = lines.join(' ');
    
    switch (fieldType) {
      case 'amharic_name': {
        // Look for Amharic name pattern (3 Amharic words together)
        // The name appears after "ሙሉ ስም" section
        const amharicNamePattern = /([\u1200-\u137F]+\s+[\u1200-\u137F]+\s+[\u1200-\u137F]+)/g;
        const matches = fullText.match(amharicNamePattern);
        if (matches) {
          // Filter out common phrases and find the actual name
          const names = matches.filter(m => 
            !m.includes('ኢትዮጵያ') && 
            !m.includes('መታወቂያ') && 
            !m.includes('ፕሮግራም') &&
            !m.includes('ዲጂታል') &&
            !m.includes('ብሔራዊ') &&
            !m.includes('ክፍለ') &&
            m.split(/\s+/).length >= 3
          );
          if (names.length > 0) {
            return names[names.length - 1].trim(); // Usually last match is the name
          }
        }
        return '';
      }
      
      case 'english_name': {
        // Look for English name pattern (capitalized words)
        const englishNamePattern = /([A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+)/g;
        const matches = fullText.match(englishNamePattern);
        if (matches) {
          // Filter out common phrases
          const names = matches.filter(m => 
            !m.includes('Ethiopian') && 
            !m.includes('Digital') && 
            !m.includes('National') &&
            !m.includes('Date') &&
            !m.includes('Birth') &&
            !m.includes('Sub') &&
            !m.includes('City')
          );
          if (names.length > 0) {
            return names[names.length - 1].trim();
          }
        }
        return '';
      }
      
      case 'dob_ethiopian': {
        // Ethiopian DOB format: DD/MM/YYYY (first date found)
        const datePattern = /(\d{2}\/\d{2}\/\d{4})/g;
        const matches = fullText.match(datePattern);
        if (matches && matches.length > 0) {
          return matches[0];
        }
        return '';
      }
      
      case 'dob_gregorian': {
        // Gregorian DOB format: YYYY/MM/DD or second date
        const datePattern = /(\d{4}\/\d{2}\/\d{2})/g;
        const matches = fullText.match(datePattern);
        if (matches && matches.length > 0) {
          return matches[0];
        }
        // Try DD/MM/YYYY format (second occurrence)
        const altPattern = /(\d{2}\/\d{2}\/\d{4})/g;
        const altMatches = fullText.match(altPattern);
        if (altMatches && altMatches.length > 1) {
          return altMatches[1];
        }
        return '';
      }
      
      case 'region': {
        // Look for region names
        const regions = ['ትግራይ', 'Tigray', 'አዲስ አበባ', 'Addis Ababa', 'አማራ', 'Amhara', 'ኦሮሚያ', 'Oromia'];
        for (const region of regions) {
          if (fullText.includes(region)) {
            return region;
          }
        }
        return '';
      }
      
      case 'city': {
        // Look for city names
        const cities = ['መቐለ', 'Mekelle', 'አዲስ አበባ', 'Addis Ababa', 'ባህር ዳር', 'Bahir Dar', 'ሀዋሳ', 'Hawassa'];
        for (const city of cities) {
          if (fullText.includes(city)) {
            return city;
          }
        }
        return '';
      }
      
      case 'subcity': {
        // Look for subcity pattern
        const subcityPattern = /([\u1200-\u137F]+\s*ክ\/ከተማ|[A-Za-z]+\s*Sub\s*City)/gi;
        const match = fullText.match(subcityPattern);
        if (match) {
          return match[0].trim();
        }
        return '';
      }
      
      default:
        return '';
    }
  }

  /**
   * Extract sex/gender
   */
  private extractSex(text: string): 'Male' | 'Female' {
    if (text.includes('ወንድ') || text.toLowerCase().includes('male')) {
      return 'Male';
    }
    if (text.includes('ሴት') || text.toLowerCase().includes('female')) {
      return 'Female';
    }
    return 'Male';
  }

  /**
   * Extract phone number
   */
  private extractPhoneNumber(text: string): string {
    // Ethiopian phone: 09XXXXXXXX
    const phonePattern = /(09\d{8})/;
    const match = text.match(phonePattern);
    return match ? match[1] : '';
  }

  /**
   * Extract FCN (Fayda Card Number) - format: XXXX XXXX XXXX XXXX
   */
  private extractFCN(text: string): string {
    // Look for 16-digit number with spaces
    const fcnPattern = /(\d{4}\s+\d{4}\s+\d{4}\s+\d{4})/;
    const match = text.match(fcnPattern);
    if (match) {
      return match[1];
    }
    
    // Try without spaces
    const fcnPattern2 = /(\d{16})/;
    const match2 = text.match(fcnPattern2);
    return match2 ? match2[1] : '';
  }
}

export const pdfParser = new PDFParserImpl();
export default pdfParser;
