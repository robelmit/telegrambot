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
   * Note: pdf-parse doesn't directly support image extraction
   * This is a placeholder that would need a more sophisticated library
   */
  async extractImages(_buffer: Buffer): Promise<ExtractedImages> {
    // For now, return null values - image extraction requires
    // more sophisticated PDF parsing (e.g., pdf.js, pdf-lib, or external tools)
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
    
    // Extract data using regex patterns
    const data: EfaydaData = {
      fullNameAmharic: this.extractAmharicName(text),
      fullNameEnglish: this.extractEnglishName(text),
      dateOfBirthEthiopian: this.extractEthiopianDOB(text),
      dateOfBirthGregorian: this.extractGregorianDOB(text),
      sex: this.extractSex(text),
      nationality: this.extractNationality(text),
      phoneNumber: this.extractPhoneNumber(text),
      region: this.extractRegion(text),
      city: this.extractCity(text),
      subcity: this.extractSubcity(text),
      fcn: this.extractFCN(text),
      fin: this.extractFIN(text),
      fan: this.extractFAN(text),
      serialNumber: this.extractSerialNumber(text),
      issueDate: this.extractIssueDate(text),
      expiryDate: this.extractExpiryDate(text),
      photo: images.photo || undefined,
      qrCode: images.qrCode || undefined,
      barcode: images.barcode || undefined
    };

    return data;
  }

  /**
   * Extract Amharic name from text
   */
  private extractAmharicName(text: string): string {
    // Look for Ethiopic script characters (Unicode range: \u1200-\u137F)
    const amharicPattern = /[\u1200-\u137F\s]+/g;
    const matches = text.match(amharicPattern);
    
    if (matches) {
      // Find the longest Amharic text sequence (likely the name)
      const names = matches
        .map(m => m.trim())
        .filter(m => m.length > 3 && m.split(/\s+/).length >= 2);
      
      if (names.length > 0) {
        // Return the first substantial Amharic name found
        return names[0];
      }
    }
    
    return '';
  }

  /**
   * Extract English name from text
   */
  private extractEnglishName(text: string): string {
    // Look for "Full Name" label followed by name
    const fullNamePattern = /Full\s*Name[:\s]*([A-Za-z\s]+)/i;
    const match = text.match(fullNamePattern);
    
    if (match && match[1]) {
      return match[1].trim();
    }

    // Alternative: Look for capitalized name pattern after common labels
    const namePattern = /(?:Name|ስም)[:\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/;
    const altMatch = text.match(namePattern);
    
    if (altMatch && altMatch[1]) {
      return altMatch[1].trim();
    }

    return '';
  }

  /**
   * Extract Ethiopian calendar date of birth
   */
  private extractEthiopianDOB(text: string): string {
    // Ethiopian dates are typically in format DD/MM/YYYY or similar
    // Look for date patterns near DOB labels
    const dobPattern = /(?:Date\s*of\s*Birth|የትውልድ\s*ቀን)[:\s]*(\d{2}\/\d{2}\/\d{4})/i;
    const match = text.match(dobPattern);
    
    if (match && match[1]) {
      return match[1];
    }

    // Look for date patterns with Ethiopian year (19xx or 20xx in Ethiopian calendar)
    const ethDatePattern = /(\d{2}\/\d{2}\/(?:19|20)\d{2})/;
    const dates = text.match(new RegExp(ethDatePattern, 'g'));
    
    if (dates && dates.length > 0) {
      return dates[0];
    }

    return '';
  }

  /**
   * Extract Gregorian calendar date of birth
   */
  private extractGregorianDOB(text: string): string {
    // Look for second date (Gregorian is usually listed after Ethiopian)
    const datePattern = /(\d{2}\/\d{2}\/\d{4})/g;
    const dates = text.match(datePattern);
    
    if (dates && dates.length >= 2) {
      return dates[1]; // Second date is usually Gregorian
    }

    return dates?.[0] || '';
  }

  /**
   * Extract sex/gender
   */
  private extractSex(text: string): 'Male' | 'Female' {
    const malePattern = /(?:Sex|ጾታ|ፆታ)[:\s]*(Male|ወንድ)/i;
    const femalePattern = /(?:Sex|ጾታ|ፆታ)[:\s]*(Female|ሴት)/i;
    
    if (malePattern.test(text)) {
      return 'Male';
    }
    if (femalePattern.test(text)) {
      return 'Female';
    }
    
    // Default fallback
    return 'Male';
  }

  /**
   * Extract nationality
   */
  private extractNationality(text: string): string {
    const nationalityPattern = /(?:Nationality|ዜግነት)[:\s]*([A-Za-z\u1200-\u137F]+)/i;
    const match = text.match(nationalityPattern);
    
    if (match && match[1]) {
      return match[1].trim();
    }

    // Default for Ethiopian ID
    return 'Ethiopian';
  }

  /**
   * Extract phone number
   */
  private extractPhoneNumber(text: string): string {
    // Ethiopian phone numbers: 09XXXXXXXX or +2519XXXXXXXX
    const phonePattern = /(?:Phone|ስልክ)[:\s]*((?:\+251|0)?9\d{8})/i;
    const match = text.match(phonePattern);
    
    if (match && match[1]) {
      return this.normalizePhoneNumber(match[1]);
    }

    // Try to find any phone number pattern
    const anyPhonePattern = /((?:\+251|0)?9\d{8})/;
    const anyMatch = text.match(anyPhonePattern);
    
    return anyMatch ? this.normalizePhoneNumber(anyMatch[1]) : '';
  }

  /**
   * Normalize phone number to standard format
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove any non-digit characters except +
    let normalized = phone.replace(/[^\d+]/g, '');
    
    // Convert +251 to 0
    if (normalized.startsWith('+251')) {
      normalized = '0' + normalized.slice(4);
    }
    
    // Ensure it starts with 0
    if (!normalized.startsWith('0') && normalized.length === 9) {
      normalized = '0' + normalized;
    }
    
    return normalized;
  }

  /**
   * Extract region
   */
  private extractRegion(text: string): string {
    const regionPattern = /(?:Region|ክልል)[:\s]*([A-Za-z\u1200-\u137F]+)/i;
    const match = text.match(regionPattern);
    
    return match?.[1]?.trim() || '';
  }

  /**
   * Extract city
   */
  private extractCity(text: string): string {
    const cityPattern = /(?:City|ከተማ|መቀሌ|Mekelle|Addis\s*Ababa)[:\s]*([A-Za-z\u1200-\u137F]+)/i;
    const match = text.match(cityPattern);
    
    return match?.[1]?.trim() || '';
  }

  /**
   * Extract subcity
   */
  private extractSubcity(text: string): string {
    const subcityPattern = /(?:Sub\s*City|ክፍለ\s*ከተማ)[:\s]*([A-Za-z\u1200-\u137F\s]+)/i;
    const match = text.match(subcityPattern);
    
    return match?.[1]?.trim() || '';
  }

  /**
   * Extract FCN (Fayda Card Number)
   */
  private extractFCN(text: string): string {
    // FCN is typically a long number sequence
    const fcnPattern = /(?:FCN|ካርድ\s*ቁጥር)[:\s]*(\d{10,20})/i;
    const match = text.match(fcnPattern);
    
    return match?.[1] || '';
  }

  /**
   * Extract FIN (Fayda Identification Number)
   */
  private extractFIN(text: string): string {
    // FIN format: XXXX XXXX XXXX (4 groups of 4 digits)
    const finPattern = /FIN[:\s]*(\d{4}\s*\d{4}\s*\d{4})/i;
    const match = text.match(finPattern);
    
    if (match && match[1]) {
      // Normalize to format: XXXX XXXX XXXX
      return match[1].replace(/\s+/g, ' ').trim();
    }

    return '';
  }

  /**
   * Extract FAN (Fayda Account Number)
   */
  private extractFAN(text: string): string {
    // FAN is typically a long number
    const fanPattern = /FAN[:\s]*(\d{16,20})/i;
    const match = text.match(fanPattern);
    
    return match?.[1] || '';
  }

  /**
   * Extract serial number
   */
  private extractSerialNumber(text: string): string {
    const snPattern = /(?:SN|Serial|ተከታታይ\s*ቁጥር)[:\s]*(\d{6,10})/i;
    const match = text.match(snPattern);
    
    return match?.[1] || '';
  }

  /**
   * Extract issue date
   */
  private extractIssueDate(text: string): string {
    const issueDatePattern = /(?:Date\s*of\s*Issue|Issue\s*Date|የተሰጠበት\s*ቀን)[:\s]*(\d{2}\/\d{2}\/\d{4})/i;
    const match = text.match(issueDatePattern);
    
    return match?.[1] || '';
  }

  /**
   * Extract expiry date
   */
  private extractExpiryDate(text: string): string {
    const expiryPattern = /(?:Date\s*of\s*Expiry|Expiry|የሚያበቃበት\s*ቀን)[:\s]*(\d{2}\/\d{2}\/\d{4})/i;
    const match = text.match(expiryPattern);
    
    return match?.[1] || '';
  }
}

// Export singleton instance
export const pdfParser = new PDFParserImpl();
export default pdfParser;
