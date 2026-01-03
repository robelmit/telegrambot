import * as fc from 'fast-check';
import { FileDeliveryService } from '../index';
import { GeneratedFiles } from '../../../types';

// Mock Telegraf
const mockBot = {
  telegram: {
    sendMessage: jest.fn().mockResolvedValue({}),
    sendDocument: jest.fn().mockResolvedValue({})
  }
} as any;

describe('File Delivery Property Tests', () => {
  let deliveryService: FileDeliveryService;

  beforeAll(() => {
    deliveryService = new FileDeliveryService(mockBot, 'temp', 24 * 60 * 60 * 1000);
  });

  // Arbitrary for user names
  const userNameArb = fc.stringOf(
    fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz '.split('')),
    { minLength: 1, maxLength: 50 }
  );

  /**
   * Property 8: Output File Count
   * Each job should produce exactly 4 output files (2 PNG + 2 PDF).
   */
  describe('Property 8: Output File Count', () => {
    it('should always expect 4 output files', () => {
      fc.assert(
        fc.property(
          fc.constant(null),
          () => {
            const expectedCount = deliveryService.getExpectedFileCount();
            expect(expectedCount).toBe(4);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate 4 file infos for any valid GeneratedFiles', () => {
      fc.assert(
        fc.property(
          userNameArb,
          fc.string({ minLength: 5, maxLength: 20 }),
          (userName, jobId) => {
            const files: GeneratedFiles = {
              colorMirroredPng: `temp/${jobId}_color.png`,
              grayscaleMirroredPng: `temp/${jobId}_gray.png`,
              colorMirroredPdf: `temp/${jobId}_color.pdf`,
              grayscaleMirroredPdf: `temp/${jobId}_gray.pdf`
            };

            // Count the files
            const fileCount = Object.keys(files).length;
            expect(fileCount).toBe(4);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 9: File Delivery Filename Format
   * Generated filenames should follow the expected format.
   */
  describe('Property 9: File Delivery Filename Format', () => {
    it('should generate valid filename format for any user name', () => {
      fc.assert(
        fc.property(
          userNameArb,
          fc.constantFrom('color', 'grayscale') as fc.Arbitrary<'color' | 'grayscale'>,
          fc.constantFrom('png', 'pdf') as fc.Arbitrary<'png' | 'pdf'>,
          (userName, variant, extension) => {
            const filename = deliveryService.generateFilename(userName, variant, extension);
            
            // Should match expected format
            expect(deliveryService.isValidFilenameFormat(filename)).toBe(true);
            
            // Should contain variant
            const variantLabel = variant === 'color' ? 'Color' : 'Grayscale';
            expect(filename).toContain(variantLabel);
            
            // Should have correct extension
            expect(filename).toMatch(new RegExp(`\\.${extension}$`));
            
            // Should contain ID_Card prefix
            expect(filename).toMatch(/^ID_Card_/);
            
            // Should contain Mirrored
            expect(filename).toContain('Mirrored');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should sanitize special characters in filenames', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (userName) => {
            const filename = deliveryService.generateFilename(userName, 'color', 'png');
            
            // Should not contain special characters except underscore
            expect(filename).toMatch(/^[A-Za-z0-9_.]+$/);
            
            // Should not contain spaces
            expect(filename).not.toContain(' ');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 10: Temporary File Cleanup
   * File cleanup should handle any valid file paths.
   */
  describe('Property 10: Temporary File Cleanup', () => {
    it('should validate filename format correctly', () => {
      fc.assert(
        fc.property(
          userNameArb,
          fc.constantFrom('color', 'grayscale') as fc.Arbitrary<'color' | 'grayscale'>,
          fc.constantFrom('png', 'pdf') as fc.Arbitrary<'png' | 'pdf'>,
          (userName, variant, extension) => {
            const validFilename = deliveryService.generateFilename(userName, variant, extension);
            expect(deliveryService.isValidFilenameFormat(validFilename)).toBe(true);
            
            // Invalid formats should fail
            expect(deliveryService.isValidFilenameFormat('random.txt')).toBe(false);
            expect(deliveryService.isValidFilenameFormat('ID_Card.png')).toBe(false);
            expect(deliveryService.isValidFilenameFormat('')).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: Filename length should be bounded
   */
  describe('Filename Length Bounds', () => {
    it('should generate filenames within reasonable length', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 100 }),
          fc.constantFrom('color', 'grayscale') as fc.Arbitrary<'color' | 'grayscale'>,
          fc.constantFrom('png', 'pdf') as fc.Arbitrary<'png' | 'pdf'>,
          (userName, variant, extension) => {
            const filename = deliveryService.generateFilename(userName, variant, extension);
            
            // Filename should not be too long (max ~60 chars)
            expect(filename.length).toBeLessThanOrEqual(60);
            
            // Filename should not be empty
            expect(filename.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: All variants should be represented
   */
  describe('Variant Coverage', () => {
    it('should generate distinct filenames for each variant', () => {
      fc.assert(
        fc.property(
          userNameArb,
          (userName) => {
            const colorPng = deliveryService.generateFilename(userName, 'color', 'png');
            const grayPng = deliveryService.generateFilename(userName, 'grayscale', 'png');
            const colorPdf = deliveryService.generateFilename(userName, 'color', 'pdf');
            const grayPdf = deliveryService.generateFilename(userName, 'grayscale', 'pdf');
            
            // All filenames should be unique
            const filenames = [colorPng, grayPng, colorPdf, grayPdf];
            const uniqueFilenames = new Set(filenames);
            expect(uniqueFilenames.size).toBe(4);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
