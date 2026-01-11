import PDFDocument from 'pdfkit';
import fs from 'fs';
import logger from '../../utils/logger';

// A4 dimensions
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;

export interface BulkPDFOptions {
  title?: string;
  author?: string;
}

export class BulkPDFService {
  /**
   * Combine multiple ID card images into a single PDF
   * Each card pair (front+back) goes on its own page
   */
  async combineIntoPDF(
    imagePaths: string[],
    outputPath: string,
    options: BulkPDFOptions = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 0,
          autoFirstPage: false,
          info: {
            Title: options.title || 'Bulk Ethiopian National ID Cards',
            Author: options.author || 'eFayda ID Generator',
            Subject: 'Combined National ID Cards for printing'
          }
        });

        const writeStream = fs.createWriteStream(outputPath);
        doc.pipe(writeStream);

        // Add each image on its own page
        for (let i = 0; i < imagePaths.length; i++) {
          const imagePath = imagePaths[i];
          
          if (!fs.existsSync(imagePath)) {
            logger.warn(`Image not found: ${imagePath}`);
            continue;
          }

          // Add new page
          doc.addPage();

          // Card dimensions (8.67cm × 5.47cm = 246pt × 155pt)
          const CARD_WIDTH_PT = 246;
          const CARD_HEIGHT_PT = 155;
          const GAP_PT = 30;
          const totalWidth = CARD_WIDTH_PT * 2 + GAP_PT;

          // Center the image
          const centerX = (A4_WIDTH_PT - totalWidth) / 2;
          const centerY = (A4_HEIGHT_PT - CARD_HEIGHT_PT) / 2;

          // Add the card image
          doc.image(imagePath, centerX, centerY, {
            width: totalWidth,
            height: CARD_HEIGHT_PT
          });

          // Add cutting guides
          this.addCuttingGuides(doc, centerX, centerY, CARD_WIDTH_PT, CARD_HEIGHT_PT, GAP_PT);

          // Add page number
          doc.fontSize(8)
             .fillColor('#999999')
             .text(
               `Page ${i + 1} of ${imagePaths.length}`,
               0,
               A4_HEIGHT_PT - 50,
               { align: 'center', width: A4_WIDTH_PT }
             );

          // Add footer
          doc.text(
            'Print at 100% scale. Cut along dashed lines. Card size: 8.67cm × 5.47cm',
            0,
            A4_HEIGHT_PT - 30,
            { align: 'center', width: A4_WIDTH_PT }
          );
        }

        doc.end();

        writeStream.on('finish', () => {
          logger.info(`Bulk PDF generated: ${outputPath} with ${imagePaths.length} pages`);
          resolve(outputPath);
        });

        writeStream.on('error', (error) => {
          logger.error('Bulk PDF write error:', error);
          reject(error);
        });
      } catch (error) {
        logger.error('Bulk PDF generation error:', error);
        reject(error);
      }
    });
  }

  /**
   * Add cutting guide lines to PDF
   */
  private addCuttingGuides(
    doc: PDFKit.PDFDocument,
    centerX: number,
    centerY: number,
    cardWidth: number,
    cardHeight: number,
    gap: number
  ): void {
    const totalWidth = cardWidth * 2 + gap;
    const margin = 15;

    doc.strokeColor('#cccccc')
       .lineWidth(0.5)
       .dash(5, { space: 3 });

    // Horizontal lines (top and bottom)
    doc.moveTo(centerX - margin, centerY - margin / 2)
       .lineTo(centerX + totalWidth + margin, centerY - margin / 2)
       .stroke();

    doc.moveTo(centerX - margin, centerY + cardHeight + margin / 2)
       .lineTo(centerX + totalWidth + margin, centerY + cardHeight + margin / 2)
       .stroke();

    // Vertical lines (left, middle, right)
    doc.moveTo(centerX - margin / 2, centerY - margin)
       .lineTo(centerX - margin / 2, centerY + cardHeight + margin)
       .stroke();

    // Middle cutting line
    const middleX = centerX + cardWidth + gap / 2;
    doc.moveTo(middleX, centerY - margin)
       .lineTo(middleX, centerY + cardHeight + margin)
       .stroke();

    doc.moveTo(centerX + totalWidth + margin / 2, centerY - margin)
       .lineTo(centerX + totalWidth + margin / 2, centerY + cardHeight + margin)
       .stroke();

    // Reset dash
    doc.undash();
  }

  /**
   * Combine multiple PNG images into a single multi-page PDF
   */
  async combineFromBuffers(
    imageBuffers: Buffer[],
    outputPath: string,
    options: BulkPDFOptions = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 0,
          autoFirstPage: false,
          info: {
            Title: options.title || 'Bulk Ethiopian National ID Cards',
            Author: options.author || 'eFayda ID Generator',
            Subject: 'Combined National ID Cards for printing'
          }
        });

        const writeStream = fs.createWriteStream(outputPath);
        doc.pipe(writeStream);

        // Add each image on its own page
        for (let i = 0; i < imageBuffers.length; i++) {
          const imageBuffer = imageBuffers[i];

          // Add new page
          doc.addPage();

          // Card dimensions
          const CARD_WIDTH_PT = 246;
          const CARD_HEIGHT_PT = 155;
          const GAP_PT = 30;
          const totalWidth = CARD_WIDTH_PT * 2 + GAP_PT;

          // Center the image
          const centerX = (A4_WIDTH_PT - totalWidth) / 2;
          const centerY = (A4_HEIGHT_PT - CARD_HEIGHT_PT) / 2;

          // Add the card image from buffer
          doc.image(imageBuffer, centerX, centerY, {
            width: totalWidth,
            height: CARD_HEIGHT_PT
          });

          // Add cutting guides
          this.addCuttingGuides(doc, centerX, centerY, CARD_WIDTH_PT, CARD_HEIGHT_PT, GAP_PT);

          // Add page number and footer
          doc.fontSize(8)
             .fillColor('#999999')
             .text(
               `Page ${i + 1} of ${imageBuffers.length}`,
               0,
               A4_HEIGHT_PT - 50,
               { align: 'center', width: A4_WIDTH_PT }
             )
             .text(
               'Print at 100% scale. Cut along dashed lines.',
               0,
               A4_HEIGHT_PT - 30,
               { align: 'center', width: A4_WIDTH_PT }
             );
        }

        doc.end();

        writeStream.on('finish', () => {
          logger.info(`Bulk PDF generated from buffers: ${outputPath}`);
          resolve(outputPath);
        });

        writeStream.on('error', reject);
      } catch (error) {
        logger.error('Bulk PDF from buffers error:', error);
        reject(error);
      }
    });
  }
}

export default BulkPDFService;
