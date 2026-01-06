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

// Load layout config - EXACTLY like test script
const layout = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/config/cardLayout.json'), 'utf-8'));
const { dimensions, front, back } = layout;

export interface CardRenderOptions {
  variant: 'color' | 'grayscale';
  dpi?: number;
}

const FONTS_DIR = path.join(process.cwd(), 'src/assets/fonts');
const TEMPLATE_DIR = path.join(process.cwd(), 'src/assets');

let fontsRegistered = false;

export function registerFonts(): void {
  if (fontsRegistered) return;
  try {
    const fontFiles = [
      { file: 'nyala.ttf', family: 'Nyala', weight: 'normal' },
      { file: 'ARIAL.TTF', family: 'Arial', weight: 'normal' },
      { file: 'ARIALBD.TTF', family: 'Arial', weight: 'bold' },
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

// Convert image to grayscale - EXACTLY like test script
function convertToGrayscale(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
  const imageData = ctx.getImageData(x, y, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  ctx.putImageData(imageData, x, y);
}

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
    const canvas = createCanvas(dimensions.width, dimensions.height);
    const ctx = canvas.getContext('2d');

    // Draw template
    const template = await loadImage(path.join(TEMPLATE_DIR, 'front_template.png'));
    ctx.drawImage(template, 0, 0, dimensions.width, dimensions.height);

    // Draw photo (grayscale) - EXACTLY like test script
    if (data.photo) {
      try {
        const photoBuffer = typeof data.photo === 'string' ? Buffer.from(data.photo, 'base64') : data.photo;
        const photo = await loadImage(photoBuffer);
        // Draw main photo
        ctx.drawImage(photo, front.mainPhoto.x, front.mainPhoto.y, front.mainPhoto.width, front.mainPhoto.height);
        convertToGrayscale(ctx, front.mainPhoto.x, front.mainPhoto.y, front.mainPhoto.width, front.mainPhoto.height);
        // Draw small photo
        ctx.drawImage(photo, front.smallPhoto.x, front.smallPhoto.y, front.smallPhoto.width, front.smallPhoto.height);
        convertToGrayscale(ctx, front.smallPhoto.x, front.smallPhoto.y, front.smallPhoto.width, front.smallPhoto.height);
      } catch (e) {
        logger.error('Could not load photo:', e);
      }
    }

    ctx.textBaseline = 'top';

    // Name Amharic
    ctx.fillStyle = front.nameAmharic.color;
    ctx.font = `bold ${front.nameAmharic.fontSize}px Ebrima`;
    ctx.fillText(data.fullNameAmharic, front.nameAmharic.x, front.nameAmharic.y);

    // Name English
    ctx.fillStyle = front.nameEnglish.color;
    ctx.font = `bold ${front.nameEnglish.fontSize}px Arial`;
    ctx.fillText(data.fullNameEnglish, front.nameEnglish.x, front.nameEnglish.y);

    // DOB
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

    // Expiry - use dates from PDF
    ctx.fillStyle = front.expiryDate.color;
    ctx.font = `bold ${front.expiryDate.fontSize}px Arial`;
    ctx.fillText(`${data.expiryDateGregorian || ''} | ${data.expiryDateEthiopian || ''}`, front.expiryDate.x, front.expiryDate.y);

    // FAN (using fcn which is the 16-digit number)
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
    const canvas = createCanvas(dimensions.width, dimensions.height);
    const ctx = canvas.getContext('2d');

    // Draw template
    const template = await loadImage(path.join(TEMPLATE_DIR, 'back_template.png'));
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

    // Phone
    ctx.fillStyle = back.phoneNumber.color;
    ctx.font = `bold ${back.phoneNumber.fontSize}px Arial`;
    ctx.fillText(data.phoneNumber, back.phoneNumber.x, back.phoneNumber.y);

    // Region - EXACTLY like test script (Amharic value directly)
    ctx.fillStyle = back.regionAmharic.color;
    ctx.font = `bold ${back.regionAmharic.fontSize}px Ebrima`;
    ctx.fillText(data.regionAmharic || '', back.regionAmharic.x, back.regionAmharic.y);

    ctx.fillStyle = back.regionEnglish.color;
    ctx.font = `bold ${back.regionEnglish.fontSize}px Arial`;
    ctx.fillText(data.region || '', back.regionEnglish.x, back.regionEnglish.y);

    // Zone - EXACTLY like test script (Amharic value directly)
    ctx.fillStyle = back.zoneAmharic.color;
    ctx.font = `bold ${back.zoneAmharic.fontSize}px Ebrima`;
    ctx.fillText(data.zoneAmharic || '', back.zoneAmharic.x, back.zoneAmharic.y);

    ctx.fillStyle = back.zoneEnglish.color;
    ctx.font = `bold ${back.zoneEnglish.fontSize}px Arial`;
    ctx.fillText(data.city || '', back.zoneEnglish.x, back.zoneEnglish.y);

    // Woreda - EXACTLY like test script (Amharic value directly)
    ctx.fillStyle = back.woredaAmharic.color;
    ctx.font = `bold ${back.woredaAmharic.fontSize}px Ebrima`;
    ctx.fillText(data.woredaAmharic || '', back.woredaAmharic.x, back.woredaAmharic.y);

    ctx.fillStyle = back.woredaEnglish.color;
    ctx.font = `bold ${back.woredaEnglish.fontSize}px Arial`;
    ctx.fillText(data.subcity || '', back.woredaEnglish.x, back.woredaEnglish.y);

    // FIN (12 digits, different from FCN/FAN) - EXACTLY like test script
    ctx.fillStyle = back.fin.color;
    ctx.font = `bold ${back.fin.fontSize}px Consolas`;
    ctx.fillText(data.fin, back.fin.x, back.fin.y);

    // Serial Number - use from data
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

export function getCardDimensions(): { width: number; height: number } {
  return { width: dimensions.width, height: dimensions.height };
}
