export { pdfValidator, PDFValidatorImpl } from './validator';
export { pdfParser, PDFParserImpl } from './parser';
export { pdfImageExtractor, PDFImageExtractor } from './imageExtractor';
export { dataNormalizer, DataNormalizerImpl } from './normalizer';
export * from './types';
import { EfaydaData, ValidationResult } from '../../types';
export declare class PDFService {
    /**
     * Validate and parse an eFayda PDF document
     */
    processDocument(buffer: Buffer, filename: string): Promise<{
        isValid: boolean;
        data?: EfaydaData;
        errors: string[];
    }>;
    /**
     * Quick validation without full parsing
     */
    validateDocument(buffer: Buffer, filename: string): Promise<ValidationResult>;
}
export declare const pdfService: PDFService;
export default pdfService;
//# sourceMappingURL=index.d.ts.map