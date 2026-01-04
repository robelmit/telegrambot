import sharp from 'sharp';
import { EfaydaData } from '../../types';
import { ImageProcessor } from './imageProcessor';
import logger from '../../utils/logger';
import path from 'path';
import fs from 'fs';

// Card dimensions - 1012x638 as per template
const CARD_WIDTH = 1012;
const CARD_HEIGHT = 638;

// Front card positioning
const PHOTO_WIDTH = 148;
const PHOTO_HEIGHT = 185;
const PHOTO_X = 68;
const PHOTO_Y = 168;

// Small photo (bottom right on front)
const SMALL_PHOTO_WIDTH = 80;
const SMALL_PHOTO_HEIGHT = 100;
const SMALL_PHOTO_X = 900;
const SMALL_PHOTO_Y = 480;

// Back card QR code positioning
const QR_X = 590;
const QR_Y = 28;
const QR_SIZE = 320;

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
    this.frontTemplatePath = path.join(__dirname, '../../assets/front_template.JPG');
    this.backTemplatePath = path.join(__dirname, '../../assets/back_template.JPG');
  }

  async renderFront(data: EfaydaData, options: CardRenderOptions = { variant: 'color' }): Promise<Buffer> {
    try {
      // Load template or create fallback
      let card: Buffer;
      if (fs.existsSync(this.frontTemplatePath)) {
        card = await sharp(this.frontTemplatePath)
          .resize(CARD_WIDTH, CARD_HEIGHT)
          .png()
          .toBuffer();
      } else {
        card = await this.createFrontBackground();
      }

      // Add main photo
      if (data.photo) {
        const photoBuffer = typeof data.photo === 'string' 
          ? Buffer.from(data.photo, 'base64') 
          : data.photo;
        
        const processedPhoto = await this.imageProcessor.resizeExact(
          photoBuffer, 
          PHOTO_WIDTH, 
          PHOTO_HEIGHT
        );
        
        card = await sharp(card)
          .composite([{ input: processedPhoto, left: PHOTO_X, top: PHOTO_Y }])
          .toBuffer();

        // Add small photo (bottom right)
        const smallPhoto = await this.imageProcessor.resizeExact(
          photoBuffer,
          SMALL_PHOTO_WIDTH,
          SMALL_PHOTO_HEIGHT
        );
        
        card = await sharp(card)
          .composite([{ input: smallPhoto, left: SMALL_PHOTO_X, top: SMALL_PHOTO_Y }])
          .toBuffer();
      }

      // Add text overlays
      card = await this.addFrontText(card, data);

      // Add barcode
      card = await this.addBarcode(card, data.fan);

      // Apply grayscale if needed
      if (options.variant === 'grayscale') {
        card = await this.imageProcessor.grayscale(card);
      }

      // Set DPI
      card = await this.imageProcessor.setDpi(card, options.dpi || 300);

      return card;
    } catch (error) {
      logger.error('Front card render failed:', error);
      throw new Error('Failed to render front card');
    }
  }

  private async addFrontText(card: Buffer, data: EfaydaData): Promise<Buffer> {
    // Format FAN with spaces: XXXX XXXX XXXX XXXX
    const formattedFan = this.formatFan(data.fan);
    
    const svg = `<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}">
      <!-- Full Name Amharic -->
      <text x="285" y="195" font-family="Nyala,Ebrima,Arial" font-size="26" font-weight="bold" fill="#1a1a1a">${this.escapeXml(data.fullNameAmharic)}</text>
      
      <!-- Full Name English -->
      <text x="285" y="225" font-family="Arial" font-size="22" fill="#1a1a1a">${this.escapeXml(data.fullNameEnglish)}</text>
      
      <!-- Date of Birth -->
      <text x="285" y="305" font-family="Arial" font-size="20" font-weight="bold" fill="#1a1a1a">${this.escapeXml(data.dateOfBirthGregorian)} | ${this.escapeXml(data.dateOfBirthEthiopian)}</text>
      
      <!-- Sex -->
      <text x="285" y="385" font-family="Nyala,Ebrima,Arial" font-size="20" fill="#1a1a1a">${data.sex === 'Female' ? 'ሴት' : 'ወንድ'}</text>
      <text x="340" y="385" font-family="Arial" font-size="20" fill="#1a1a1a">| ${this.escapeXml(data.sex)}</text>
      
      <!-- Date of Expiry -->
      <text x="285" y="465" font-family="Arial" font-size="20" font-weight="bold" fill="#1a1a1a">${this.escapeXml(data.expiryDate || 'N/A')}</text>
      
      <!-- FAN Number -->
      <text x="285" y="530" font-family="Arial,Consolas" font-size="22" font-weight="bold" fill="#1a1a1a">${formattedFan}</text>
    </svg>`;

    return await sharp(card)
      .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
      .toBuffer();
  }

  private async addBarcode(card: Buffer, _fan: string): Promise<Buffer> {
    // Barcode is already part of the template, just return the card
    // The template has the barcode area, we overlay the FAN number text above it
    return card;
  }

  async renderBack(data: EfaydaData, options: CardRenderOptions = { variant: 'color' }): Promise<Buffer> {
    try {
      // Load template or create fallback
      let card: Buffer;
      if (fs.existsSync(this.backTemplatePath)) {
        card = await sharp(this.backTemplatePath)
          .resize(CARD_WIDTH, CARD_HEIGHT)
          .png()
          .toBuffer();
      } else {
        card = await this.createBackBackground();
      }

      // Add text overlays
      card = await this.addBackText(card, data);

      // Add QR code
      if (data.qrCode) {
        const qrBuffer = typeof data.qrCode === 'string' 
          ? Buffer.from(data.qrCode, 'base64') 
          : data.qrCode;
        
        const resizedQr = await this.imageProcessor.resizeExact(qrBuffer, QR_SIZE, QR_SIZE);
        
        card = await sharp(card)
          .composite([{ input: resizedQr, left: QR_X, top: QR_Y }])
          .toBuffer();
      }

      // Apply grayscale if needed
      if (options.variant === 'grayscale') {
        card = await this.imageProcessor.grayscale(card);
      }

      // Set DPI
      card = await this.imageProcessor.setDpi(card, options.dpi || 300);

      return card;
    } catch (error) {
      logger.error('Back card render failed:', error);
      throw new Error('Failed to render back card');
    }
  }

  private async addBackText(card: Buffer, data: EfaydaData): Promise<Buffer> {
    // Format FIN with spaces: XXXX XXXX XXXX XXXX
    const formattedFin = this.formatFan(data.fin);
    
    const svg = `<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}">
      <!-- Phone Number -->
      <text x="42" y="68" font-family="Arial" font-size="22" font-weight="bold" fill="#1a1a1a">${this.escapeXml(data.phoneNumber)}</text>
      
      <!-- Nationality Amharic & English -->
      <text x="42" y="155" font-family="Nyala,Ebrima,Arial" font-size="24" font-weight="bold" fill="#1a1a1a">ኢትዮጵያ</text>
      <text x="130" y="155" font-family="Arial" font-size="22" fill="#1a1a1a">| ET</text>
      
      <!-- Region Amharic -->
      <text x="42" y="235" font-family="Nyala,Ebrima,Arial" font-size="22" font-weight="bold" fill="#1a1a1a">${this.escapeXml(this.getRegionAmharic(data.region))}</text>
      <!-- Region English -->
      <text x="42" y="265" font-family="Arial" font-size="20" fill="#1a1a1a">${this.escapeXml(data.region)}</text>
      
      <!-- City Amharic -->
      <text x="42" y="310" font-family="Nyala,Ebrima,Arial" font-size="22" font-weight="bold" fill="#1a1a1a">${this.escapeXml(this.getCityAmharic(data.city))}</text>
      <!-- City English -->
      <text x="42" y="340" font-family="Arial" font-size="20" fill="#1a1a1a">${this.escapeXml(data.city)}</text>
      
      <!-- Subcity Amharic -->
      <text x="42" y="385" font-family="Nyala,Ebrima,Arial" font-size="22" font-weight="bold" fill="#1a1a1a">${this.escapeXml(this.getSubcityAmharic(data.subcity))} ክ/ከተማ</text>
      <!-- Subcity English -->
      <text x="42" y="415" font-family="Arial" font-size="20" fill="#1a1a1a">${this.escapeXml(data.subcity)} Sub City</text>
      
      <!-- FIN Label and Number -->
      <text x="95" y="505" font-family="Arial,Consolas" font-size="24" font-weight="bold" fill="#1a1a1a">${formattedFin}</text>
      
      <!-- Serial Number -->
      <text x="870" y="590" font-family="Arial" font-size="20" font-weight="bold" fill="#1a1a1a">${this.escapeXml(data.serialNumber || '')}</text>
    </svg>`;

    return await sharp(card)
      .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
      .toBuffer();
  }

  private formatFan(fan: string): string {
    if (!fan) return '';
    const clean = fan.replace(/\s/g, '');
    return clean.match(/.{1,4}/g)?.join(' ') || clean;
  }

  private getRegionAmharic(region: string): string {
    const regionMap: Record<string, string> = {
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
    return regionMap[region] || region;
  }

  private getCityAmharic(city: string): string {
    const cityMap: Record<string, string> = {
      'Mekelle': 'መቐለ',
      'Addis Ababa': 'አዲስ አበባ',
      'Bahir Dar': 'ባህር ዳር',
      'Gondar': 'ጎንደር',
      'Hawassa': 'ሀዋሳ',
      'Dire Dawa': 'ድሬዳዋ',
      'Jimma': 'ጅማ',
      'Adama': 'አዳማ',
      'Harar': 'ሐረር',
      'Dessie': 'ደሴ'
    };
    return cityMap[city] || city;
  }

  private getSubcityAmharic(subcity: string): string {
    const subcityMap: Record<string, string> = {
      'Hadnet Sub City': 'ሓድነት',
      'Hadnet': 'ሓድነት',
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
    return subcityMap[subcity] || subcity.replace(' Sub City', '');
  }

  private async createFrontBackground(): Promise<Buffer> {
    // Fallback gradient background if template not found
    const svg = `<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#b8e6d4"/>
          <stop offset="100%" style="stop-color:#7dd3c0"/>
        </linearGradient>
      </defs>
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#bg)"/>
      <text x="300" y="60" font-family="Arial" font-size="24" fill="#333">Ethiopian Digital ID Card</text>
    </svg>`;
    return await sharp(Buffer.from(svg)).png().toBuffer();
  }

  private async createBackBackground(): Promise<Buffer> {
    const svg = `<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#b8e6d4"/>
          <stop offset="100%" style="stop-color:#7dd3c0"/>
        </linearGradient>
      </defs>
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#bg)"/>
    </svg>`;
    return await sharp(Buffer.from(svg)).png().toBuffer();
  }

  private escapeXml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  getCardDimensions(): { width: number; height: number } {
    return { width: CARD_WIDTH, height: CARD_HEIGHT };
  }
}

export default CardRenderer;
