import PDFDocument from 'pdfkit';
import fs from 'fs';
import logger from '../../utils/logger';

// A4 dimensions at 300 DPI
const A4_WIDTH_PT = 595.28;  // 210mm in points
const A4_HEIGHT_PT = 841.89; // 297mm in points

// ID Card dimensions in points (at 72 DPI for PDF)
// Standard ID card: 8.67cm x 5.47cm = 245.67pt x 155.01pt
const CARD_WIDTH_PT = 246;   // 8.67cm = ~86.7mm
const CARD_HEIGHT_PT = 155;  // 5.47cm = ~54.7mm

// Increased gap between cards for better transparency/cutting
const CARD_GAP_PT = 30;      // Gap between front and back cards
const CARD_MARGIN_PT = 15;   // Margin around cutting guides

// Multi-card layout settings
const CARDS_PER_PAGE = 5;    // 5 ID cards per page
const MULTI_CARD_GAP = 8;    // Gap between cards in multi-card layout
const PAGE_MARGIN = 20;      // Page margin for multi-card layout

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

        // Calculate center position for the card with increased gap
        const totalWidth = CARD_WIDTH_PT * 2 + CARD_GAP_PT;
        const centerX = (A4_WIDTH_PT - totalWidth) / 2;
        const centerY = (A4_HEIGHT_PT - CARD_HEIGHT_PT) / 2;

        // Add the card image centered on the page
        // The image contains both front and back side by side
        doc.image(cardImagePath, centerX, centerY, {
          width: totalWidth,
          height: CARD_HEIGHT_PT
        });

        // Add cutting guides with increased margins
        this.addCuttingGuides(doc, centerX, centerY);

        // Add footer text with print instructions
        doc.undash()
           .fontSize(8)
           .fillColor('#999999')
           .text(
             'Print at 100% scale. Cut along dashed lines. Card size: 8.67cm × 5.47cm',
             0,
             A4_HEIGHT_PT - 45,
             { align: 'center', width: A4_WIDTH_PT }
           )
           .fontSize(6)
           .text(
             'For consistent colors: Use "sRGB" color profile in printer settings. Disable printer color management.',
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

        // Calculate center position with increased gap
        const totalWidth = CARD_WIDTH_PT * 2 + CARD_GAP_PT;
        const centerX = (A4_WIDTH_PT - totalWidth) / 2;
        const centerY = (A4_HEIGHT_PT - CARD_HEIGHT_PT) / 2;

        // Add the card image from buffer
        doc.image(imageBuffer, centerX, centerY, {
          width: totalWidth,
          height: CARD_HEIGHT_PT
        });

        // Add cutting guides
        this.addCuttingGuides(doc, centerX, centerY);

        // Add footer with print instructions
        doc.undash()
           .fontSize(8)
           .fillColor('#999999')
           .text(
             'Print at 100% scale. Cut along dashed lines. Card size: 8.67cm × 5.47cm',
             0,
             A4_HEIGHT_PT - 45,
             { align: 'center', width: A4_WIDTH_PT }
           )
           .fontSize(6)
           .text(
             'For consistent colors: Use "sRGB" color profile in printer settings. Disable printer color management.',
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
   * Add cutting guide lines to PDF with increased margins for transparency
   */
  private addCuttingGuides(doc: PDFKit.PDFDocument, centerX: number, centerY: number): void {
    const totalWidth = CARD_WIDTH_PT * 2 + CARD_GAP_PT;
    
    doc.strokeColor('#cccccc')
       .lineWidth(0.5)
       .dash(5, { space: 3 });

    // Horizontal lines (top and bottom)
    doc.moveTo(centerX - CARD_MARGIN_PT, centerY - CARD_MARGIN_PT / 2)
       .lineTo(centerX + totalWidth + CARD_MARGIN_PT, centerY - CARD_MARGIN_PT / 2)
       .stroke();

    doc.moveTo(centerX - CARD_MARGIN_PT, centerY + CARD_HEIGHT_PT + CARD_MARGIN_PT / 2)
       .lineTo(centerX + totalWidth + CARD_MARGIN_PT, centerY + CARD_HEIGHT_PT + CARD_MARGIN_PT / 2)
       .stroke();

    // Vertical lines (left, middle, right)
    doc.moveTo(centerX - CARD_MARGIN_PT / 2, centerY - CARD_MARGIN_PT)
       .lineTo(centerX - CARD_MARGIN_PT / 2, centerY + CARD_HEIGHT_PT + CARD_MARGIN_PT)
       .stroke();

    // Middle cutting line (between front and back) - centered in the gap
    const middleX = centerX + CARD_WIDTH_PT + CARD_GAP_PT / 2;
    doc.moveTo(middleX, centerY - CARD_MARGIN_PT)
       .lineTo(middleX, centerY + CARD_HEIGHT_PT + CARD_MARGIN_PT)
       .stroke();

    doc.moveTo(centerX + totalWidth + CARD_MARGIN_PT / 2, centerY - CARD_MARGIN_PT)
       .lineTo(centerX + totalWidth + CARD_MARGIN_PT / 2, centerY + CARD_HEIGHT_PT + CARD_MARGIN_PT)
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

  /**
   * Generate combined A4 PDF with multiple ID cards (5 per page)
   * Each card image contains front+back side by side
   */
  async generateCombinedPDF(
    cardImagePaths: string[],
    outputPath: string,
    options: A4PDFOptions = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 0,
          info: {
            Title: options.title || 'Ethiopian National ID Cards - Bulk',
            Author: options.author || 'eFayda ID Generator',
            Subject: options.subject || 'National ID Cards for bulk printing'
          }
        });

        const writeStream = fs.createWriteStream(outputPath);
        doc.pipe(writeStream);

        // Calculate card dimensions for 5 cards per page
        // Each card has front+back side by side
        const totalCardWidth = CARD_WIDTH_PT * 2 + CARD_GAP_PT; // ~522pt
        const availableWidth = A4_WIDTH_PT - (PAGE_MARGIN * 2);
        const scale = Math.min(1, availableWidth / totalCardWidth);
        
        const scaledCardWidth = totalCardWidth * scale;
        const scaledCardHeight = CARD_HEIGHT_PT * scale;
        
        // Calculate vertical spacing for 5 cards
        const availableHeight = A4_HEIGHT_PT - (PAGE_MARGIN * 2) - 30; // 30pt for footer
        const totalCardsHeight = (scaledCardHeight * CARDS_PER_PAGE) + (MULTI_CARD_GAP * (CARDS_PER_PAGE - 1));
        const verticalScale = Math.min(1, availableHeight / totalCardsHeight);
        
        const finalCardHeight = scaledCardHeight * verticalScale;
        const finalCardWidth = scaledCardWidth * verticalScale;
        const finalGap = MULTI_CARD_GAP * verticalScale;
        
        const startX = (A4_WIDTH_PT - finalCardWidth) / 2;
        const startY = PAGE_MARGIN;

        // Add cards to pages
        let currentPage = 0;
        let cardOnPage = 0;

        for (let i = 0; i < cardImagePaths.length; i++) {
          const imagePath = cardImagePaths[i];
          
          // Check if file exists
          if (!fs.existsSync(imagePath)) {
            logger.warn(`Card image not found: ${imagePath}`);
            continue;
          }

          // Add new page if needed (except for first card)
          if (cardOnPage >= CARDS_PER_PAGE) {
            doc.addPage();
            currentPage++;
            cardOnPage = 0;
          }

          // Calculate Y position for this card
          const y = startY + (cardOnPage * (finalCardHeight + finalGap));

          // Add the card image
          doc.image(imagePath, startX, y, {
            width: finalCardWidth,
            height: finalCardHeight
          });

          // Add light cutting guide
          doc.strokeColor('#dddddd')
             .lineWidth(0.3)
             .dash(3, { space: 2 })
             .rect(startX - 2, y - 2, finalCardWidth + 4, finalCardHeight + 4)
             .stroke()
             .undash();

          cardOnPage++;
        }

        // Add footer on last page
        doc.undash()
           .fontSize(7)
           .fillColor('#999999')
           .text(
             `Bulk Print - ${cardImagePaths.length} ID card(s) | Print at 100% scale | Card size: 8.67cm × 5.47cm`,
             0,
             A4_HEIGHT_PT - 25,
             { align: 'center', width: A4_WIDTH_PT }
           );

        doc.end();

        writeStream.on('finish', () => {
          logger.info(`Combined PDF generated with ${cardImagePaths.length} cards: ${outputPath}`);
          resolve(outputPath);
        });

        writeStream.on('error', (error) => {
          logger.error('Combined PDF write error:', error);
          reject(error);
        });
      } catch (error) {
        logger.error('Combined PDF generation error:', error);
        reject(error);
      }
    });
  }

  /**
   * Generate combined PDF from image buffers
   */
  async generateCombinedPDFFromBuffers(
    imageBuffers: Buffer[],
    outputPath: string,
    options: A4PDFOptions = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 0,
          info: {
            Title: options.title || 'Ethiopian National ID Cards - Bulk',
            Author: options.author || 'eFayda ID Generator',
            Subject: options.subject || 'National ID Cards for bulk printing'
          }
        });

        const writeStream = fs.createWriteStream(outputPath);
        doc.pipe(writeStream);

        // Calculate dimensions (same as above)
        const totalCardWidth = CARD_WIDTH_PT * 2 + CARD_GAP_PT;
        const availableWidth = A4_WIDTH_PT - (PAGE_MARGIN * 2);
        const scale = Math.min(1, availableWidth / totalCardWidth);
        
        const scaledCardWidth = totalCardWidth * scale;
        const scaledCardHeight = CARD_HEIGHT_PT * scale;
        
        const availableHeight = A4_HEIGHT_PT - (PAGE_MARGIN * 2) - 30;
        const totalCardsHeight = (scaledCardHeight * CARDS_PER_PAGE) + (MULTI_CARD_GAP * (CARDS_PER_PAGE - 1));
        const verticalScale = Math.min(1, availableHeight / totalCardsHeight);
        
        const finalCardHeight = scaledCardHeight * verticalScale;
        const finalCardWidth = scaledCardWidth * verticalScale;
        const finalGap = MULTI_CARD_GAP * verticalScale;
        
        const startX = (A4_WIDTH_PT - finalCardWidth) / 2;
        const startY = PAGE_MARGIN;

        let cardOnPage = 0;

        for (let i = 0; i < imageBuffers.length; i++) {
          if (cardOnPage >= CARDS_PER_PAGE) {
            doc.addPage();
            cardOnPage = 0;
          }

          const y = startY + (cardOnPage * (finalCardHeight + finalGap));

          doc.image(imageBuffers[i], startX, y, {
            width: finalCardWidth,
            height: finalCardHeight
          });

          doc.strokeColor('#dddddd')
             .lineWidth(0.3)
             .dash(3, { space: 2 })
             .rect(startX - 2, y - 2, finalCardWidth + 4, finalCardHeight + 4)
             .stroke()
             .undash();

          cardOnPage++;
        }

        doc.undash()
           .fontSize(7)
           .fillColor('#999999')
           .text(
             `Bulk Print - ${imageBuffers.length} ID card(s) | Print at 100% scale`,
             0,
             A4_HEIGHT_PT - 25,
             { align: 'center', width: A4_WIDTH_PT }
           );

        doc.end();

        writeStream.on('finish', () => {
          logger.info(`Combined PDF generated from buffers: ${outputPath}`);
          resolve(outputPath);
        });

        writeStream.on('error', reject);
      } catch (error) {
        logger.error('Combined PDF from buffers error:', error);
        reject(error);
      }
    });
  }
}


export default PDFGenerator;
