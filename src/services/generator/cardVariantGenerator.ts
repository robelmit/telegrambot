import sharp from 'sharp';
import { EfaydaData, GeneratedFiles } from '../../types';
import { CardRenderer, TemplateType, getCardDimensions } from './cardRenderer';
import logger from '../../utils/logger';
import path from 'path';
import fs from 'fs/promises';

// Target file size for PNG compression (300KB)
const TARGET_FILE_SIZE_KB = 300;
const TARGET_FILE_SIZE_BYTES = TARGET_FILE_SIZE_KB * 1024;

// sRGB ICC profile for consistent color across printers
// This is a minimal sRGB profile that ensures colors are interpreted consistently
const SRGB_ICC_PROFILE = 'sRGB';

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
   * Generate card variants (color and grayscale)
   * Note: Despite the method name, these are NOT mirrored - kept for backward compatibility
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

      // Combine front and back (NOT mirrored - normal orientation)
      const colorCombined = await this.combineCards(colorFront, colorBack, template);
      const grayscaleCombined = await this.combineCards(grayscaleFront, grayscaleBack, template);

      logger.info('Generated card variants (color + grayscale, normal orientation)');

      return {
        colorMirrored: colorCombined,
        grayscaleMirrored: grayscaleCombined
      };
    } catch (error) {
      logger.error('Failed to generate card variants:', error);
      throw new Error('Failed to generate ID cards');
    }
  }

  /**
   * Combine front and back cards into a single image (side by side like the example PNG)
   * Output is scaled to a reasonable size for delivery
   * Increased gap for better transparency handling and print cutting
   * Standard card size: 8.67cm × 5.47cm = 1024×646px at 300 DPI
   */
  private async combineCards(front: Buffer, back: Buffer, template?: TemplateType): Promise<Buffer> {
    try {
      const { width, height } = getCardDimensions(template);
      const gap = 60; // Increased gap between cards for better transparency/cutting space
      const padding = 20; // Padding around the entire image
      const totalWidth = width * 2 + gap + (padding * 2);
      const totalHeight = height + (padding * 2);

      // Standard output dimensions (2 cards + gap + padding)
      // At 1024px per card: 1024*2 + 60 + 40 = 2148px
      const targetWidth = 2148;
      const scale = targetWidth / totalWidth;
      const targetHeight = Math.round(totalHeight * scale);
      const scaledGap = Math.round(gap * scale);
      const scaledPadding = Math.round(padding * scale);
      const scaledWidth = Math.round(width * scale);
      const scaledCardHeight = Math.round(height * scale);

      // Scale front and back images first
      const scaledFront = await sharp(front)
        .resize(scaledWidth, scaledCardHeight)
        .toBuffer();
      
      const scaledBack = await sharp(back)
        .resize(scaledWidth, scaledCardHeight)
        .toBuffer();

      // Create canvas with transparent background for better transparency handling
      const canvas = await sharp({
        create: {
          width: targetWidth,
          height: targetHeight,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
        }
      })
      .png()
      .toBuffer();

      // Composite front and back (side by side with padding)
      return await sharp(canvas)
        .composite([
          { input: scaledBack, left: scaledPadding, top: scaledPadding },  // Back card on left with padding
          { input: scaledFront, left: scaledPadding + scaledWidth + scaledGap, top: scaledPadding }  // Front card on right
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

      // Save PNG files with compression targeting ~300KB
      await this.saveCompressedPng(colorMirrored, colorMirroredPngPath);
      await this.saveCompressedPng(grayscaleMirrored, grayscaleMirroredPngPath);

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
   * Save PNG with compression targeting ~300KB file size
   * Uses adaptive compression level based on resulting file size
   * Embeds sRGB color profile for consistent printing across different printers
   */
  private async saveCompressedPng(imageBuffer: Buffer, outputPath: string): Promise<void> {
    try {
      // First try with high compression (level 9) and sRGB color profile
      let compressed = await sharp(imageBuffer)
        .withMetadata({ 
          density: 300,
          // Embed sRGB ICC profile for consistent color reproduction
          icc: SRGB_ICC_PROFILE
        })
        .toColorspace('srgb') // Ensure sRGB color space
        .png({
          compressionLevel: 9,
          palette: false, // Don't use palette - preserves color accuracy
          effort: 10
        })
        .toBuffer();

      // If still too large, try reducing quality while keeping color accuracy
      if (compressed.length > TARGET_FILE_SIZE_BYTES) {
        logger.info(`PNG size ${Math.round(compressed.length / 1024)}KB > ${TARGET_FILE_SIZE_KB}KB, applying more compression...`);
        
        // Try with palette but more colors for better quality
        compressed = await sharp(imageBuffer)
          .withMetadata({ 
            density: 300,
            icc: SRGB_ICC_PROFILE
          })
          .toColorspace('srgb')
          .png({
            compressionLevel: 9,
            palette: true,
            quality: 85, // Higher quality for better colors
            effort: 10,
            colors: 256
          })
          .toBuffer();
      }

      // If still too large, resize slightly while maintaining aspect ratio
      if (compressed.length > TARGET_FILE_SIZE_BYTES) {
        const metadata = await sharp(imageBuffer).metadata();
        const scaleFactor = Math.sqrt(TARGET_FILE_SIZE_BYTES / compressed.length) * 0.95;
        const newWidth = Math.round((metadata.width || 2054) * scaleFactor);
        
        logger.info(`PNG still ${Math.round(compressed.length / 1024)}KB, resizing to ${newWidth}px width...`);
        
        compressed = await sharp(imageBuffer)
          .resize(newWidth)
          .withMetadata({ 
            density: 300,
            icc: SRGB_ICC_PROFILE
          })
          .toColorspace('srgb')
          .png({
            compressionLevel: 9,
            effort: 10
          })
          .toBuffer();
      }

      // Write to file
      await fs.writeFile(outputPath, compressed);
      
      const finalSize = Math.round(compressed.length / 1024);
      logger.info(`Saved compressed PNG with sRGB profile: ${outputPath} (${finalSize}KB)`);
    } catch (error) {
      logger.error('PNG compression failed, saving uncompressed:', error);
      // Fallback to uncompressed with sRGB
      await sharp(imageBuffer)
        .withMetadata({ density: 300 })
        .toColorspace('srgb')
        .png()
        .toFile(outputPath);
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
