import { createCanvas, loadImage, registerFont, Canvas, CanvasRenderingContext2D } from 'canvas';
import { EfaydaData } from '../../types';
import logger from '../../utils/logger';
import path from 'path';
import fs from 'fs';
import JsBarcode from 'jsbarcode';
import cardLayout from '../../config/cardLayout.json';

const { dimensions, front, back, fonts } = cardLayout;
const CARD_WIDTH = dimensions.width;
const CARD_HEIGHT = dimensions.height;

export interface CardRenderOptions {
  variant: 'color' | 'grayscale';
  dpi?: number;
}

const FONTS_DIR = path.join(__dirname, '../../assets/fonts');
const TEMPLATE_DIR = path.join(process.cwd(), 'template');

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

function getFontString(size: number, weight: string, family: string, fallback: string): string {
  const w = weight === '700' ? 'bold' : weight === '600' ? '600' : 'normal';
  return `${w} ${size}px ${family}, ${fallback}`;
}

export class CardRenderer {
  private frontTemplatePath: string;
  private backTemplatePath: string;

  constructor() {
    this.frontTemplatePath = path.join(TEMPLATE_DIR, 'assets/front_template.png');
    this.backTemplatePath = path.join(TEMPLATE_DIR, 'assets/back_template.png');
    registerFonts();
  }

  getCardDimensions(): { width: number; height: number } {
    return { width: CARD_WIDTH, height: CARD_HEIGHT };
  }

  async renderFront(data: EfaydaData, options: CardRenderOptions = { variant: 'color' }): Promise<Buffer> {
    try {
      const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
      const ctx = canvas.getContext('2d');

      await this.drawTemplate(ctx, this.frontTemplatePath);
      await this.drawImage(ctx, data.photo, front.mainPhoto.x, front.mainPhoto.y, front.mainPhoto.width, front.mainPhoto.height);
      await this.drawImage(ctx, data.photo, front.smallPhoto.x, front.smallPhoto.y, front.smallPhoto.width, front.smallPhoto.height);
      this.drawFrontValues(ctx, data);
      await this.drawBarcode(ctx, data.fan);
      this.drawDateOfIssue(ctx, data.issueDate, data.issueDateEthiopian);

      if (options.variant === 'grayscale') {
        this.applyGrayscale(ctx, canvas);
      }

      return canvas.toBuffer('image/png');
    } catch (error) {
      logger.error('Front card render failed:', error);
      throw new Error('Failed to render front card');
    }
  }

  async renderBack(data: EfaydaData, options: CardRenderOptions = { variant: 'color' }): Promise<Buffer> {
    try {
      const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
      const ctx = canvas.getContext('2d');

      await this.drawTemplate(ctx, this.backTemplatePath);
      await this.drawImage(ctx, data.qrCode, back.qrCode.x, back.qrCode.y, back.qrCode.width, back.qrCode.height);
      this.drawBackValues(ctx, data);

      if (options.variant === 'grayscale') {
        this.applyGrayscale(ctx, canvas);
      }

      return canvas.toBuffer('image/png');
    } catch (error) {
      logger.error('Back card render failed:', error);
      throw new Error('Failed to render back card');
    }
  }

  private async drawTemplate(ctx: CanvasRenderingContext2D, templatePath: string): Promise<void> {
    if (fs.existsSync(templatePath)) {
      const template = await loadImage(templatePath);
      ctx.drawImage(template, 0, 0, CARD_WIDTH, CARD_HEIGHT);
    } else {
      logger.warn(`Template not found: ${templatePath}`);
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
    }
  }

  private async drawImage(ctx: CanvasRenderingContext2D, image: string | Buffer | undefined, x: number, y: number, w: number, h: number): Promise<void> {
    if (!image) return;
    try {
      const buffer = typeof image === 'string' ? Buffer.from(image, 'base64') : image;
      const img = await loadImage(buffer);
      ctx.drawImage(img, x, y, w, h);
    } catch (error) {
      logger.error('Failed to draw image:', error);
    }
  }


  private drawFrontValues(ctx: CanvasRenderingContext2D, data: EfaydaData): void {
    ctx.textBaseline = 'top';

    // Full Name - Amharic
    ctx.fillStyle = front.nameAmharic.color;
    ctx.font = getFontString(front.nameAmharic.fontSize, front.nameAmharic.fontWeight, front.nameAmharic.fontFamily, fonts.amharic.fallback);
    ctx.fillText(data.fullNameAmharic || '', front.nameAmharic.x, front.nameAmharic.y);

    // Full Name - English
    ctx.fillStyle = front.nameEnglish.color;
    ctx.font = getFontString(front.nameEnglish.fontSize, front.nameEnglish.fontWeight, front.nameEnglish.fontFamily, fonts.english.fallback);
    ctx.fillText(data.fullNameEnglish || '', front.nameEnglish.x, front.nameEnglish.y);

    // Date of Birth
    ctx.fillStyle = front.dateOfBirth.color;
    ctx.font = getFontString(front.dateOfBirth.fontSize, front.dateOfBirth.fontWeight, front.dateOfBirth.fontFamily, fonts.english.fallback);
    const dobText = `${data.dateOfBirthGregorian || ''} | ${data.dateOfBirthEthiopian || ''}`;
    ctx.fillText(dobText, front.dateOfBirth.x, front.dateOfBirth.y);

    // Sex - Amharic and English
    ctx.fillStyle = front.sex.color;
    ctx.font = getFontString(front.sex.fontSize, front.sex.fontWeight, fonts.amharic.primary, fonts.amharic.fallback);
    const sexAmharic = data.sex === 'Female' ? 'ሴት' : 'ወንድ';
    ctx.fillText(sexAmharic, front.sex.x, front.sex.y);
    
    ctx.font = getFontString(front.sex.fontSize, front.sex.fontWeight, front.sex.fontFamily, fonts.english.fallback);
    const sexWidth = ctx.measureText(sexAmharic).width;
    ctx.fillText(`  |  ${data.sex || ''}`, front.sex.x + sexWidth, front.sex.y);

    // Expiry Date
    ctx.fillStyle = front.expiryDate.color;
    ctx.font = getFontString(front.expiryDate.fontSize, front.expiryDate.fontWeight, front.expiryDate.fontFamily, fonts.english.fallback);
    const expiryText = `${data.expiryDateGregorian || ''} | ${data.expiryDateEthiopian || ''}`;
    ctx.fillText(expiryText, front.expiryDate.x, front.expiryDate.y);

    // FAN Number
    ctx.fillStyle = front.fan.color;
    ctx.font = getFontString(front.fan.fontSize, front.fan.fontWeight, front.fan.fontFamily, fonts.monospace.fallback);
    ctx.fillText(this.formatNumber(data.fan), front.fan.x, front.fan.y);
  }

  private drawBackValues(ctx: CanvasRenderingContext2D, data: EfaydaData): void {
    ctx.textBaseline = 'top';

    // Phone Number
    ctx.fillStyle = back.phoneNumber.color;
    ctx.font = getFontString(back.phoneNumber.fontSize, back.phoneNumber.fontWeight, back.phoneNumber.fontFamily, fonts.english.fallback);
    ctx.fillText(data.phoneNumber || '', back.phoneNumber.x, back.phoneNumber.y);

    // Nationality (ET)
    ctx.fillStyle = back.nationality.color;
    ctx.font = getFontString(back.nationality.fontSize, back.nationality.fontWeight, back.nationality.fontFamily, fonts.english.fallback);
    ctx.fillText('ET', back.nationality.x, back.nationality.y);

    // Region (Amharic + English)
    ctx.fillStyle = back.region.color;
    ctx.font = getFontString(back.region.fontSize, back.region.fontWeight, back.region.fontFamily, fonts.amharic.fallback);
    const regionAmharic = this.getRegionAmharic(data.region);
    ctx.fillText(regionAmharic, back.region.x, back.region.y);
    ctx.font = getFontString(back.region.fontSize - 2, '500', fonts.english.primary, fonts.english.fallback);
    ctx.fillText(data.region || '', back.region.x, back.region.y + 26);

    // Zone/City (Amharic + English)
    ctx.fillStyle = back.zone.color;
    ctx.font = getFontString(back.zone.fontSize, back.zone.fontWeight, back.zone.fontFamily, fonts.amharic.fallback);
    const cityAmharic = this.getCityAmharic(data.city);
    ctx.fillText(cityAmharic, back.zone.x, back.zone.y);
    ctx.font = getFontString(back.zone.fontSize - 2, '500', fonts.english.primary, fonts.english.fallback);
    ctx.fillText(data.city || '', back.zone.x, back.zone.y + 26);

    // Woreda/Subcity (Amharic + English)
    ctx.fillStyle = back.woreda.color;
    ctx.font = getFontString(back.woreda.fontSize, back.woreda.fontWeight, back.woreda.fontFamily, fonts.amharic.fallback);
    const subcityAmharic = this.getSubcityAmharic(data.subcity);
    ctx.fillText(subcityAmharic, back.woreda.x, back.woreda.y);
    ctx.font = getFontString(back.woreda.fontSize - 2, '500', fonts.english.primary, fonts.english.fallback);
    ctx.fillText(data.subcity || '', back.woreda.x, back.woreda.y + 26);

    // FIN Number
    ctx.fillStyle = back.fin.color;
    ctx.font = getFontString(back.fin.fontSize, back.fin.fontWeight, back.fin.fontFamily, fonts.monospace.fallback);
    ctx.fillText(this.formatNumber(data.fin), back.fin.x, back.fin.y);

    // Serial Number (red)
    ctx.fillStyle = back.serialNumber.color;
    ctx.font = getFontString(back.serialNumber.fontSize, back.serialNumber.fontWeight, back.serialNumber.fontFamily, fonts.english.fallback);
    ctx.fillText(data.serialNumber || '', back.serialNumber.x, back.serialNumber.y);
  }

  private async drawBarcode(ctx: CanvasRenderingContext2D, fan: string): Promise<void> {
    if (!fan) return;
    try {
      const barcodeCanvas = createCanvas(front.barcode.width, front.barcode.height);
      JsBarcode(barcodeCanvas, fan.replace(/\s/g, ''), {
        format: 'CODE128',
        width: 2,
        height: front.barcode.height - 5,
        displayValue: false,
        margin: 0,
        background: 'transparent'
      });
      ctx.drawImage(barcodeCanvas, front.barcode.x, front.barcode.y);
    } catch (error) {
      logger.error('Failed to draw barcode:', error);
    }
  }

  private drawDateOfIssue(ctx: CanvasRenderingContext2D, issueDate?: string, issueDateEthiopian?: string): void {
    ctx.fillStyle = front.dateOfIssue.color;
    ctx.textBaseline = 'top';
    ctx.font = getFontString(front.dateOfIssue.fontSize, front.dateOfIssue.fontWeight, fonts.english.primary, fonts.english.fallback);

    ctx.save();
    ctx.translate(front.dateOfIssue.x, front.dateOfIssue.y);
    ctx.rotate((front.dateOfIssue.rotation * Math.PI) / 180);

    if (issueDateEthiopian) {
      ctx.fillText(issueDateEthiopian, 0, 0);
    }
    if (issueDate) {
      ctx.fillText(issueDate, 0, 18);
    }

    ctx.restore();
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

  private formatNumber(value: string): string {
    if (!value) return '';
    const clean = value.replace(/\s/g, '');
    return clean.match(/.{1,4}/g)?.join(' ') || clean;
  }

  private getRegionAmharic(region: string): string {
    const map: Record<string, string> = {
      'Tigray': 'ትግራይ',
      'Amhara': 'አማራ',
      'Oromia': 'ኦሮሚያ',
      'SNNPR': 'ደቡብ ብሔሮች',
      'Addis Ababa': 'አዲስ አበባ',
      'Dire Dawa': 'ድሬዳዋ',
      'Harari': 'ሐረሪ',
      'Somali': 'ሶማሌ',
      'Afar': 'አፋር',
      'Benishangul-Gumuz': 'ቤንሻንጉል-ጉሙዝ',
      'Gambela': 'ጋምቤላ',
      'Sidama': 'ሲዳማ'
    };
    return map[region] || region || '';
  }

  private getCityAmharic(city: string): string {
    const map: Record<string, string> = {
      'Addis Ababa': 'አዲስ አበባ',
      'Mekelle': 'መቐለ',
      'Bahir Dar': 'ባህር ዳር',
      'Gondar': 'ጎንደር',
      'Hawassa': 'ሀዋሳ',
      'Dire Dawa': 'ድሬዳዋ',
      'Jimma': 'ጅማ',
      'Adama': 'አዳማ',
      'Dessie': 'ደሴ',
      'Harar': 'ሐረር'
    };
    return map[city] || city || '';
  }

  private getSubcityAmharic(subcity: string): string {
    const map: Record<string, string> = {
      'Hadnet Sub City': 'ሓድነት',
      'Bole': 'ቦሌ',
      'Kirkos': 'ቂርቆስ',
      'Yeka': 'የካ',
      'Arada': 'አራዳ',
      'Lideta': 'ልደታ',
      'Kolfe Keranio': 'ኮልፌ ቀራኒዮ',
      'Gulele': 'ጉለሌ',
      'Addis Ketema': 'አዲስ ከተማ',
      'Akaky Kaliti': 'አቃቂ ቃሊቲ',
      'Nifas Silk-Lafto': 'ንፋስ ስልክ-ላፍቶ'
    };
    return map[subcity] || (subcity || '').replace(' Sub City', '');
  }
}

export default CardRenderer;

export function getCardDimensions(): { width: number; height: number } {
  return { width: CARD_WIDTH, height: CARD_HEIGHT };
}
