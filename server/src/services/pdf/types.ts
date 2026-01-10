import { EfaydaData, ValidationResult } from '../../types';

export interface ExtractedImages {
  photo: Buffer | null;
  qrCode: Buffer | null;
  barcode: string | null;
  frontCardImage?: Buffer | null; // Image 3 for OCR expiry extraction
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
  normalizeDate(date: string): { ethiopian: string; gregorian: string };
  normalizeAddress(region: string, city: string, subcity: string): { region: string; city: string; subcity: string };
  normalizeName(name: string): { amharic: string; english: string };
}

// eFayda PDF structure markers
export const EFAYDA_MARKERS = {
  // Text markers that should be present in eFayda documents
  REQUIRED_TEXT: [
    'Ethiopian Digital ID Card',
    'National ID',
    'eFayda',
    'FIN',
    'FAN'
  ],
  // Minimum text length for valid eFayda document
  MIN_TEXT_LENGTH: 100,
  // Expected number of pages
  EXPECTED_PAGES: 1
};
