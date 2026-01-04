// Export PDF service components
export { pdfValidator, PDFValidatorImpl } from './validator';
export { pdfParser, PDFParserImpl } from './parser';
export { pdfImageExtractor, PDFImageExtractor } from './imageExtractor';
export { dataNormalizer, DataNormalizerImpl } from './normalizer';
export * from './types';

// Main PDF service that combines all components
import { pdfValidator } from './validator';
import { pdfParser } from './parser';
import { dataNormalizer } from './normalizer';
import { EfaydaData, ValidationResult } from '../../types';
import { logger } from '../../utils/logger';

export class PDFService {
  /**
   * Validate and parse an eFayda PDF document
   */
  async processDocument(
    buffer: Buffer, 
    filename: string
  ): Promise<{ isValid: boolean; data?: EfaydaData; errors: string[] }> {
    // Step 1: Validate file extension
    const extensionResult = pdfValidator.validateFileExtension(filename);
    if (!extensionResult.isValid) {
      return { isValid: false, errors: extensionResult.errors };
    }

    // Step 2: Validate PDF structure
    const structureResult = await pdfValidator.validatePDFStructure(buffer);
    if (!structureResult.isValid) {
      return { isValid: false, errors: structureResult.errors };
    }

    // Step 3: Validate eFayda document
    const efaydaResult = await pdfValidator.validateEfaydaDocument(buffer);
    if (!efaydaResult.isValid) {
      return { isValid: false, errors: efaydaResult.errors };
    }

    try {
      // Step 4: Parse the document
      const rawData = await pdfParser.parse(buffer);

      // Step 5: Normalize the data
      const normalizedData = dataNormalizer.normalizeEfaydaData(rawData);

      logger.info('Successfully processed eFayda document');
      
      return {
        isValid: true,
        data: normalizedData,
        errors: []
      };
    } catch (error) {
      logger.error('Failed to process eFayda document:', error);
      return {
        isValid: false,
        errors: ['Failed to extract data from the document']
      };
    }
  }

  /**
   * Quick validation without full parsing
   */
  async validateDocument(buffer: Buffer, filename: string): Promise<ValidationResult> {
    // Validate file extension
    const extensionResult = pdfValidator.validateFileExtension(filename);
    if (!extensionResult.isValid) {
      return extensionResult;
    }

    // Validate eFayda document
    return pdfValidator.validateEfaydaDocument(buffer);
  }
}

// Export singleton instance
export const pdfService = new PDFService();
export default pdfService;
