import sharp from 'sharp';
import logger from '../../utils/logger';

export interface ImageProcessorOptions {
  width?: number;
  height?: number;
  dpi?: number;
}

export class ImageProcessor {

  /**
   * Mirror an image horizontally (flip)
   */
  async mirror(input: Buffer): Promise<Buffer> {
    try {
      return await sharp(input)
        .flop() // Horizontal flip (mirror)
        .toBuffer();
    } catch (error) {
      logger.error('Image mirror failed:', error);
      throw new Error('Failed to mirror image');
    }
  }

  /**
   * Convert image to grayscale
   */
  async grayscale(input: Buffer): Promise<Buffer> {
    try {
      return await sharp(input)
        .grayscale()
        .toBuffer();
    } catch (error) {
      logger.error('Grayscale conversion failed:', error);
      throw new Error('Failed to convert to grayscale');
    }
  }

  /**
   * Resize image while preserving aspect ratio
   */
  async resize(input: Buffer, width: number, height?: number): Promise<Buffer> {
    try {
      return await sharp(input)
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: false
        })
        .toBuffer();
    } catch (error) {
      logger.error('Image resize failed:', error);
      throw new Error('Failed to resize image');
    }
  }

  /**
   * Resize image to exact dimensions (may crop)
   */
  async resizeExact(input: Buffer, width: number, height: number): Promise<Buffer> {
    try {
      return await sharp(input)
        .resize(width, height, {
          fit: 'cover',
          position: 'center'
        })
        .toBuffer();
    } catch (error) {
      logger.error('Exact resize failed:', error);
      throw new Error('Failed to resize image');
    }
  }

  /**
   * Apply rounded corners mask to photo (for ID card photo)
   */
  async applyRoundedMask(input: Buffer, width: number, height: number, radius: number = 10): Promise<Buffer> {
    try {
      // Create rounded rectangle SVG mask
      const roundedMask = Buffer.from(
        `<svg width="${width}" height="${height}">
          <rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="white"/>
        </svg>`
      );

      // Resize input to target dimensions
      const resized = await sharp(input)
        .resize(width, height, { fit: 'cover', position: 'center' })
        .toBuffer();

      // Apply mask
      return await sharp(resized)
        .composite([{
          input: roundedMask,
          blend: 'dest-in'
        }])
        .png()
        .toBuffer();
    } catch (error) {
      logger.error('Rounded mask failed:', error);
      throw new Error('Failed to apply rounded mask');
    }
  }

  /**
   * Apply oval/ellipse mask to photo (alternative style)
   */
  async applyOvalMask(input: Buffer, width: number, height: number): Promise<Buffer> {
    try {
      // Create ellipse SVG mask
      const ovalMask = Buffer.from(
        `<svg width="${width}" height="${height}">
          <ellipse cx="${width/2}" cy="${height/2}" rx="${width/2}" ry="${height/2}" fill="white"/>
        </svg>`
      );

      // Resize input to target dimensions
      const resized = await sharp(input)
        .resize(width, height, { fit: 'cover', position: 'center' })
        .toBuffer();

      // Apply mask
      return await sharp(resized)
        .composite([{
          input: ovalMask,
          blend: 'dest-in'
        }])
        .png()
        .toBuffer();
    } catch (error) {
      logger.error('Oval mask failed:', error);
      throw new Error('Failed to apply oval mask');
    }
  }

  /**
   * Get image metadata
   */
  async getMetadata(input: Buffer): Promise<sharp.Metadata> {
    return await sharp(input).metadata();
  }

  /**
   * Ensure image is at specified DPI
   */
  async setDpi(input: Buffer, dpi: number = 300): Promise<Buffer> {
    try {
      return await sharp(input)
        .withMetadata({ density: dpi })
        .toBuffer();
    } catch (error) {
      logger.error('Set DPI failed:', error);
      throw new Error('Failed to set image DPI');
    }
  }

  /**
   * Convert image to PNG format
   */
  async toPng(input: Buffer): Promise<Buffer> {
    try {
      return await sharp(input)
        .png()
        .toBuffer();
    } catch (error) {
      logger.error('PNG conversion failed:', error);
      throw new Error('Failed to convert to PNG');
    }
  }

  /**
   * Composite multiple images together
   */
  async composite(
    base: Buffer,
    overlays: Array<{ input: Buffer; left: number; top: number }>
  ): Promise<Buffer> {
    try {
      let image = sharp(base);
      
      const compositeInputs = overlays.map(overlay => ({
        input: overlay.input,
        left: overlay.left,
        top: overlay.top
      }));

      return await image
        .composite(compositeInputs)
        .toBuffer();
    } catch (error) {
      logger.error('Image composite failed:', error);
      throw new Error('Failed to composite images');
    }
  }

  /**
   * Create a blank canvas with specified color
   */
  async createCanvas(width: number, height: number, color: string = '#FFFFFF'): Promise<Buffer> {
    try {
      return await sharp({
        create: {
          width,
          height,
          channels: 4,
          background: color
        }
      })
      .png()
      .toBuffer();
    } catch (error) {
      logger.error('Canvas creation failed:', error);
      throw new Error('Failed to create canvas');
    }
  }

  /**
   * Add text to image using SVG overlay
   */
  async addText(
    input: Buffer,
    text: string,
    x: number,
    y: number,
    options: {
      fontSize?: number;
      fontFamily?: string;
      color?: string;
      fontWeight?: string;
    } = {}
  ): Promise<Buffer> {
    try {
      const metadata = await sharp(input).metadata();
      const width = metadata.width || 800;
      const height = metadata.height || 600;

      const {
        fontSize = 14,
        fontFamily = 'Arial, sans-serif',
        color = '#000000',
        fontWeight = 'normal'
      } = options;

      // Escape special XML characters
      const escapedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

      const textSvg = Buffer.from(
        `<svg width="${width}" height="${height}">
          <text x="${x}" y="${y}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${color}">${escapedText}</text>
        </svg>`
      );

      return await sharp(input)
        .composite([{ input: textSvg, left: 0, top: 0 }])
        .toBuffer();
    } catch (error) {
      logger.error('Add text failed:', error);
      throw new Error('Failed to add text to image');
    }
  }
}

export default ImageProcessor;
