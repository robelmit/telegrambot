/**
 * Card Renderer - EXACTLY like test-pdf-full.ts from commit a8d0b98
 */
import { createCanvas, loadImage, registerFont, Canvas, CanvasRenderingContext2D } from 'canvas';
import { EfaydaData } from '../../types';
import logger from '../../utils/logger';
import path from 'path';
import fs from 'fs';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import sharp from 'sharp';

// Template type
export type TemplateType = 'template0' | 'template1' | 'template2';

// Load layout configs
const layoutConfigs: Record<TemplateType, any> = {
  template0: JSON.parse(fs.readFileSync(path.join(__dirname, '../../config/cardLayout.json'), 'utf-8')),
  template1: JSON.parse(fs.readFileSync(path.join(__dirname, '../../config/cardLayout1.json'), 'utf-8')),
  template2: JSON.parse(fs.readFileSync(path.join(__dirname, '../../config/cardLayout2.json'), 'utf-8'))
};

// Default layout for backward compatibility
const layout = layoutConfigs.template0;
const { dimensions } = layout;

export interface CardRenderOptions {
  variant: 'color' | 'grayscale';
  dpi?: number;
  template?: TemplateType;
}

const FONTS_DIR = path.join(process.cwd(), 'assets/fonts');
const TEMPLATE_DIR = path.join(process.cwd(), 'assets');

let fontsRegistered = false;

export function registerFonts(): void {
  if (fontsRegistered) return;
  try {
    const fontFiles = [
      { file: 'nyala.ttf', family: 'Nyala', weight: 'normal' },
      { file: 'ARIAL.TTF', family: 'Arial', weight: 'normal' },
      { file: 'ARIALBD.TTF', family: 'Arial', weight: 'bold' },
      { file: 'ebrima.ttf', family: 'Ebrima', weight: 'normal' },
      { file: 'Inter-Regular.otf', family: 'Inter', weight: 'normal' },
      { file: 'Inter-Bold.otf', family: 'Inter', weight: 'bold' },
      { file: 'Inter-SemiBold.otf', family: 'Inter', weight: '600' },
      { file: 'Inter-Medium.otf', family: 'Inter', weight: '500' },
      { file: 'OCR.ttf', family: 'OCR-B', weight: 'normal' },
    ];

    for (const font of fontFiles) {
      const fontPath = path.join(FONTS_DIR, font.file);
      if (fs.existsSync(fontPath)) {
        registerFont(fontPath, { family: font.family, weight: font.weight });
        logger.info(`Registered font: ${font.file}`);
      } else {
        logger.warn(`Font not found: ${fontPath}`);
      }
    }
    fontsRegistered = true;
  } catch (error) {
    logger.warn('Font registration failed:', error);
  }
}

// Grayscale conversion is now done in removeWhiteBackgroundSharp function

// Remove white background using sharp - flood fill from edges, then convert to grayscale
async function removeWhiteBackgroundSharp(photoBuffer: Buffer, threshold: number = 240): Promise<Buffer> {
  try {
    const { data, info } = await sharp(photoBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const width = info.width;
    const height = info.height;
    const pixels = Buffer.from(data);
    
    // Create visited set for flood fill
    const visited = new Set<number>();
    const queue: number[] = [];
    
    // Helper to check if pixel is white-ish
    const isWhite = (idx: number) => {
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      return r >= threshold && g >= threshold && b >= threshold;
    };
    
    // Helper to get pixel index
    const getIdx = (x: number, y: number) => (y * width + x) * 4;
    
    // Add all edge pixels to queue
    for (let x = 0; x < width; x++) {
      queue.push(getIdx(x, 0));
      queue.push(getIdx(x, height - 1));
    }
    for (let y = 0; y < height; y++) {
      queue.push(getIdx(0, y));
      queue.push(getIdx(width - 1, y));
    }
    
    let transparentCount = 0;
    
    // Flood fill from edges - only remove connected white pixels
    while (queue.length > 0) {
      const idx = queue.shift()!;
      
      if (visited.has(idx)) continue;
      visited.add(idx);
      
      if (!isWhite(idx)) continue;
      
      // Make transparent
      pixels[idx + 3] = 0;
      transparentCount++;
      
      // Get x, y from index
      const pixelNum = idx / 4;
      const x = pixelNum % width;
      const y = Math.floor(pixelNum / width);
      
      // Add neighbors to queue
      if (x > 0) queue.push(getIdx(x - 1, y));
      if (x < width - 1) queue.push(getIdx(x + 1, y));
      if (y > 0) queue.push(getIdx(x, y - 1));
      if (y < height - 1) queue.push(getIdx(x, y + 1));
    }
    
    // Now convert to grayscale while preserving alpha
    for (let i = 0; i < width * height * 4; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      pixels[i] = gray;
      pixels[i + 1] = gray;
      pixels[i + 2] = gray;
      // Alpha (pixels[i + 3]) is preserved
    }
    
    logger.info(`White background removed: ${transparentCount} pixels made transparent, converted to grayscale`);
    
    const result = await sharp(pixels, {
      raw: {
        width: width,
        height: height,
        channels: 4
      }
    }).png().toBuffer();
    
    return result;
  } catch (error) {
    logger.error('Failed to remove white background:', error);
    return photoBuffer; // Return original if failed
  }
}

// Cache for processed photos to avoid re-running flood-fill multiple times
const processedPhotoCache = new Map<string, Buffer>();

export class CardRenderer {
  constructor() {
    registerFonts();
  }

  getCardDimensions(): { width: number; height: number } {
    return { width: dimensions.width, height: dimensions.height };
  }

  /**
   * Render front card - EXACTLY like test script renderFrontCard function
   */
  async renderFront(data: EfaydaData, options: CardRenderOptions = { variant: 'color' }): Promise<Buffer> {
    const templateType = options.template || 'template0';
    const layout = layoutConfigs[templateType];
    const { dimensions, front } = layout;
    const templateFile = layout.templateFiles?.front || 'front_template.png';
    
    const canvas = createCanvas(dimensions.width, dimensions.height);
    const ctx = canvas.getContext('2d');

    // Draw template
    const template = await loadImage(path.join(TEMPLATE_DIR, templateFile));
    ctx.drawImage(template, 0, 0, dimensions.width, dimensions.height);

    // Draw photo with transparent background (already grayscale from removeWhiteBackgroundSharp)
    if (data.photo) {
      try {
        const photoBuffer = typeof data.photo === 'string' ? Buffer.from(data.photo, 'base64') : data.photo;
        
        // Create cache key from photo buffer hash
        const cacheKey = photoBuffer.slice(0, 100).toString('base64');
        
        // Check cache first to avoid re-running expensive flood-fill
        let photoProcessed = processedPhotoCache.get(cacheKey);
        if (!photoProcessed) {
          logger.info('Processing photo (flood-fill background removal)...');
          photoProcessed = await removeWhiteBackgroundSharp(photoBuffer);
          processedPhotoCache.set(cacheKey, photoProcessed);
          // Clear cache after 60 seconds to prevent memory leak
          setTimeout(() => processedPhotoCache.delete(cacheKey), 60000);
        } else {
          logger.info('Using cached processed photo');
        }
        
        const photo = await loadImage(photoProcessed);
        
        // Draw main photo (already grayscale with transparent background)
        ctx.drawImage(photo, front.mainPhoto.x, front.mainPhoto.y, front.mainPhoto.width, front.mainPhoto.height);
        
        // Draw small photo (already grayscale with transparent background)
        ctx.drawImage(photo, front.smallPhoto.x, front.smallPhoto.y, front.smallPhoto.width, front.smallPhoto.height);
      } catch (e) {
        logger.error('Could not load photo:', e);
      }
    }

    ctx.textBaseline = 'top';

    // Name Amharic - EXACTLY like test script
    ctx.fillStyle = front.nameAmharic.color;
    ctx.font = `bold ${front.nameAmharic.fontSize}px Ebrima`;
    ctx.fillText(data.fullNameAmharic, front.nameAmharic.x, front.nameAmharic.y);

    // Name English - EXACTLY like test script
    ctx.fillStyle = front.nameEnglish.color;
    ctx.font = `bold ${front.nameEnglish.fontSize}px Arial`;
    ctx.fillText(data.fullNameEnglish, front.nameEnglish.x, front.nameEnglish.y);

    // DOB - EXACTLY like test script
    ctx.fillStyle = front.dateOfBirth.color;
    ctx.font = `bold ${front.dateOfBirth.fontSize}px Arial`;
    ctx.fillText(`${data.dateOfBirthGregorian} | ${data.dateOfBirthEthiopian}`, front.dateOfBirth.x, front.dateOfBirth.y);

    // Sex - EXACTLY like test script
    ctx.fillStyle = front.sex.color;
    ctx.font = `bold ${front.sex.fontSize}px Ebrima`;
    const sexAmharic = data.sexAmharic || (data.sex === 'Female' ? 'ሴት' : 'ወንድ');
    ctx.fillText(sexAmharic, front.sex.x, front.sex.y);
    const sexWidth = ctx.measureText(sexAmharic).width;
    ctx.font = `bold ${front.sex.fontSize}px Arial`;
    ctx.fillText(`  |  ${data.sex}`, front.sex.x + sexWidth, front.sex.y);

    // Expiry - EXACTLY like test script
    ctx.fillStyle = front.expiryDate.color;
    ctx.font = `bold ${front.expiryDate.fontSize}px Arial`;
    ctx.fillText(`${data.expiryDateGregorian || ''} | ${data.expiryDateEthiopian || ''}`, front.expiryDate.x, front.expiryDate.y);

    // FAN - EXACTLY like test script
    ctx.fillStyle = front.fan.color;
    ctx.font = `bold ${front.fan.fontSize}px Consolas`;
    ctx.fillText(data.fcn, front.fan.x, front.fan.y);

    // Barcode - EXACTLY like test script
    const barcodeCanvas = createCanvas(front.barcode.width, front.barcode.height);
    JsBarcode(barcodeCanvas, data.fcn.replace(/\s/g, ''), {
      format: 'CODE128',
      width: 2,
      height: front.barcode.height - 5,
      displayValue: false,
      margin: 0,
      background: 'transparent'
    });
    ctx.drawImage(barcodeCanvas, front.barcode.x, front.barcode.y, front.barcode.width, front.barcode.height);

    // Issue dates (rotated) - use dates from PDF
    ctx.fillStyle = front.dateOfIssueEthiopian.color;
    ctx.font = `bold ${front.dateOfIssueEthiopian.fontSize}px Arial`;
    ctx.save();
    ctx.translate(front.dateOfIssueEthiopian.x, front.dateOfIssueEthiopian.y);
    ctx.rotate((front.dateOfIssueEthiopian.rotation * Math.PI) / 180);
    ctx.fillText(data.issueDateEthiopian || '', 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(front.dateOfIssueGregorian.x, front.dateOfIssueGregorian.y);
    ctx.rotate((front.dateOfIssueGregorian.rotation * Math.PI) / 180);
    ctx.fillText(data.issueDate || '', 0, 0);
    ctx.restore();

    // Apply full grayscale if variant is grayscale
    if (options.variant === 'grayscale') {
      this.applyGrayscale(ctx, canvas);
    }

    return canvas.toBuffer('image/png');
  }


  /**
   * Render back card - EXACTLY like test script renderBackCard function
   */
  async renderBack(data: EfaydaData, options: CardRenderOptions = { variant: 'color' }): Promise<Buffer> {
    const templateType = options.template || 'template0';
    const layout = layoutConfigs[templateType];
    const { dimensions, back } = layout;
    const templateFile = layout.templateFiles?.back || 'back_template.png';
    
    const canvas = createCanvas(dimensions.width, dimensions.height);
    const ctx = canvas.getContext('2d');

    // Draw template
    const template = await loadImage(path.join(TEMPLATE_DIR, templateFile));
    ctx.drawImage(template, 0, 0, dimensions.width, dimensions.height);

    // Draw QR code - EXACTLY like test script
    if (data.qrCode) {
      try {
        const qrBuffer = typeof data.qrCode === 'string' ? Buffer.from(data.qrCode, 'base64') : data.qrCode;
        const qr = await loadImage(qrBuffer);
        ctx.drawImage(qr, back.qrCode.x, back.qrCode.y, back.qrCode.width, back.qrCode.height);
      } catch (e) {
        // Generate QR from FCN if extraction failed
        const qrCanvas = createCanvas(back.qrCode.width, back.qrCode.height);
        await QRCode.toCanvas(qrCanvas, data.fcn.replace(/\s/g, ''), { width: back.qrCode.width, margin: 0 });
        ctx.drawImage(qrCanvas, back.qrCode.x, back.qrCode.y);
      }
    } else {
      // Generate QR from FCN
      const qrCanvas = createCanvas(back.qrCode.width, back.qrCode.height);
      await QRCode.toCanvas(qrCanvas, data.fcn.replace(/\s/g, ''), { width: back.qrCode.width, margin: 0 });
      ctx.drawImage(qrCanvas, back.qrCode.x, back.qrCode.y);
    }

    ctx.textBaseline = 'top';

    // Phone - EXACTLY like test script
    ctx.fillStyle = back.phoneNumber.color;
    ctx.font = `bold ${back.phoneNumber.fontSize}px Arial`;
    ctx.fillText(data.phoneNumber, back.phoneNumber.x, back.phoneNumber.y);

    // Nationality (Amharic | English in one line)
    if (back.nationality) {
      ctx.fillStyle = back.nationality.color;
      ctx.font = `bold ${back.nationality.fontSize}px Ebrima`;
      const nationalityAmharic = 'ኢትዮጵያዊ';
      ctx.fillText(nationalityAmharic, back.nationality.x, back.nationality.y);
      const amharicWidth = ctx.measureText(nationalityAmharic).width;
      ctx.font = `bold ${back.nationality.fontSize}px Arial`;
      ctx.fillText(`  |  ${data.nationality || 'Ethiopian'}`, back.nationality.x + amharicWidth, back.nationality.y);
    }

    // Region - EXACTLY like test script
    ctx.fillStyle = back.regionAmharic.color;
    ctx.font = `bold ${back.regionAmharic.fontSize}px Ebrima`;
    ctx.fillText(data.regionAmharic || '', back.regionAmharic.x, back.regionAmharic.y);

    ctx.fillStyle = back.regionEnglish.color;
    ctx.font = `bold ${back.regionEnglish.fontSize}px Arial`;
    ctx.fillText(data.region || '', back.regionEnglish.x, back.regionEnglish.y);

    // Zone - EXACTLY like test script
    ctx.fillStyle = back.zoneAmharic.color;
    ctx.font = `bold ${back.zoneAmharic.fontSize}px Ebrima`;
    ctx.fillText(data.zoneAmharic || '', back.zoneAmharic.x, back.zoneAmharic.y);

    ctx.fillStyle = back.zoneEnglish.color;
    ctx.font = `bold ${back.zoneEnglish.fontSize}px Arial`;
    ctx.fillText(data.city || '', back.zoneEnglish.x, back.zoneEnglish.y);

    // Woreda - EXACTLY like test script
    ctx.fillStyle = back.woredaAmharic.color;
    ctx.font = `bold ${back.woredaAmharic.fontSize}px Ebrima`;
    ctx.fillText(data.woredaAmharic || '', back.woredaAmharic.x, back.woredaAmharic.y);

    ctx.fillStyle = back.woredaEnglish.color;
    ctx.font = `bold ${back.woredaEnglish.fontSize}px Arial`;
    ctx.fillText(data.subcity || '', back.woredaEnglish.x, back.woredaEnglish.y);

    // FIN - EXACTLY like test script
    ctx.fillStyle = back.fin.color;
    ctx.font = `bold ${back.fin.fontSize}px Consolas`;
    ctx.fillText(data.fin, back.fin.x, back.fin.y);

    // Serial Number - EXACTLY like test script
    ctx.fillStyle = back.serialNumber.color;
    ctx.font = `bold ${back.serialNumber.fontSize}px Arial`;
    ctx.fillText(data.serialNumber || '', back.serialNumber.x, back.serialNumber.y);

    // Apply full grayscale if variant is grayscale
    if (options.variant === 'grayscale') {
      this.applyGrayscale(ctx, canvas);
    }

    return canvas.toBuffer('image/png');
  }

  private applyGrayscale(ctx: CanvasRenderingContext2D, canvas: Canvas): void {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const avg = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      data[i] = avg;
      data[i + 1] = avg;
      data[i + 2] = avg;
    }
    ctx.putImageData(imageData, 0, 0);
  }
}

export default CardRenderer;

export function getCardDimensions(template: TemplateType = 'template0'): { width: number; height: number } {
  const layout = layoutConfigs[template];
  return { width: layout.dimensions.width, height: layout.dimensions.height };
}

export function getAvailableTemplates(): { id: TemplateType; name: string }[] {
  return Object.entries(layoutConfigs).map(([id, config]) => ({
    id: id as TemplateType,
    name: config.templateName || id
  }));
}
