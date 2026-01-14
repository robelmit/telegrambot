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
   * Generate color card variants (normal and mirrored for printing)
   */
  async generateColorVariants(data: EfaydaData, template?: TemplateType): Promise<{
    normalCombined: Buffer;
    mirroredCombined: Buffer;
  }> {
    try {
      // Generate color cards
      const colorFront = await this.cardRenderer.renderFront(data, { variant: 'color', template });
      const colorBack = await this.cardRenderer.renderBack(data, { variant: 'color', template });

      // Normal: front and back side by side (back | front)
      const normalCombined = await this.combineCards(colorFront, colorBack, template, false);
      
      // Mirrored: back is flipped horizontally for printing (back_flipped | front)
      const mirroredCombined = await this.combineCards(colorFront, colorBack, template, true);

      logger.info('Generated color card variants (normal + mirrored for printing)');

      return {
        normalCombined,
        mirroredCombined
      };
    } catch (error) {
      logger.error('Failed to generate color variants:', error);
      throw new Error('Failed to generate ID cards');
    }
  }

  /**
   * Combine front and back cards into a single image (side by side)
   * @param mirrored - If true, flip both cards horizontally for printing
   * Output maintains 300 DPI for proper printing
   * Standard card size: 8.67cm × 5.47cm = 1024×646px at 300 DPI
   * 
   * BLEED AREA: Each card has bleed on ALL edges (3mm = ~35px at 300 DPI)
   * so when cut, there's card content at edges instead of white paper
   */
  private async combineCards(front: Buffer, back: Buffer, template?: TemplateType, mirrored: boolean = false): Promise<Buffer> {
    try {
      const { width, height } = getCardDimensions(template);
      const gap = 80; // Good spacing between cards for cutting
      const padding = 30; // Padding around the entire image
      
      // Bleed area: 3mm = ~35px at 300 DPI (standard print bleed)
      // Applied to ALL edges of EACH card
      const bleed = 35;

      // Process cards (flip if mirrored)
      let processedFront: Buffer;
      let processedBack: Buffer;
      
      if (mirrored) {
        processedFront = await sharp(front).flop().toBuffer();
        processedBack = await sharp(back).flop().toBuffer();
      } else {
        processedFront = front;
        processedBack = back;
      }

      // Add bleed to each card individually
      const frontWithBleed = await sharp(processedFront)
        .extend({
          top: bleed,
          bottom: bleed,
          left: bleed,
          right: bleed,
          extendWith: 'mirror'
        })
        .toBuffer();
      
      const backWithBleed = await sharp(processedBack)
        .extend({
          top: bleed,
          bottom: bleed,
          left: bleed,
          right: bleed,
          extendWith: 'mirror'
        })
        .toBuffer();

      // Card dimensions with bleed
      const cardWithBleedWidth = width + bleed * 2;
      const cardWithBleedHeight = height + bleed * 2;
      
      // Total dimensions
      const totalWidth = cardWithBleedWidth * 2 + gap + (padding * 2);
      const totalHeight = cardWithBleedHeight + (padding * 2);

      // Create canvas with white background
      const canvas = await sharp({
        create: {
          width: totalWidth,
          height: totalHeight,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      }).png().toBuffer();

      // Composite cards with bleed (back on left, front on right)
      return await sharp(canvas)
        .composite([
          { input: backWithBleed, left: padding, top: padding },
          { input: frontWithBleed, left: padding + cardWithBleedWidth + gap, top: padding }
        ])
        .withMetadata({ density: 300 })
        .png({
          compressionLevel: 9,
          effort: 10
        })
        .toBuffer();
    } catch (error) {
      logger.error('Failed to combine cards:', error);
      throw new Error('Failed to combine front and back cards');
    }
  }

  /**
   * Save generated files to disk and return file paths
   * Generates: normal PNG, mirrored PNG, normal PDF, mirrored PDF (all color)
   */
  async saveToFiles(
    data: EfaydaData,
    jobId: string,
    template?: TemplateType
  ): Promise<GeneratedFiles> {
    try {
      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });

      // Generate color variants (normal and mirrored)
      const { normalCombined, mirroredCombined } = await this.generateColorVariants(data, template);

      // Generate safe filename from user name
      const safeName = this.sanitizeFilename(data.fullNameEnglish);

      // Define file paths
      const colorNormalPngPath = path.join(this.outputDir, `${jobId}_${safeName}_normal.png`);
      const colorMirroredPngPath = path.join(this.outputDir, `${jobId}_${safeName}_mirrored.png`);

      // Save PNG files (no compression - templates already optimized)
      await this.savePng(normalCombined, colorNormalPngPath);
      await this.savePng(mirroredCombined, colorMirroredPngPath);

      // PDF paths will be generated by PDFGenerator
      const colorNormalPdfPath = path.join(this.outputDir, `${jobId}_${safeName}_normal_A4.pdf`);
      const colorMirroredPdfPath = path.join(this.outputDir, `${jobId}_${safeName}_mirrored_A4.pdf`);

      return {
        colorNormalPng: colorNormalPngPath,
        colorMirroredPng: colorMirroredPngPath,
        colorNormalPdf: colorNormalPdfPath,
        colorMirroredPdf: colorMirroredPdfPath
      };
    } catch (error) {
      logger.error('Failed to save files:', error);
      throw new Error('Failed to save generated files');
    }
  }

  /**
   * Save PNG with good compression - templates are already optimized
   * Embed sRGB color profile for consistent printing
   */
  private async savePng(imageBuffer: Buffer, outputPath: string): Promise<void> {
    try {
      const result = await sharp(imageBuffer)
        .withMetadata({ density: 300 })
        .toColorspace('srgb')
        .png({
          compressionLevel: 9,
          effort: 10,
          palette: false
        })
        .toBuffer();

      await fs.writeFile(outputPath, result);
      
      const finalSize = Math.round(result.length / 1024);
      logger.info(`Saved PNG: ${outputPath} (${finalSize}KB)`);
    } catch (error) {
      logger.error('PNG save failed:', error);
      // Fallback to direct write
      await fs.writeFile(outputPath, imageBuffer);
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
