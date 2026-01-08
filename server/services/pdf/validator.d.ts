import { ValidationResult } from '../../types';
import { PDFValidator } from './types';
export declare class PDFValidatorImpl implements PDFValidator {
    /**
     * Validate file extension - only .pdf files are accepted
     * Property 1: File Extension Validation
     */
    validateFileExtension(filename: string): ValidationResult;
    /**
     * Validate PDF structure - check if buffer is a valid PDF
     * Property 2: Invalid PDF Rejection
     */
    validatePDFStructure(buffer: Buffer): Promise<ValidationResult>;
    /**
     * Validate that the PDF is an official eFayda document
     */
    validateEfaydaDocument(buffer: Buffer): Promise<ValidationResult>;
}
export declare const pdfValidator: PDFValidatorImpl;
export default pdfValidator;
//# sourceMappingURL=validator.d.ts.map