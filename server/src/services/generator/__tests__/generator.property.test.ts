import * as fc from 'fast-check';
import sharp from 'sharp';
import { ImageProcessor } from '../imageProcessor';
import { CardRenderer } from '../cardRenderer';
import { CardVariantGenerator } from '../cardVariantGenerator';
import { PDFGenerator } from '../pdfGenerator';
import { EfaydaData } from '../../../types';

describe('ID Generation Service Property Tests', () => {
  let imageProcessor: ImageProcessor;
  let cardRenderer: CardRenderer;
  let pdfGenerator: PDFGenerator;

  beforeAll(() => {
    imageProcessor = new ImageProcessor();
    cardRenderer = new CardRenderer();
    pdfGenerator = new PDFGenerator();
  });

  // Helper to create a simple test image buffer
  async function createTestImage(width: number = 100, height: number = 100): Promise<Buffer> {
    return await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 }
      }
    })
    .png()
    .toBuffer();
  }

  // Arbitrary for valid EfaydaData
  const efaydaDataArb = fc.record({
    fullNameAmharic: fc.string({ minLength: 1, maxLength: 50 }),
    fullNameEnglish: fc.stringOf(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz '.split('')), { minLength: 1, maxLength: 50 }),
    dateOfBirthEthiopian: fc.string({ minLength: 8, maxLength: 12 }),
    dateOfBirthGregorian: fc.string({ minLength: 8, maxLength: 12 }),
    sex: fc.constantFrom('Male', 'Female') as fc.Arbitrary<'Male' | 'Female'>,
    nationality: fc.constant('Ethiopian'),
    phoneNumber: fc.stringOf(fc.constantFrom(...'0123456789'.split('')), { minLength: 10, maxLength: 13 }),
    region: fc.string({ minLength: 1, maxLength: 30 }),
    city: fc.string({ minLength: 1, maxLength: 30 }),
    subcity: fc.string({ minLength: 1, maxLength: 30 }),
    fcn: fc.stringOf(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')), { minLength: 10, maxLength: 20 }),
    fin: fc.stringOf(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')), { minLength: 10, maxLength: 20 }),
    fan: fc.stringOf(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')), { minLength: 10, maxLength: 20 }),
    serialNumber: fc.stringOf(fc.constantFrom(...'0123456789'.split('')), { minLength: 6, maxLength: 12 }),
    issueDate: fc.string({ minLength: 8, maxLength: 12 }),
    expiryDate: fc.string({ minLength: 8, maxLength: 12 }),
    photo: fc.constant(undefined),
    qrCode: fc.constant(undefined),
    barcode: fc.option(fc.string({ minLength: 10, maxLength: 30 }), { nil: undefined })
  });

  /**
   * Property 4: Image Mirroring Round-Trip
   * Mirroring an image twice should return the original image.
   */
  describe('Property 4: Image Mirroring Round-Trip', () => {
    it('should return original image after double mirror', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 50, max: 200 }),
          fc.integer({ min: 50, max: 200 }),
          async (width, height) => {
            const original = await createTestImage(width, height);
            
            // Mirror twice
            const mirrored = await imageProcessor.mirror(original);
            const doubleMirrored = await imageProcessor.mirror(mirrored);
            
            // Get metadata to compare dimensions
            const originalMeta = await sharp(original).metadata();
            const doubleMirroredMeta = await sharp(doubleMirrored).metadata();
            
            // Dimensions should be preserved
            expect(doubleMirroredMeta.width).toBe(originalMeta.width);
            expect(doubleMirroredMeta.height).toBe(originalMeta.height);
            
            // Compare raw pixel data
            const originalRaw = await sharp(original).raw().toBuffer();
            const doubleMirroredRaw = await sharp(doubleMirrored).raw().toBuffer();
            
            expect(doubleMirroredRaw.equals(originalRaw)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 5: Grayscale Conversion Idempotence
   * Converting to grayscale multiple times should produce the same result.
   */
  describe('Property 5: Grayscale Conversion Idempotence', () => {
    it('should produce same result when applied multiple times', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 50, max: 200 }),
          fc.integer({ min: 50, max: 200 }),
          async (width, height) => {
            const original = await createTestImage(width, height);
            
            // Convert to grayscale once
            const grayscale1 = await imageProcessor.grayscale(original);
            
            // Convert to grayscale again
            const grayscale2 = await imageProcessor.grayscale(grayscale1);
            
            // Get raw pixel data
            const gray1Raw = await sharp(grayscale1).raw().toBuffer();
            const gray2Raw = await sharp(grayscale2).raw().toBuffer();
            
            // Should be identical
            expect(gray2Raw.equals(gray1Raw)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: Image Resolution Compliance
   * Generated card images should have correct dimensions for 300 DPI output.
   */
  describe('Property 6: Image Resolution Compliance', () => {
    it('should generate cards with correct dimensions', async () => {
      await fc.assert(
        fc.asyncProperty(
          efaydaDataArb,
          async (data) => {
            const front = await cardRenderer.renderFront(data as EfaydaData, { variant: 'color' });
            const back = await cardRenderer.renderBack(data as EfaydaData, { variant: 'color' });
            
            const frontMeta = await sharp(front).metadata();
            const backMeta = await sharp(back).metadata();
            
            const { width, height } = cardRenderer.getCardDimensions();
            
            // Front card dimensions
            expect(frontMeta.width).toBe(width);
            expect(frontMeta.height).toBe(height);
            
            // Back card dimensions
            expect(backMeta.width).toBe(width);
            expect(backMeta.height).toBe(height);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 7: A4 PDF Page Size
   * Generated PDFs should have A4 dimensions.
   */
  describe('Property 7: A4 PDF Page Size', () => {
    it('should verify A4 dimensions are correct', () => {
      fc.assert(
        fc.property(
          fc.constant(null),
          () => {
            const dimensions = pdfGenerator.getA4Dimensions();
            
            // A4 is 210mm x 297mm
            expect(dimensions.width).toBe(210);
            expect(dimensions.height).toBe(297);
            expect(dimensions.unit).toBe('mm');
            
            // Verify A4 size check function
            // A4 in points: 595.28 x 841.89
            expect(pdfGenerator.isA4Size(595.28, 841.89)).toBe(true);
            expect(pdfGenerator.isA4Size(612, 792)).toBe(false); // Letter size
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: Card variants should have consistent dimensions
   */
  describe('Card Variant Consistency', () => {
    it('should generate color and grayscale variants with same dimensions', async () => {
      await fc.assert(
        fc.asyncProperty(
          efaydaDataArb,
          async (data) => {
            const colorFront = await cardRenderer.renderFront(data as EfaydaData, { variant: 'color' });
            const grayFront = await cardRenderer.renderFront(data as EfaydaData, { variant: 'grayscale' });
            
            const colorMeta = await sharp(colorFront).metadata();
            const grayMeta = await sharp(grayFront).metadata();
            
            expect(colorMeta.width).toBe(grayMeta.width);
            expect(colorMeta.height).toBe(grayMeta.height);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: Resize should preserve aspect ratio when using 'inside' fit
   */
  describe('Resize Aspect Ratio Preservation', () => {
    it('should preserve aspect ratio when resizing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 100, max: 500 }),
          fc.integer({ min: 100, max: 500 }),
          fc.integer({ min: 50, max: 300 }),
          async (origWidth, origHeight, targetWidth) => {
            const original = await createTestImage(origWidth, origHeight);
            const resized = await imageProcessor.resize(original, targetWidth);
            
            const originalMeta = await sharp(original).metadata();
            const resizedMeta = await sharp(resized).metadata();
            
            const originalRatio = (originalMeta.width || 1) / (originalMeta.height || 1);
            const resizedRatio = (resizedMeta.width || 1) / (resizedMeta.height || 1);
            
            // Aspect ratio should be preserved (within small tolerance)
            expect(Math.abs(originalRatio - resizedRatio)).toBeLessThan(0.01);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
