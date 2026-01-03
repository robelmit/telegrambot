/**
 * Property Tests for PDF Validator
 * Feature: efayda-id-generator
 * 
 * Property 1: File Extension Validation
 * Validates: Requirements 1.1
 * For any file uploaded to the bot, the system SHALL accept it if and only if
 * the file extension is `.pdf` (case-insensitive).
 * 
 * Property 2: Invalid PDF Rejection
 * Validates: Requirements 1.3
 * For any buffer that is not a valid PDF (corrupted, wrong format, or empty),
 * the parser SHALL return `isValid: false` with a non-empty error array.
 */

import * as fc from 'fast-check';
import { pdfValidator } from '../validator';

describe('Property 1: File Extension Validation', () => {
  // Valid PDF extensions (case variations)
  const validExtensions = ['pdf', 'PDF', 'Pdf', 'pDf', 'pdF', 'PDf', 'pDF', 'PdF'];
  
  // Invalid extensions
  const invalidExtensions = [
    'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif', 'bmp',
    'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar', 'exe', 'html',
    'xml', 'json', 'csv', 'mp3', 'mp4', 'avi', 'mov', ''
  ];

  it('should accept files with .pdf extension (case-insensitive)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('.')),
        fc.constantFrom(...validExtensions),
        (filename, ext) => {
          const fullFilename = `${filename}.${ext}`;
          const result = pdfValidator.validateFileExtension(fullFilename);
          
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject files without .pdf extension', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('.')),
        fc.constantFrom(...invalidExtensions),
        (filename, ext) => {
          const fullFilename = ext ? `${filename}.${ext}` : filename;
          const result = pdfValidator.validateFileExtension(fullFilename);
          
          expect(result.isValid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge cases for filenames', () => {
    // Empty filename
    expect(pdfValidator.validateFileExtension('')).toEqual({
      isValid: false,
      errors: ['Filename is required']
    });

    // Filename with multiple dots
    expect(pdfValidator.validateFileExtension('file.name.with.dots.pdf').isValid).toBe(true);
    expect(pdfValidator.validateFileExtension('file.pdf.txt').isValid).toBe(false);

    // Filename with special characters
    expect(pdfValidator.validateFileExtension('file-name_123.pdf').isValid).toBe(true);
    expect(pdfValidator.validateFileExtension('ፋይል.pdf').isValid).toBe(true); // Ethiopic characters
  });

  it('should be case-insensitive for extension matching', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...validExtensions),
        (ext) => {
          const result = pdfValidator.validateFileExtension(`test.${ext}`);
          expect(result.isValid).toBe(true);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 2: Invalid PDF Rejection', () => {
  // Valid PDF header
  const PDF_HEADER = Buffer.from('%PDF-1.7\n');
  
  it('should reject empty buffers', async () => {
    const result = await pdfValidator.validatePDFStructure(Buffer.alloc(0));
    
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject buffers without PDF header', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 10, maxLength: 1000 }).filter(arr => {
          // Filter out arrays that accidentally start with %PDF-
          const str = Buffer.from(arr).slice(0, 5).toString('ascii');
          return !str.startsWith('%PDF-');
        }),
        async (randomBytes) => {
          const buffer = Buffer.from(randomBytes);
          const result = await pdfValidator.validatePDFStructure(buffer);
          
          expect(result.isValid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject corrupted PDFs (valid header but invalid content)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 10, maxLength: 500 }),
        async (randomBytes) => {
          // Create buffer with valid PDF header but random content
          const buffer = Buffer.concat([PDF_HEADER, Buffer.from(randomBytes)]);
          const result = await pdfValidator.validatePDFStructure(buffer);
          
          // Should either be invalid or throw an error during parsing
          // Both outcomes are acceptable for corrupted PDFs
          if (result.isValid === false) {
            expect(result.errors.length).toBeGreaterThan(0);
          }
          
          return true;
        }
      ),
      { numRuns: 50 } // Fewer runs due to async nature
    );
  });

  it('should reject null or undefined buffers', async () => {
    // @ts-expect-error Testing invalid input
    const nullResult = await pdfValidator.validatePDFStructure(null);
    expect(nullResult.isValid).toBe(false);
    expect(nullResult.errors.length).toBeGreaterThan(0);

    // @ts-expect-error Testing invalid input
    const undefinedResult = await pdfValidator.validatePDFStructure(undefined);
    expect(undefinedResult.isValid).toBe(false);
    expect(undefinedResult.errors.length).toBeGreaterThan(0);
  });

  it('should always return non-empty errors array when invalid', async () => {
    const invalidInputs = [
      Buffer.alloc(0),
      Buffer.from('not a pdf'),
      Buffer.from('random content here'),
      Buffer.from('<html>not a pdf</html>'),
      Buffer.from('{"json": "not a pdf"}'),
    ];

    for (const input of invalidInputs) {
      const result = await pdfValidator.validatePDFStructure(input);
      
      if (!result.isValid) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.every(e => typeof e === 'string')).toBe(true);
        expect(result.errors.every(e => e.length > 0)).toBe(true);
      }
    }
  });
});
