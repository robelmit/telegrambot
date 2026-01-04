import sharp from 'sharp';
import { EfaydaData, GeneratedFiles } from '../../types';
import { CardRenderer } from './cardRenderer';
import { ImageProcessor } from './imageProcessor';
import logger from '../../utils/logger';
import path from 'path';
import fs from 'fs/promises';

export interface CardVariant {
  front: Buffer;
  back: Buffer;
  combined: Buffer;
}

export class CardVariantGenerator {
  private cardRenderer: CardRenderer;
  private imageProcessor: ImageProcessor;
  private outputDir: string;

  constructor(outputDir?: string) {
    this.cardRenderer = new CardRenderer();
    this.imageProcessor = new ImageProcessor();
    this.outputDir = outputDir || process.env.TEMP_DIR || 'temp';
  }

  /**
   * Generate all card variants (color/grayscale, normal/mirrored)
   */
  async generateAllVariants(data: EfaydaData): Promise<{
    colorNormal: CardVariant;
    colorMirrored: CardVariant;
    grayscaleNormal: CardVariant;
    grayscaleMirrored: CardVariant;
  }> {
    try {
      // Generate color variants
      const colorFront = await this.cardRenderer.renderFront(data, { variant: 'color' });
      const colorBack = await this.cardRenderer.renderBack(data, { variant: 'color' });

      // Generate grayscale variants
      const grayscaleFront = await this.cardRenderer.renderFront(data, { variant: 'grayscale' });
      const grayscaleBack = await this.cardRenderer.renderBack(data, { variant: 'grayscale' });

      // Create mirrored versions
      const colorFrontMirrored = await this.imageProcessor.mirror(colorFront);
      const colorBackMirrored = await this.imageProcessor.mirror(colorBack);
      const grayscaleFrontMirrored = await this.imageProcessor.mirror(grayscaleFront);
      const grayscaleBackMirrored = await this.imageProcessor.mirror(grayscaleBack);

      // Combine front and back into single images
      const colorNormalCombined = await this.combineCards(colorFront, colorBack);
      const colorMirroredCombined = await this.combineCards(colorFrontMirrored, colorBackMirrored);
      const grayscaleNormalCombined = await this.combineCards(grayscaleFront, grayscaleBack);
      const grayscaleMirroredCombined = await this.combineCards(grayscaleFrontMirrored, grayscaleBackMirrored);

      return {
        colorNormal: {
          front: colorFront,
          back: colorBack,
          combined: colorNormalCombined
        },
        colorMirrored: {
          front: colorFrontMirrored,
          back: colorBackMirrored,
          combined: colorMirroredCombined
        },
        grayscaleNormal: {
          front: grayscaleFront,
          back: grayscaleBack,
          combined: grayscaleNormalCombined
        },
        grayscaleMirrored: {
          front: grayscaleFrontMirrored,
          back: grayscaleBackMirrored,
          combined: grayscaleMirroredCombined
        }
      };
    } catch (error) {
      logger.error('Failed to generate card variants:', error);
      throw new Error('Failed to generate ID card variants');
    }
  }

  /**
   * Generate mirrored variants only (as per requirements)
   */
  async generateMirroredVariants(data: EfaydaData): Promise<{
    colorMirrored: Buffer;
    grayscaleMirrored: Buffer;
  }> {
    try {
      // Generate color cards
      const colorFront = await this.cardRenderer.renderFront(data, { variant: 'color' });
      const colorBack = await this.cardRenderer.renderBack(data, { variant: 'color' });

      // Generate grayscale cards
      const grayscaleFront = await this.cardRenderer.renderFront(data, { variant: 'grayscale' });
      const grayscaleBack = await this.cardRenderer.renderBack(data, { variant: 'grayscale' });

      // Combine and mirror
      const colorCombined = await this.combineCards(colorFront, colorBack);
      const grayscaleCombined = await this.combineCards(grayscaleFront, grayscaleBack);

      const colorMirrored = await this.imageProcessor.mirror(colorCombined);
      const grayscaleMirrored = await this.imageProcessor.mirror(grayscaleCombined);

      return {
        colorMirrored,
        grayscaleMirrored
      };
    } catch (error) {
      logger.error('Failed to generate mirrored variants:', error);
      throw new Error('Failed to generate mirrored ID cards');
    }
  }

  /**
   * Combine front and back cards into a single image (stacked vertically for better printing)
   */
  private async combineCards(front: Buffer, back: Buffer): Promise<Buffer> {
    try {
      const { width, height } = this.cardRenderer.getCardDimensions();
      const gap = 30; // Gap between cards
      const totalHeight = height * 2 + gap;

      // Create canvas (vertical layout for A4 printing)
      const canvas = await sharp({
        create: {
          width: width,
          height: totalHeight,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      })
      .png()
      .toBuffer();

      // Composite front and back (stacked)
      return await sharp(canvas)
        .composite([
          { input: front, left: 0, top: 0 },
          { input: back, left: 0, top: height + gap }
        ])
        .png()
        .toBuffer();
    } catch (error) {
      logger.error('Failed to combine cards:', error);
      throw new Error('Failed to combine front and back cards');
    }
  }

  /**
   * Save generated files to disk and return file paths
   */
  async saveToFiles(
    data: EfaydaData,
    jobId: string
  ): Promise<GeneratedFiles> {
    try {
      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });

      // Generate mirrored variants
      const { colorMirrored, grayscaleMirrored } = await this.generateMirroredVariants(data);

      // Generate safe filename from user name
      const safeName = this.sanitizeFilename(data.fullNameEnglish);

      // Define file paths
      const colorMirroredPngPath = path.join(this.outputDir, `${jobId}_${safeName}_color_mirrored.png`);
      const grayscaleMirroredPngPath = path.join(this.outputDir, `${jobId}_${safeName}_grayscale_mirrored.png`);

      // Save PNG files with 300 DPI
      await sharp(colorMirrored)
        .withMetadata({ density: 300 })
        .png()
        .toFile(colorMirroredPngPath);

      await sharp(grayscaleMirrored)
        .withMetadata({ density: 300 })
        .png()
        .toFile(grayscaleMirroredPngPath);

      // PDF paths will be generated by PDFGenerator
      const colorMirroredPdfPath = path.join(this.outputDir, `${jobId}_${safeName}_color_mirrored_A4.pdf`);
      const grayscaleMirroredPdfPath = path.join(this.outputDir, `${jobId}_${safeName}_grayscale_mirrored_A4.pdf`);

      return {
        colorMirroredPng: colorMirroredPngPath,
        grayscaleMirroredPng: grayscaleMirroredPngPath,
        colorMirroredPdf: colorMirroredPdfPath,
        grayscaleMirroredPdf: grayscaleMirroredPdfPath
      };
    } catch (error) {
      logger.error('Failed to save files:', error);
      throw new Error('Failed to save generated files');
    }
  }

  /**
   * Sanitize filename to remove invalid characters
   */
  private sanitizeFilename(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
  }

  /**
   * Get image resolution/DPI
   */
  async getImageResolution(imageBuffer: Buffer): Promise<{ width: number; height: number; dpi: number }> {
    const metadata = await sharp(imageBuffer).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      dpi: metadata.density || 72
    };
  }
}

export default CardVariantGenerator;
