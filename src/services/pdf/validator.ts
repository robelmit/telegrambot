import pdfParse from 'pdf-parse';
import { ValidationResult } from '../../types';
import { PDFValidator, EFAYDA_MARKERS } from './types';
import { logger } from '../../utils/logger';

export class PDFValidatorImpl implements PDFValidator {
  /**
   * Validate file extension - only .pdf files are accepted
   * Property 1: File Extension Validation
   */
  validateFileExtension(filename: string): ValidationResult {
    if (!filename) {
      return {
        isValid: false,
        errors: ['Filename is required']
      };
    }

    const extension = filename.toLowerCase().split('.').pop();
    
    if (extension !== 'pdf') {
      return {
        isValid: false,
        errors: [`Invalid file extension: .${extension}. Only .pdf files are accepted.`]
      };
    }

    return {
      isValid: true,
      errors: []
    };
  }

  /**
   * Validate PDF structure - check if buffer is a valid PDF
   * Property 2: Invalid PDF Rejection
   */
  async validatePDFStructure(buffer: Buffer): Promise<ValidationResult> {
    const errors: string[] = [];

    // Check if buffer is provided
    if (!buffer || buffer.length === 0) {
      return {
        isValid: false,
        errors: ['Empty or invalid buffer provided']
      };
    }

    // Check PDF magic bytes (%PDF-)
    const header = buffer.slice(0, 5).toString('ascii');
    if (!header.startsWith('%PDF-')) {
      return {
        isValid: false,
        errors: ['Invalid PDF format: Missing PDF header']
      };
    }

    try {
      // Try to parse the PDF
      const data = await pdfParse(buffer, {
        max: 1 // Only parse first page for validation
      });

      // Check if parsing was successful
      if (!data) {
        errors.push('Failed to parse PDF structure');
      }

      // Check number of pages
      if (data.numpages < 1) {
        errors.push('PDF has no pages');
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      logger.error('PDF structure validation error:', error);
      return {
        isValid: false,
        errors: ['Corrupted or invalid PDF file']
      };
    }
  }

  /**
   * Validate that the PDF is an official eFayda document
   */
  async validateEfaydaDocument(buffer: Buffer): Promise<ValidationResult> {
    const errors: string[] = [];

    // First validate PDF structure
    const structureResult = await this.validatePDFStructure(buffer);
    if (!structureResult.isValid) {
      return structureResult;
    }

    try {
      const data = await pdfParse(buffer);
      const text = data.text || '';

      // Check minimum text length
      if (text.length < EFAYDA_MARKERS.MIN_TEXT_LENGTH) {
        errors.push('Document appears to be empty or has insufficient content');
      }

      // Check for required eFayda markers
      // At least some of these should be present
      const foundMarkers = EFAYDA_MARKERS.REQUIRED_TEXT.filter(marker => 
        text.toLowerCase().includes(marker.toLowerCase())
      );

      if (foundMarkers.length < 2) {
        errors.push('Document does not appear to be an official eFayda document');
      }

      // Check for expected number of pages
      if (data.numpages !== EFAYDA_MARKERS.EXPECTED_PAGES) {
        // This is a warning, not an error - some documents might have multiple pages
        logger.warn(`eFayda document has ${data.numpages} pages, expected ${EFAYDA_MARKERS.EXPECTED_PAGES}`);
      }

      // Check for key identifiers
      const hasIdentifiers = 
        /FIN\s*[:\s]*\d{4}\s*\d{4}\s*\d{4}/i.test(text) ||
        /FAN\s*[:\s]*\d+/i.test(text) ||
        /\d{10,20}/.test(text); // Long number sequences (FCN, FIN, FAN)

      if (!hasIdentifiers) {
        errors.push('Document is missing required identification numbers');
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      logger.error('eFayda document validation error:', error);
      return {
        isValid: false,
        errors: ['Failed to validate eFayda document']
      };
    }
  }
}

// Export singleton instance
export const pdfValidator = new PDFValidatorImpl();
export default pdfValidator;
