import { createCanvas, loadImage, registerFont, Canvas, CanvasRenderingContext2D } from 'canvas';
import { EfaydaData } from '../../types';
import logger from '../../utils/logger';
import path from 'path';
import fs from 'fs';
import JsBarcode from 'jsbarcode';

const CARD_WIDTH = 1012;
const CARD_HEIGHT = 638;

// ============== FRONT CARD POSITIONS (measured from reference) ==============

// Main Photo - left side (from visual inspection)
const PHOTO_X = 55;
const PHOTO_Y = 130;
const PHOTO_WIDTH = 185;
const PHOTO_HEIGHT = 230;

// Small Photo - bottom right
const SMALL_PHOTO_X = 855;
const SMALL_PHOTO_Y = 465;
const SMALL_PHOTO_WIDTH = 100;
const SMALL_PHOTO_HEIGHT = 125;

// Name area - reference: y=152-199, x starts at 444
const NAME_AMHARIC_X = 444;
const NAME_AMHARIC_Y = 152;
const NAME_AMHARIC_FONT_SIZE = 22;

// Name English - below Amharic
const NAME_ENGLISH_X = 444;
const NAME_ENGLISH_Y = 178;
const NAME_ENGLISH_FONT_SIZE = 18;

// DOB - reference: y=287-289, x starts at 413
const DOB_X = 413;
const DOB_Y = 287;
const DOB_FONT_SIZE = 16;

// Sex - reference: y=354-379, x starts at 430
const SEX_X = 430;
const SEX_Y = 354;
const SEX_FONT_SIZE = 18;

// Expiry - reference: y=444-469, x starts at 578
const EXPIRY_X = 578;
const EXPIRY_Y = 444;
const EXPIRY_FONT_SIZE = 18;

// FAN - reference: y=520-549, x starts at 380
const FAN_X = 380;
const FAN_Y = 520;
const FAN_FONT_SIZE = 18;

// Barcode - y=550-592, x=250-849
const BARCODE_X = 300;
const BARCODE_Y = 560;
const BARCODE_WIDTH = 500;
const BARCODE_HEIGHT = 35;

// Issue Date - rotated on left edge
const ISSUE_DATE_X = 25;
const ISSUE_DATE_Y = 340;
const ISSUE_DATE_FONT_SIZE = 12;

// ============== BACK CARD POSITIONS (measured from reference) ==============

// Phone - reference: y=58-68, x starts at 53
const BACK_PHONE_X = 53;
const BACK_PHONE_Y = 58;
const BACK_PHONE_FONT_SIZE = 16;

// ET - nationality code (need to find exact position)
const BACK_ET_X = 175;
const BACK_ET_Y = 178;
const BACK_ET_FONT_SIZE = 16;

// Address section - y=209-447
// Region starts around y=209
const BACK_ADDRESS_X = 28;
const BACK_REGION_AMHARIC_Y = 245;
const BACK_REGION_ENGLISH_Y = 272;
const BACK_CITY_AMHARIC_Y = 322;
const BACK_CITY_ENGLISH_Y = 352;
const BACK_SUBCITY_AMHARIC_Y = 402;
const BACK_SUBCITY_ENGLISH_Y = 432;
const BACK_ADDRESS_FONT_SIZE = 16;

// QR Code - right side
const BACK_QR_X = 500;
const BACK_QR_Y = 50;
const BACK_QR_SIZE = 330;

// FIN - reference: y=550-552, x starts at 53
const BACK_FIN_X = 53;
const BACK_FIN_Y = 550;
const BACK_FIN_FONT_SIZE = 14;

// Serial Number - reference: y=589-613, x starts at 831 (red)
const BACK_SN_X = 831;
const BACK_SN_Y = 589;
const BACK_SN_FONT_SIZE = 18;
const BACK_SN_COLOR = '#ff0000';

const VALUE_COLOR = '#1a1a1a';

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
      { file: 'NyalaRegular.ttf', family: 'Nyala' },
      { file: 'Arial.ttf', family: 'Arial' },
    ];

    for (const font of fontFiles) {
      const fontPath = path.join(FONTS_DIR, font.file);
      if (fs.existsSync(fontPath)) {
        registerFont(fontPath, { family: font.family, weight: 'normal' });
      }
    }
    fontsRegistered = true;
  } catch (error) {
    logger.warn('Font registration failed:', error);
  }
}


export class CardRenderer {
  private frontTemplatePath: string;
  private backTemplatePath: string;

  constructor() {
    this.frontTemplatePath = path.join(TEMPLATE_DIR, 'front_template.png');
    this.backTemplatePath = path.join(TEMPLATE_DIR, 'back_template.png');
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
      await this.drawImage(ctx, data.photo, PHOTO_X, PHOTO_Y, PHOTO_WIDTH, PHOTO_HEIGHT);
      await this.drawImage(ctx, data.photo, SMALL_PHOTO_X, SMALL_PHOTO_Y, SMALL_PHOTO_WIDTH, SMALL_PHOTO_HEIGHT);
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
      await this.drawImage(ctx, data.qrCode, BACK_QR_X, BACK_QR_Y, BACK_QR_SIZE, BACK_QR_SIZE);
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
    ctx.fillStyle = VALUE_COLOR;
    ctx.textBaseline = 'top';

    // Full Name - Amharic (bold)
    ctx.font = `bold ${NAME_AMHARIC_FONT_SIZE}px Nyala, Ebrima, Arial`;
    ctx.fillText(data.fullNameAmharic || '', NAME_AMHARIC_X, NAME_AMHARIC_Y);

    // Full Name - English (bold)
    ctx.font = `bold ${NAME_ENGLISH_FONT_SIZE}px Arial`;
    ctx.fillText(data.fullNameEnglish || '', NAME_ENGLISH_X, NAME_ENGLISH_Y);

    // Date of Birth
    ctx.font = `bold ${DOB_FONT_SIZE}px Arial`;
    const dobText = `${data.dateOfBirthGregorian || ''} | ${data.dateOfBirthEthiopian || ''}`;
    ctx.fillText(dobText, DOB_X, DOB_Y);

    // Sex - Amharic and English
    ctx.font = `bold ${SEX_FONT_SIZE}px Nyala, Ebrima, Arial`;
    const sexAmharic = data.sex === 'Female' ? 'ሴት' : 'ወንድ';
    ctx.fillText(sexAmharic, SEX_X, SEX_Y);
    
    ctx.font = `bold ${SEX_FONT_SIZE}px Arial`;
    const sexWidth = ctx.measureText(sexAmharic).width;
    ctx.fillText(`  |  ${data.sex || ''}`, SEX_X + sexWidth, SEX_Y);

    // Expiry Date
    ctx.font = `bold ${EXPIRY_FONT_SIZE}px Arial`;
    const expiryText = `${data.expiryDateGregorian || ''} | ${data.expiryDateEthiopian || ''}`;
    ctx.fillText(expiryText, EXPIRY_X, EXPIRY_Y);

    // FAN Number (monospace, bold)
    ctx.font = `bold ${FAN_FONT_SIZE}px Consolas, monospace`;
    ctx.fillText(this.formatNumber(data.fan), FAN_X, FAN_Y);
  }

  private drawBackValues(ctx: CanvasRenderingContext2D, data: EfaydaData): void {
    ctx.fillStyle = VALUE_COLOR;
    ctx.textBaseline = 'top';

    // Phone Number (bold)
    ctx.font = `bold ${BACK_PHONE_FONT_SIZE}px Arial`;
    ctx.fillText(data.phoneNumber || '', BACK_PHONE_X, BACK_PHONE_Y);

    // ET (nationality code)
    ctx.font = `bold ${BACK_ET_FONT_SIZE}px Arial`;
    ctx.fillText('ET', BACK_ET_X, BACK_ET_Y);

    // Region
    ctx.font = `bold ${BACK_ADDRESS_FONT_SIZE}px Nyala, Ebrima, Arial`;
    ctx.fillText(this.getRegionAmharic(data.region), BACK_ADDRESS_X, BACK_REGION_AMHARIC_Y);
    ctx.font = `${BACK_ADDRESS_FONT_SIZE - 2}px Arial`;
    ctx.fillText(data.region || '', BACK_ADDRESS_X, BACK_REGION_ENGLISH_Y);

    // City
    ctx.font = `bold ${BACK_ADDRESS_FONT_SIZE}px Nyala, Ebrima, Arial`;
    ctx.fillText(this.getCityAmharic(data.city), BACK_ADDRESS_X, BACK_CITY_AMHARIC_Y);
    ctx.font = `${BACK_ADDRESS_FONT_SIZE - 2}px Arial`;
    ctx.fillText(data.city || '', BACK_ADDRESS_X, BACK_CITY_ENGLISH_Y);

    // Subcity
    ctx.font = `bold ${BACK_ADDRESS_FONT_SIZE}px Nyala, Ebrima, Arial`;
    ctx.fillText(this.getSubcityAmharic(data.subcity), BACK_ADDRESS_X, BACK_SUBCITY_AMHARIC_Y);
    ctx.font = `${BACK_ADDRESS_FONT_SIZE - 2}px Arial`;
    ctx.fillText((data.subcity || ''), BACK_ADDRESS_X, BACK_SUBCITY_ENGLISH_Y);

    // FIN Number (monospace)
    ctx.font = `bold ${BACK_FIN_FONT_SIZE}px Consolas, monospace`;
    ctx.fillText(this.formatNumber(data.fin), BACK_FIN_X, BACK_FIN_Y);

    // Serial Number (red)
    ctx.fillStyle = BACK_SN_COLOR;
    ctx.font = `bold ${BACK_SN_FONT_SIZE}px Arial`;
    ctx.fillText(data.serialNumber || '', BACK_SN_X, BACK_SN_Y);
  }

  private async drawBarcode(ctx: CanvasRenderingContext2D, fan: string): Promise<void> {
    if (!fan) return;
    try {
      const barcodeCanvas = createCanvas(BARCODE_WIDTH, BARCODE_HEIGHT);
      JsBarcode(barcodeCanvas, fan.replace(/\s/g, ''), {
        format: 'CODE128',
        width: 2,
        height: BARCODE_HEIGHT - 5,
        displayValue: false,
        margin: 0,
        background: 'transparent'
      });
      ctx.drawImage(barcodeCanvas, BARCODE_X, BARCODE_Y);
    } catch (error) {
      logger.error('Failed to draw barcode:', error);
    }
  }

  private drawDateOfIssue(ctx: CanvasRenderingContext2D, issueDate?: string, issueDateEthiopian?: string): void {
    ctx.fillStyle = VALUE_COLOR;
    ctx.textBaseline = 'top';
    ctx.font = `bold ${ISSUE_DATE_FONT_SIZE}px Arial`;

    ctx.save();
    ctx.translate(ISSUE_DATE_X, ISSUE_DATE_Y);
    ctx.rotate(-Math.PI / 2);

    if (issueDateEthiopian) {
      ctx.fillText(issueDateEthiopian, 0, 0);
    }
    if (issueDate) {
      ctx.fillText(issueDate, 0, 15);
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
