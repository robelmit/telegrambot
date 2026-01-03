import sharp from 'sharp';
import { EfaydaData } from '../../types';
import { ImageProcessor } from './imageProcessor';
import logger from '../../utils/logger';

// ID Card dimensions (CR80 standard: 85.6mm x 53.98mm at 300 DPI)
const CARD_WIDTH = 1012;  // ~85.6mm at 300 DPI
const CARD_HEIGHT = 638;  // ~53.98mm at 300 DPI
const PHOTO_WIDTH = 180;
const PHOTO_HEIGHT = 220;

export interface CardRenderOptions {
  variant: 'color' | 'grayscale';
  dpi?: number;
}

export class CardRenderer {
  private imageProcessor: ImageProcessor;

  constructor() {
    this.imageProcessor = new ImageProcessor();
  }

  /**
   * Render the front side of the ID card
   */
  async renderFront(data: EfaydaData, options: CardRenderOptions = { variant: 'color' }): Promise<Buffer> {
    try {
      // Create base card with Ethiopian flag colors gradient background
      let card = await this.createFrontBackground();

      // Add photo if available
      if (data.photo) {
        const photoBuffer = typeof data.photo === 'string' 
          ? Buffer.from(data.photo, 'base64') 
          : data.photo;
        
        const maskedPhoto = await this.imageProcessor.applyRoundedMask(
          photoBuffer, 
          PHOTO_WIDTH, 
          PHOTO_HEIGHT, 
          8
        );
        
        card = await sharp(card)
          .composite([{ input: maskedPhoto, left: 40, top: 120 }])
          .toBuffer();
      }

      // Add text fields using SVG overlay
      card = await this.addFrontText(card, data);

      // Add barcode if available
      if (data.barcode) {
        card = await this.addBarcode(card, data.barcode);
      }

      // Convert to grayscale if needed
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

  /**
   * Render the back side of the ID card
   */
  async renderBack(data: EfaydaData, options: CardRenderOptions = { variant: 'color' }): Promise<Buffer> {
    try {
      // Create base card background
      let card = await this.createBackBackground();

      // Add text fields
      card = await this.addBackText(card, data);

      // Add QR code if available
      if (data.qrCode) {
        const qrBuffer = typeof data.qrCode === 'string'
          ? Buffer.from(data.qrCode, 'base64')
          : data.qrCode;
        
        const resizedQr = await this.imageProcessor.resize(qrBuffer, 150, 150);
        card = await sharp(card)
          .composite([{ input: resizedQr, left: CARD_WIDTH - 180, top: CARD_HEIGHT - 180 }])
          .toBuffer();
      }

      // Convert to grayscale if needed
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

  /**
   * Create front card background with Ethiopian theme
   */
  private async createFrontBackground(): Promise<Buffer> {
    // Create gradient-like background using SVG
    const svg = `
      <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f8f9fa;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#e9ecef;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#bgGrad)" rx="20" ry="20"/>
        
        <!-- Ethiopian flag stripe at top -->
        <rect x="0" y="0" width="${CARD_WIDTH}" height="8" fill="#078930" rx="20" ry="20"/>
        <rect x="0" y="8" width="${CARD_WIDTH}" height="8" fill="#FCDD09"/>
        <rect x="0" y="16" width="${CARD_WIDTH}" height="8" fill="#DA121A"/>
        
        <!-- Header -->
        <text x="${CARD_WIDTH/2}" y="55" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#1a1a1a">FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA</text>
        <text x="${CARD_WIDTH/2}" y="75" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#333">የኢትዮጵያ ፌዴራላዊ ዲሞክራሲያዊ ሪፐብሊክ</text>
        <text x="${CARD_WIDTH/2}" y="95" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#078930">NATIONAL ID CARD</text>
        
        <!-- Photo placeholder border -->
        <rect x="38" y="118" width="${PHOTO_WIDTH + 4}" height="${PHOTO_HEIGHT + 4}" fill="none" stroke="#078930" stroke-width="2" rx="10" ry="10"/>
      </svg>
    `;

    return await sharp(Buffer.from(svg))
      .png()
      .toBuffer();
  }

  /**
   * Create back card background
   */
  private async createBackBackground(): Promise<Buffer> {
    const svg = `
      <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f8f9fa;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#e9ecef;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#bgGrad)" rx="20" ry="20"/>
        
        <!-- Ethiopian flag stripe at bottom -->
        <rect x="0" y="${CARD_HEIGHT - 24}" width="${CARD_WIDTH}" height="8" fill="#078930"/>
        <rect x="0" y="${CARD_HEIGHT - 16}" width="${CARD_WIDTH}" height="8" fill="#FCDD09"/>
        <rect x="0" y="${CARD_HEIGHT - 8}" width="${CARD_WIDTH}" height="8" fill="#DA121A" rx="0" ry="20"/>
        
        <!-- Header -->
        <text x="${CARD_WIDTH/2}" y="40" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#1a1a1a">ADDITIONAL INFORMATION</text>
      </svg>
    `;

    return await sharp(Buffer.from(svg))
      .png()
      .toBuffer();
  }

  /**
   * Add text fields to front card
   */
  private async addFrontText(card: Buffer, data: EfaydaData): Promise<Buffer> {
    const textX = 250; // Start text after photo
    const labelColor = '#666666';
    const valueColor = '#1a1a1a';

    const svg = `
      <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}">
        <!-- Full Name -->
        <text x="${textX}" y="140" font-family="Arial, sans-serif" font-size="11" fill="${labelColor}">Full Name / ሙሉ ስም</text>
        <text x="${textX}" y="158" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${valueColor}">${this.escapeXml(data.fullNameEnglish)}</text>
        <text x="${textX}" y="176" font-family="Arial, sans-serif" font-size="13" fill="${valueColor}">${this.escapeXml(data.fullNameAmharic)}</text>
        
        <!-- Date of Birth -->
        <text x="${textX}" y="210" font-family="Arial, sans-serif" font-size="11" fill="${labelColor}">Date of Birth / የትውልድ ቀን</text>
        <text x="${textX}" y="228" font-family="Arial, sans-serif" font-size="13" fill="${valueColor}">${this.escapeXml(data.dateOfBirthGregorian)} (${this.escapeXml(data.dateOfBirthEthiopian)})</text>
        
        <!-- Sex -->
        <text x="${textX}" y="260" font-family="Arial, sans-serif" font-size="11" fill="${labelColor}">Sex / ጾታ</text>
        <text x="${textX}" y="278" font-family="Arial, sans-serif" font-size="13" fill="${valueColor}">${this.escapeXml(data.sex)}</text>
        
        <!-- FAN -->
        <text x="${textX}" y="310" font-family="Arial, sans-serif" font-size="11" fill="${labelColor}">FAN</text>
        <text x="${textX}" y="328" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="${valueColor}">${this.escapeXml(data.fan)}</text>
        
        <!-- Expiry Date -->
        <text x="${textX + 300}" y="260" font-family="Arial, sans-serif" font-size="11" fill="${labelColor}">Expiry / ያበቃበት</text>
        <text x="${textX + 300}" y="278" font-family="Arial, sans-serif" font-size="13" fill="${valueColor}">${this.escapeXml(data.expiryDate)}</text>
      </svg>
    `;

    return await sharp(card)
      .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
      .toBuffer();
  }

  /**
   * Add text fields to back card
   */
  private async addBackText(card: Buffer, data: EfaydaData): Promise<Buffer> {
    const labelColor = '#666666';
    const valueColor = '#1a1a1a';

    const svg = `
      <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}">
        <!-- Phone Number -->
        <text x="40" y="80" font-family="Arial, sans-serif" font-size="11" fill="${labelColor}">Phone / ስልክ</text>
        <text x="40" y="98" font-family="Arial, sans-serif" font-size="13" fill="${valueColor}">${this.escapeXml(data.phoneNumber)}</text>
        
        <!-- Nationality -->
        <text x="40" y="130" font-family="Arial, sans-serif" font-size="11" fill="${labelColor}">Nationality / ዜግነት</text>
        <text x="40" y="148" font-family="Arial, sans-serif" font-size="13" fill="${valueColor}">${this.escapeXml(data.nationality)}</text>
        
        <!-- Address -->
        <text x="40" y="180" font-family="Arial, sans-serif" font-size="11" fill="${labelColor}">Address / አድራሻ</text>
        <text x="40" y="198" font-family="Arial, sans-serif" font-size="13" fill="${valueColor}">${this.escapeXml(data.region)}, ${this.escapeXml(data.city)}</text>
        <text x="40" y="216" font-family="Arial, sans-serif" font-size="13" fill="${valueColor}">${this.escapeXml(data.subcity)}</text>
        
        <!-- FIN -->
        <text x="40" y="260" font-family="Arial, sans-serif" font-size="11" fill="${labelColor}">FIN</text>
        <text x="40" y="278" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="${valueColor}">${this.escapeXml(data.fin)}</text>
        
        <!-- FCN -->
        <text x="40" y="310" font-family="Arial, sans-serif" font-size="11" fill="${labelColor}">FCN</text>
        <text x="40" y="328" font-family="Arial, sans-serif" font-size="13" fill="${valueColor}">${this.escapeXml(data.fcn)}</text>
        
        <!-- Serial Number -->
        <text x="40" y="360" font-family="Arial, sans-serif" font-size="11" fill="${labelColor}">Serial No.</text>
        <text x="40" y="378" font-family="Arial, sans-serif" font-size="13" fill="${valueColor}">${this.escapeXml(data.serialNumber)}</text>
        
        <!-- Issue Date -->
        <text x="300" y="80" font-family="Arial, sans-serif" font-size="11" fill="${labelColor}">Issue Date / የተሰጠበት</text>
        <text x="300" y="98" font-family="Arial, sans-serif" font-size="13" fill="${valueColor}">${this.escapeXml(data.issueDate)}</text>
        
        <!-- Disclaimer -->
        <text x="40" y="${CARD_HEIGHT - 50}" font-family="Arial, sans-serif" font-size="9" fill="#999">This card is the property of the Federal Democratic Republic of Ethiopia.</text>
        <text x="40" y="${CARD_HEIGHT - 38}" font-family="Arial, sans-serif" font-size="9" fill="#999">If found, please return to the nearest government office.</text>
      </svg>
    `;

    return await sharp(card)
      .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
      .toBuffer();
  }

  /**
   * Add barcode to front card
   */
  private async addBarcode(card: Buffer, barcodeData: string): Promise<Buffer> {
    // Create a simple barcode representation using SVG
    // In production, use a proper barcode library
    const barcodeWidth = 200;
    const barcodeHeight = 40;
    const x = CARD_WIDTH - barcodeWidth - 40;
    const y = CARD_HEIGHT - barcodeHeight - 30;

    const svg = `
      <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}">
        <rect x="${x}" y="${y}" width="${barcodeWidth}" height="${barcodeHeight}" fill="#ffffff" stroke="#000000" stroke-width="1"/>
        <text x="${x + barcodeWidth/2}" y="${y + barcodeHeight + 12}" text-anchor="middle" font-family="monospace" font-size="10" fill="#333">${this.escapeXml(barcodeData.substring(0, 20))}</text>
      </svg>
    `;

    return await sharp(card)
      .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
      .toBuffer();
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Get card dimensions
   */
  getCardDimensions(): { width: number; height: number } {
    return { width: CARD_WIDTH, height: CARD_HEIGHT };
  }
}

export default CardRenderer;
