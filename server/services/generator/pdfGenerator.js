"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PDFGenerator = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs_1 = __importDefault(require("fs"));
const logger_1 = __importDefault(require("../../utils/logger"));
// A4 dimensions at 72 DPI (PDF standard)
const A4_WIDTH_PT = 595.28; // 210mm in points
const A4_HEIGHT_PT = 841.89; // 297mm in points
// ID Card dimensions in points (72 DPI for PDF)
// Standard ID card: 8.67cm x 5.47cm
// 1cm = 28.3465pt, so:
// 8.67cm = 245.67pt, 5.47cm = 155.01pt
const CARD_WIDTH_CM = 8.67;
const CARD_HEIGHT_CM = 5.47;
const CM_TO_PT = 28.3465;
const CARD_WIDTH_PT = CARD_WIDTH_CM * CM_TO_PT; // 245.67pt
const CARD_HEIGHT_PT = CARD_HEIGHT_CM * CM_TO_PT; // 155.01pt
// Increased gap between cards for better transparency/cutting
const CARD_GAP_PT = 30; // Gap between front and back cards
const CARD_MARGIN_PT = 15; // Margin around cutting guides
// Multi-card layout settings
const CARDS_PER_PAGE = 5; // 5 ID cards per page
const MULTI_CARD_GAP = 8; // Gap between cards in multi-card layout
const PAGE_MARGIN = 20; // Page margin for multi-card layout
class PDFGenerator {
    constructor() {
        // No initialization needed
    }
    /**
     * Generate A4 PDF with ID card images positioned for printing
     */
    async generateA4PDF(cardImagePath, outputPath, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new pdfkit_1.default({
                    size: 'A4',
                    margin: 0,
                    info: {
                        Title: options.title || 'Ethiopian National ID Card',
                        Author: options.author || 'eFayda ID Generator',
                        Subject: options.subject || 'National ID Card for printing'
                    }
                });
                const writeStream = fs_1.default.createWriteStream(outputPath);
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
                    .fillColor('#666666')
                    .text('⚠️ IMPORTANT: Print at 100% scale (no fit/shrink). Do NOT select "Fit to Page".', 0, A4_HEIGHT_PT - 50, { align: 'center', width: A4_WIDTH_PT })
                    .text(`Card size: ${CARD_WIDTH_CM}cm × ${CARD_HEIGHT_CM}cm | Cut along dashed lines`, 0, A4_HEIGHT_PT - 38, { align: 'center', width: A4_WIDTH_PT })
                    .fontSize(6)
                    .fillColor('#999999')
                    .text('Printer settings: Scale=100%, Color=sRGB, Quality=Best', 0, A4_HEIGHT_PT - 25, { align: 'center', width: A4_WIDTH_PT });
                doc.end();
                writeStream.on('finish', () => {
                    logger_1.default.info(`A4 PDF generated: ${outputPath}`);
                    resolve(outputPath);
                });
                writeStream.on('error', (error) => {
                    logger_1.default.error('PDF write error:', error);
                    reject(error);
                });
            }
            catch (error) {
                logger_1.default.error('PDF generation error:', error);
                reject(error);
            }
        });
    }
    /**
     * Generate A4 PDF from image buffer
     */
    async generateA4PDFFromBuffer(imageBuffer, outputPath, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new pdfkit_1.default({
                    size: 'A4',
                    margin: 0,
                    info: {
                        Title: options.title || 'Ethiopian National ID Card',
                        Author: options.author || 'eFayda ID Generator',
                        Subject: options.subject || 'National ID Card for printing'
                    }
                });
                const writeStream = fs_1.default.createWriteStream(outputPath);
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
                    .fillColor('#666666')
                    .text('⚠️ IMPORTANT: Print at 100% scale (no fit/shrink). Do NOT select "Fit to Page".', 0, A4_HEIGHT_PT - 50, { align: 'center', width: A4_WIDTH_PT })
                    .text(`Card size: ${CARD_WIDTH_CM}cm × ${CARD_HEIGHT_CM}cm | Cut along dashed lines`, 0, A4_HEIGHT_PT - 38, { align: 'center', width: A4_WIDTH_PT })
                    .fontSize(6)
                    .fillColor('#999999')
                    .text('Printer settings: Scale=100%, Color=sRGB, Quality=Best', 0, A4_HEIGHT_PT - 25, { align: 'center', width: A4_WIDTH_PT });
                doc.end();
                writeStream.on('finish', () => {
                    logger_1.default.info(`A4 PDF generated from buffer: ${outputPath}`);
                    resolve(outputPath);
                });
                writeStream.on('error', reject);
            }
            catch (error) {
                logger_1.default.error('PDF generation from buffer error:', error);
                reject(error);
            }
        });
    }
    /**
     * Add cutting guide lines to PDF with increased margins for transparency
     */
    addCuttingGuides(doc, centerX, centerY) {
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
    getA4Dimensions() {
        return {
            width: 210,
            height: 297,
            unit: 'mm'
        };
    }
    /**
     * Verify PDF is A4 size (for testing)
     */
    isA4Size(widthPt, heightPt) {
        // Allow small tolerance for floating point comparison
        const tolerance = 1;
        return (Math.abs(widthPt - A4_WIDTH_PT) < tolerance &&
            Math.abs(heightPt - A4_HEIGHT_PT) < tolerance);
    }
    /**
     * Generate combined A4 PDF with multiple ID cards (5 per page)
     * Each card image contains front+back side by side
     */
    async generateCombinedPDF(cardImagePaths, outputPath, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new pdfkit_1.default({
                    size: 'A4',
                    margin: 0,
                    info: {
                        Title: options.title || 'Ethiopian National ID Cards - Bulk',
                        Author: options.author || 'eFayda ID Generator',
                        Subject: options.subject || 'National ID Cards for bulk printing'
                    }
                });
                const writeStream = fs_1.default.createWriteStream(outputPath);
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
                    if (!fs_1.default.existsSync(imagePath)) {
                        logger_1.default.warn(`Card image not found: ${imagePath}`);
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
                    .text(`Bulk Print - ${cardImagePaths.length} ID card(s) | Print at 100% scale | Card size: 8.67cm × 5.47cm`, 0, A4_HEIGHT_PT - 25, { align: 'center', width: A4_WIDTH_PT });
                doc.end();
                writeStream.on('finish', () => {
                    logger_1.default.info(`Combined PDF generated with ${cardImagePaths.length} cards: ${outputPath}`);
                    resolve(outputPath);
                });
                writeStream.on('error', (error) => {
                    logger_1.default.error('Combined PDF write error:', error);
                    reject(error);
                });
            }
            catch (error) {
                logger_1.default.error('Combined PDF generation error:', error);
                reject(error);
            }
        });
    }
    /**
     * Generate combined PDF from image buffers
     */
    async generateCombinedPDFFromBuffers(imageBuffers, outputPath, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new pdfkit_1.default({
                    size: 'A4',
                    margin: 0,
                    info: {
                        Title: options.title || 'Ethiopian National ID Cards - Bulk',
                        Author: options.author || 'eFayda ID Generator',
                        Subject: options.subject || 'National ID Cards for bulk printing'
                    }
                });
                const writeStream = fs_1.default.createWriteStream(outputPath);
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
                    .text(`Bulk Print - ${imageBuffers.length} ID card(s) | Print at 100% scale`, 0, A4_HEIGHT_PT - 25, { align: 'center', width: A4_WIDTH_PT });
                doc.end();
                writeStream.on('finish', () => {
                    logger_1.default.info(`Combined PDF generated from buffers: ${outputPath}`);
                    resolve(outputPath);
                });
                writeStream.on('error', reject);
            }
            catch (error) {
                logger_1.default.error('Combined PDF from buffers error:', error);
                reject(error);
            }
        });
    }
}
exports.PDFGenerator = PDFGenerator;
exports.default = PDFGenerator;
//# sourceMappingURL=pdfGenerator.js.map