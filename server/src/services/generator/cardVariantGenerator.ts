import sharp from 'sharp';
import { EfaydaData, GeneratedFiles } from '../../types';
import { CardRenderer, TemplateType, getCardDimensions } from './cardRenderer';
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
  private outputDir: string;

  constructor(outputDir?: string) {
    this.cardRenderer = new CardRenderer();
    this.outputDir = outputDir || process.env.TEMP_DIR || 'temp';
  }

  /**
   * Generate all card variants (color/grayscale, normal/mirrored)
   * NOTE: "Mirrored" variants are now the same as normal (no flipping)
   */
  async generateAllVariants(data: EfaydaData, template?: TemplateType): Promise<{
    colorNormal: CardVariant;
    colorMirrored: CardVariant;
    grayscaleNormal: CardVariant;
    grayscaleMirrored: CardVariant;
  }> {
    try {
      // Generate color variants
      const colorFront = await this.cardRenderer.renderFront(data, { variant: 'color', template });
      const colorBack = await this.cardRenderer.renderBack(data, { variant: 'color', template });

      // Generate grayscale variants
      const grayscaleFront = await this.cardRenderer.renderFront(data, { variant: 'grayscale', template });
      const grayscaleBack = await this.cardRenderer.renderBack(data, { variant: 'grayscale', template });

      // Combine front and back into single images (NO mirroring)
      const colorNormalCombined = await this.combineCards(colorFront, colorBack, template);
      const grayscaleNormalCombined = await this.combineCards(grayscaleFront, grayscaleBack, template);

      return {
        colorNormal: {
          front: colorFront,
          back: colorBack,
          combined: colorNormalCombined
        },
        colorMirrored: {
          front: colorFront,
          back: colorBack,
          combined: colorNormalCombined
        },
        grayscaleNormal: {
          front: grayscaleFront,
          back: grayscaleBack,
          combined: grayscaleNormalCombined
        },
        grayscaleMirrored: {
          front: grayscaleFront,
          back: grayscaleBack,
          combined: grayscaleNormalCombined
        }
      };
    } catch (error) {
      logger.error('Failed to generate card variants:', error);
      throw new Error('Failed to generate ID card variants');
    }
  }

  /**
   * Generate mirrored variants only (as per requirements)
   * NOTE: Changed to generate NORMAL (non-mirrored) variants based on user feedback
   */
  async generateMirroredVariants(data: EfaydaData, template?: TemplateType): Promise<{
    colorMirrored: Buffer;
    grayscaleMirrored: Buffer;
  }> {
    try {
      // Generate color cards
      const colorFront = await this.cardRenderer.renderFront(data, { variant: 'color', template });
      const colorBack = await this.cardRenderer.renderBack(data, { variant: 'color', template });

      // Generate grayscale cards
      const grayscaleFront = await this.cardRenderer.renderFront(data, { variant: 'grayscale', template });
      const grayscaleBack = await this.cardRenderer.renderBack(data, { variant: 'grayscale', template });

      // Combine front and back (NO mirroring - return normal images)
      const colorCombined = await this.combineCards(colorFront, colorBack, template);
      const grayscaleCombined = await this.combineCards(grayscaleFront, grayscaleBack, template);

      return {
        colorMirrored: colorCombined,
        grayscaleMirrored: grayscaleCombined
      };
    } catch (error) {
      logger.error('Failed to generate mirrored variants:', error);
      throw new Error('Failed to generate mirrored ID cards');
    }
  }

  /**
   * Combine front and back cards into a single image (side by side like the example PNG)
   * Output is scaled to a reasonable size for delivery
   */
  private async combineCards(front: Buffer, back: Buffer, template?: TemplateType): Promise<Buffer> {
    try {
      const { width, height } = getCardDimensions(template);
      const gap = 30; // Gap between cards
      const totalWidth = width * 2 + gap;

      // Target output width (standard size for all templates)
      const targetWidth = 2054; // Same as Template 1 combined width
      const scale = targetWidth / totalWidth;
      const targetHeight = Math.round(height * scale);
      const scaledGap = Math.round(gap * scale);
      const scaledWidth = Math.round(width * scale);

      // Scale front and back images first
      const scaledFront = await sharp(front)
        .resize(scaledWidth, targetHeight)
        .toBuffer();
      
      const scaledBack = await sharp(back)
        .resize(scaledWidth, targetHeight)
        .toBuffer();

      // Create canvas (horizontal layout like the example PNG)
      const canvas = await sharp({
        create: {
          width: targetWidth,
          height: targetHeight,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      })
      .png()
      .toBuffer();

      // Composite front and back (side by side)
      return await sharp(canvas)
        .composite([
          { input: scaledBack, left: 0, top: 0 },  // Back card on left
          { input: scaledFront, left: scaledWidth + scaledGap, top: 0 }  // Front card on right
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
    jobId: string,
    template?: TemplateType
  ): Promise<GeneratedFiles> {
    try {
      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });

      // Generate mirrored variants
      const { colorMirrored, grayscaleMirrored } = await this.generateMirroredVariants(data, template);

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
