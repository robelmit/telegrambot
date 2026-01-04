import sharp from 'sharp';
import { EfaydaData } from '../../types';
import { ImageProcessor } from './imageProcessor';
import logger from '../../utils/logger';
import path from 'path';
import fs from 'fs';

const CARD_WIDTH = 1344;
const CARD_HEIGHT = 768;
const PHOTO_WIDTH = 200;
const PHOTO_HEIGHT = 260;
const PHOTO_X = 55;
const PHOTO_Y = 180;

export interface CardRenderOptions {
  variant: 'color' | 'grayscale';
  dpi?: number;
}

export class CardRenderer {
  private imageProcessor: ImageProcessor;
  private frontTemplatePath: string;
  private backTemplatePath: string;

  constructor() {
    this.imageProcessor = new ImageProcessor();
    this.frontTemplatePath = path.join(__dirname, '../../assets/front_template.png');
    this.backTemplatePath = path.join(__dirname, '../../assets/back_template.png');
  }

  async renderFront(data: EfaydaData, options: CardRenderOptions = { variant: 'color' }): Promise<Buffer> {
    try {
      let card: Buffer;
      if (fs.existsSync(this.frontTemplatePath)) {
        card = await sharp(this.frontTemplatePath).resize(CARD_WIDTH, CARD_HEIGHT).png().toBuffer();
      } else {
        card = await this.createFrontBackground();
      }

      if (data.photo) {
        const photoBuffer = typeof data.photo === 'string' ? Buffer.from(data.photo, 'base64') : data.photo;
        const photoBg = await this.createPhotoFrame();
        card = await sharp(card).composite([{ input: photoBg, left: PHOTO_X - 5, top: PHOTO_Y - 5 }]).toBuffer();
        const processedPhoto = await this.imageProcessor.resizeExact(photoBuffer, PHOTO_WIDTH, PHOTO_HEIGHT);
        card = await sharp(card).composite([{ input: processedPhoto, left: PHOTO_X, top: PHOTO_Y }]).toBuffer();
      } else {
        const placeholder = await this.createPhotoPlaceholder();
        card = await sharp(card).composite([{ input: placeholder, left: PHOTO_X, top: PHOTO_Y }]).toBuffer();
      }

      card = await this.addFrontText(card, data);
      if (options.variant === 'grayscale') { card = await this.imageProcessor.grayscale(card); }
      card = await this.imageProcessor.setDpi(card, options.dpi || 300);
      return card;
    } catch (error) {
      logger.error('Front card render failed:', error);
      throw new Error('Failed to render front card');
    }
  }

  private async createPhotoPlaceholder(): Promise<Buffer> {
    const svg = `<svg width="${PHOTO_WIDTH}" height="${PHOTO_HEIGHT}"><rect width="${PHOTO_WIDTH}" height="${PHOTO_HEIGHT}" fill="#f5f5f5" stroke="#ccc" stroke-width="2" rx="5"/><circle cx="${PHOTO_WIDTH/2}" cy="80" r="45" fill="#ddd"/><ellipse cx="${PHOTO_WIDTH/2}" cy="200" rx="70" ry="50" fill="#ddd"/></svg>`;
    return await sharp(Buffer.from(svg)).png().toBuffer();
  }

  private async createPhotoFrame(): Promise<Buffer> {
    const w = PHOTO_WIDTH + 10, h = PHOTO_HEIGHT + 10;
    const svg = `<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="white" stroke="#078930" stroke-width="2" rx="5"/></svg>`;
    return await sharp(Buffer.from(svg)).png().toBuffer();
  }

  private async addFrontText(card: Buffer, data: EfaydaData): Promise<Buffer> {
    const c = '#000000';
    const svg = `<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}">
      <text x="590" y="112" font-family="Nyala,Ebrima,Arial" font-size="20" fill="${c}">${this.escapeXml(data.fullNameAmharic)}</text>
      <text x="590" y="138" font-family="Arial" font-size="22" font-weight="bold" fill="${c}">${this.escapeXml(data.fullNameEnglish)}</text>
      <text x="630" y="268" font-family="Arial" font-size="18" fill="${c}">${this.escapeXml(data.dateOfBirthEthiopian)}</text>
      <text x="630" y="292" font-family="Arial" font-size="16" fill="#333">${this.escapeXml(data.dateOfBirthGregorian)}</text>
      <text x="460" y="368" font-family="Arial" font-size="18" fill="${c}">${this.escapeXml(data.sex)}</text>
      <text x="690" y="468" font-family="Arial" font-size="18" fill="${c}">${this.escapeXml(data.expiryDate || 'N/A')}</text>
      <text x="450" y="560" font-family="Consolas,monospace" font-size="24" font-weight="bold" fill="${c}">${this.escapeXml(data.fan)}</text>
    </svg>`;
    return await sharp(card).composite([{ input: Buffer.from(svg), left: 0, top: 0 }]).toBuffer();
  }

  async renderBack(data: EfaydaData, options: CardRenderOptions = { variant: 'color' }): Promise<Buffer> {
    try {
      let card: Buffer;
      if (fs.existsSync(this.backTemplatePath)) {
        card = await sharp(this.backTemplatePath).resize(CARD_WIDTH, CARD_HEIGHT).png().toBuffer();
      } else {
        card = await this.createBackBackground();
      }
      card = await this.addBackText(card, data);
      if (data.qrCode) {
        const qrBuffer = typeof data.qrCode === 'string' ? Buffer.from(data.qrCode, 'base64') : data.qrCode;
        const resizedQr = await this.imageProcessor.resize(qrBuffer, 180, 180);
        card = await sharp(card).composite([{ input: resizedQr, left: CARD_WIDTH - 220, top: CARD_HEIGHT - 220 }]).toBuffer();
      }
      if (options.variant === 'grayscale') { card = await this.imageProcessor.grayscale(card); }
      card = await this.imageProcessor.setDpi(card, options.dpi || 300);
      return card;
    } catch (error) {
      logger.error('Back card render failed:', error);
      throw new Error('Failed to render back card');
    }
  }

  private async addBackText(card: Buffer, data: EfaydaData): Promise<Buffer> {
    const l = '#555', v = '#1a1a1a';
    const svg = `<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}">
      <text x="60" y="100" font-family="Arial" font-size="14" fill="${l}">Phone / ስልክ</text>
      <text x="60" y="122" font-family="Arial" font-size="18" fill="${v}">${this.escapeXml(data.phoneNumber)}</text>
      <text x="60" y="165" font-family="Arial" font-size="14" fill="${l}">Nationality / ዜግነት</text>
      <text x="60" y="187" font-family="Arial" font-size="18" fill="${v}">${this.escapeXml(data.nationality)}</text>
      <text x="60" y="230" font-family="Arial" font-size="14" fill="${l}">Region / ክልል</text>
      <text x="60" y="252" font-family="Arial" font-size="18" fill="${v}">${this.escapeXml(data.region)} - ${this.escapeXml(data.city)}</text>
      <text x="60" y="295" font-family="Arial" font-size="14" fill="${l}">Subcity / ክፍለ ከተማ</text>
      <text x="60" y="317" font-family="Arial" font-size="18" fill="${v}">${this.escapeXml(data.subcity)}</text>
      <text x="60" y="370" font-family="Arial" font-size="14" fill="${l}">FIN</text>
      <text x="60" y="392" font-family="Consolas" font-size="18" font-weight="bold" fill="${v}">${this.escapeXml(data.fin)}</text>
      <text x="60" y="435" font-family="Arial" font-size="14" fill="${l}">FCN</text>
      <text x="60" y="457" font-family="Consolas" font-size="16" fill="${v}">${this.escapeXml(data.fcn)}</text>
      <text x="500" y="100" font-family="Arial" font-size="14" fill="${l}">Issue Date / የተሰጠበት</text>
      <text x="500" y="122" font-family="Arial" font-size="18" fill="${v}">${this.escapeXml(data.issueDate || 'N/A')}</text>
      <text x="500" y="165" font-family="Arial" font-size="14" fill="${l}">Expiry / ያበቃበት</text>
      <text x="500" y="187" font-family="Arial" font-size="18" fill="${v}">${this.escapeXml(data.expiryDate || 'N/A')}</text>
      <text x="60" y="${CARD_HEIGHT - 50}" font-family="Arial" font-size="11" fill="#888">This card is the property of the Federal Democratic Republic of Ethiopia.</text>
    </svg>`;
    return await sharp(card).composite([{ input: Buffer.from(svg), left: 0, top: 0 }]).toBuffer();
  }

  private async createFrontBackground(): Promise<Buffer> {
    return await sharp(Buffer.from(`<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}"><rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="#e8f5e9"/></svg>`)).png().toBuffer();
  }

  private async createBackBackground(): Promise<Buffer> {
    return await sharp(Buffer.from(`<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}"><rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="#e8f5e9"/></svg>`)).png().toBuffer();
  }

  private escapeXml(text: string): string {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  getCardDimensions(): { width: number; height: number } {
    return { width: CARD_WIDTH, height: CARD_HEIGHT };
  }
}

export default CardRenderer;
