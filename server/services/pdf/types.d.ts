import { EfaydaData, ValidationResult } from '../../types';
export interface ExtractedImages {
    photo: Buffer | null;
    qrCode: Buffer | null;
    barcode: string | null;
    frontCardImage?: Buffer | null;
}
export interface PDFParseResult {
    text: string;
    numpages: number;
    info: Record<string, unknown>;
    metadata: Record<string, unknown>;
    version: string;
}
export interface PDFValidator {
    validateFileExtension(filename: string): ValidationResult;
    validatePDFStructure(buffer: Buffer): Promise<ValidationResult>;
    validateEfaydaDocument(buffer: Buffer): Promise<ValidationResult>;
}
export interface PDFParser {
    parse(buffer: Buffer): Promise<EfaydaData>;
    extractText(buffer: Buffer): Promise<string>;
    extractImages(buffer: Buffer): Promise<ExtractedImages>;
}
export interface DataNormalizer {
    normalizePhoneNumber(phone: string): string;
    normalizeDate(date: string): {
        ethiopian: string;
        gregorian: string;
    };
    normalizeAddress(region: string, city: string, subcity: string): {
        region: string;
        city: string;
        subcity: string;
    };
    normalizeName(name: string): {
        amharic: string;
        english: string;
    };
}
export declare const EFAYDA_MARKERS: {
    REQUIRED_TEXT: string[];
    MIN_TEXT_LENGTH: number;
    EXPECTED_PAGES: number;
};
//# sourceMappingURL=types.d.ts.map