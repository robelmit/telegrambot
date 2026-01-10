import PDFDocument from 'pdfkit';
import fs from 'fs';
import logger from '../../utils/logger';

// A4 dimensions at 300 DPI
const A4_WIDTH_PT = 595.28;  // 210mm in points
const A4_HEIGHT_PT = 841.89; // 297mm in points

// ID Card dimensions in points (at 72 DPI for PDF)
const CARD_WIDTH_PT = 243;   // ~85.6mm
const CARD_HEIGHT_PT = 153;  // ~53.98mm

export interface A4PDFOptions {
  title?: string;
  author?: string;
  subject?: string;
  mirrored?: boolean;
}

export class PDFGenerator {
  constructor() {
    // No initialization needed
  }

  /**
   * Generate A4 PDF with ID card images positioned for printing
   */
  async generateA4PDF(
    cardImagePath: string,
    outputPath: string,
    options: A4PDFOptions = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 0,
          info: {
            Title: options.title || 'Ethiopian National ID Card',
            Author: options.author || 'eFayda ID Generator',
            Subject: options.subject || 'National ID Card for printing'
          }
        });

        const writeStream = fs.createWriteStream(outputPath);
        doc.pipe(writeStream);

        // Calculate center position for the card
        const centerX = (A4_WIDTH_PT - CARD_WIDTH_PT * 2 - 20) / 2;
        const centerY = (A4_HEIGHT_PT - CARD_HEIGHT_PT) / 2;

        // Add the card image centered on the page
        // The image contains both front and back side by side
        doc.image(cardImagePath, centerX, centerY, {
          width: CARD_WIDTH_PT * 2 + 20,
          height: CARD_HEIGHT_PT
        });

        // Add cutting guides (dashed lines)
        doc.strokeColor('#cccccc')
           .lineWidth(0.5)
           .dash(5, { space: 3 });

        // Top cutting line
        doc.moveTo(centerX - 10, centerY - 5)
           .lineTo(centerX + CARD_WIDTH_PT * 2 + 30, centerY - 5)
           .stroke();

        // Bottom cutting line
        doc.moveTo(centerX - 10, centerY + CARD_HEIGHT_PT + 5)
           .lineTo(centerX + CARD_WIDTH_PT * 2 + 30, centerY + CARD_HEIGHT_PT + 5)
           .stroke();

        // Left cutting line
        doc.moveTo(centerX - 5, centerY - 10)
           .lineTo(centerX - 5, centerY + CARD_HEIGHT_PT + 10)
           .stroke();

        // Middle cutting line (between front and back)
        doc.moveTo(centerX + CARD_WIDTH_PT + 10, centerY - 10)
           .lineTo(centerX + CARD_WIDTH_PT + 10, centerY + CARD_HEIGHT_PT + 10)
           .stroke();

        // Right cutting line
        doc.moveTo(centerX + CARD_WIDTH_PT * 2 + 25, centerY - 10)
           .lineTo(centerX + CARD_WIDTH_PT * 2 + 25, centerY + CARD_HEIGHT_PT + 10)
           .stroke();

        // Add footer text
        doc.undash()
           .fontSize(8)
           .fillColor('#999999')
           .text(
             'Print at 100% scale. Cut along dashed lines.',
             0,
             A4_HEIGHT_PT - 30,
             { align: 'center', width: A4_WIDTH_PT }
           );

        doc.end();

        writeStream.on('finish', () => {
          logger.info(`A4 PDF generated: ${outputPath}`);
          resolve(outputPath);
        });

        writeStream.on('error', (error) => {
          logger.error('PDF write error:', error);
          reject(error);
        });
      } catch (error) {
        logger.error('PDF generation error:', error);
        reject(error);
      }
    });
  }

  /**
   * Generate A4 PDF from image buffer
   */
  async generateA4PDFFromBuffer(
    imageBuffer: Buffer,
    outputPath: string,
    options: A4PDFOptions = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 0,
          info: {
            Title: options.title || 'Ethiopian National ID Card',
            Author: options.author || 'eFayda ID Generator',
            Subject: options.subject || 'National ID Card for printing'
          }
        });

        const writeStream = fs.createWriteStream(outputPath);
        doc.pipe(writeStream);

        // Calculate center position
        const centerX = (A4_WIDTH_PT - CARD_WIDTH_PT * 2 - 20) / 2;
        const centerY = (A4_HEIGHT_PT - CARD_HEIGHT_PT) / 2;

        // Add the card image from buffer
        doc.image(imageBuffer, centerX, centerY, {
          width: CARD_WIDTH_PT * 2 + 20,
          height: CARD_HEIGHT_PT
        });

        // Add cutting guides
        this.addCuttingGuides(doc, centerX, centerY);

        // Add footer
        doc.undash()
           .fontSize(8)
           .fillColor('#999999')
           .text(
             'Print at 100% scale. Cut along dashed lines.',
             0,
             A4_HEIGHT_PT - 30,
             { align: 'center', width: A4_WIDTH_PT }
           );

        doc.end();

        writeStream.on('finish', () => {
          logger.info(`A4 PDF generated from buffer: ${outputPath}`);
          resolve(outputPath);
        });

        writeStream.on('error', reject);
      } catch (error) {
        logger.error('PDF generation from buffer error:', error);
        reject(error);
      }
    });
  }

  /**
   * Add cutting guide lines to PDF
   */
  private addCuttingGuides(doc: PDFKit.PDFDocument, centerX: number, centerY: number): void {
    doc.strokeColor('#cccccc')
       .lineWidth(0.5)
       .dash(5, { space: 3 });

    // Horizontal lines
    doc.moveTo(centerX - 10, centerY - 5)
       .lineTo(centerX + CARD_WIDTH_PT * 2 + 30, centerY - 5)
       .stroke();

    doc.moveTo(centerX - 10, centerY + CARD_HEIGHT_PT + 5)
       .lineTo(centerX + CARD_WIDTH_PT * 2 + 30, centerY + CARD_HEIGHT_PT + 5)
       .stroke();

    // Vertical lines
    doc.moveTo(centerX - 5, centerY - 10)
       .lineTo(centerX - 5, centerY + CARD_HEIGHT_PT + 10)
       .stroke();

    doc.moveTo(centerX + CARD_WIDTH_PT + 10, centerY - 10)
       .lineTo(centerX + CARD_WIDTH_PT + 10, centerY + CARD_HEIGHT_PT + 10)
       .stroke();

    doc.moveTo(centerX + CARD_WIDTH_PT * 2 + 25, centerY - 10)
       .lineTo(centerX + CARD_WIDTH_PT * 2 + 25, centerY + CARD_HEIGHT_PT + 10)
       .stroke();
  }

  /**
   * Get A4 page dimensions
   */
  getA4Dimensions(): { width: number; height: number; unit: string } {
    return {
      width: 210,
      height: 297,
      unit: 'mm'
    };
  }

  /**
   * Verify PDF is A4 size (for testing)
   */
  isA4Size(widthPt: number, heightPt: number): boolean {
    // Allow small tolerance for floating point comparison
    const tolerance = 1;
    return (
      Math.abs(widthPt - A4_WIDTH_PT) < tolerance &&
      Math.abs(heightPt - A4_HEIGHT_PT) < tolerance
    );
  }
}

export default PDFGenerator;
