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
// Gap and padding must match PNG dimensions (80px gap, 30px padding at 300 DPI)
// 80px at 300 DPI = 80/300 * 2.54cm = 0.677cm = 19.20pt
// 30px at 300 DPI = 30/300 * 2.54cm = 0.254cm = 7.20pt
const CARD_GAP_PT = 19.20; // Gap between front and back cards (matches 80px at 300dpi)
const CARD_MARGIN_PT = 7.20; // Margin around cutting guides (matches 30px at 300dpi)
// Bleed area: 3mm = ~35px at 300 DPI = 8.40pt
// Cards are scaled up by this amount so content extends beyond cut line
const BLEED_PT = 8.40; // Bleed area in points (35px at 300dpi)
// Multi-card layout settings
const CARDS_PER_PAGE = 4; // 4 ID cards per page (with bleed area)
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
                // Position card at top of page with margin
                // Each card has bleed on ALL edges (35px = ~8.40pt)
                // Card with bleed: (1024 + 70) x (646 + 70) = 1094 x 716 px per card
                // Total: (1094*2 + 80 + 60) x (716 + 60) = 2328 x 776 px
                const cardWidthWithBleed = CARD_WIDTH_PT + (BLEED_PT * 2);
                const cardHeightWithBleed = CARD_HEIGHT_PT + (BLEED_PT * 2);
                const totalWidthWithPadding = cardWidthWithBleed * 2 + CARD_GAP_PT + (CARD_MARGIN_PT * 2);
                const totalHeightWithPadding = cardHeightWithBleed + (CARD_MARGIN_PT * 2);
                const topMargin = 30; // 30pt margin from top
                const startX = (A4_WIDTH_PT - totalWidthWithPadding) / 2; // Center horizontally
                const startY = topMargin; // Start from top with margin
                // Add the card image at top of page
                // The image contains both front and back side by side with padding and bleed
                doc.image(cardImagePath, startX, startY, {
                    width: totalWidthWithPadding,
                    height: totalHeightWithPadding
                });
                // Add cutting guides (at original card size, inside the bleed area)
                this.addCuttingGuides(doc, startX, startY);
                // Add footer text with print instructions
                doc.undash()
                    .fontSize(10)
                    .fillColor('#CC0000')
                    .text('⚠️ CRITICAL: Print at ACTUAL SIZE (100% scale). DO NOT use "Fit to Page"!', 0, A4_HEIGHT_PT - 60, { align: 'center', width: A4_WIDTH_PT })
                    .fontSize(8)
                    .fillColor('#666666')
                    .text(`Card size: ${CARD_WIDTH_CM}cm × ${CARD_HEIGHT_CM}cm | Measure with ruler after printing`, 0, A4_HEIGHT_PT - 42, { align: 'center', width: A4_WIDTH_PT })
                    .fontSize(7)
                    .fillColor('#999999')
                    .text('Printer: Scale=100%, Paper=A4, No margins. If cards are smaller, your printer scaled them.', 0, A4_HEIGHT_PT - 28, { align: 'center', width: A4_WIDTH_PT });
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
                // Position card at top of page with margin (each card has bleed on all edges)
                const cardWidthWithBleed = CARD_WIDTH_PT + (BLEED_PT * 2);
                const cardHeightWithBleed = CARD_HEIGHT_PT + (BLEED_PT * 2);
                const totalWidthWithPadding = cardWidthWithBleed * 2 + CARD_GAP_PT + (CARD_MARGIN_PT * 2);
                const totalHeightWithPadding = cardHeightWithBleed + (CARD_MARGIN_PT * 2);
                const topMargin = 30; // 30pt margin from top
                const startX = (A4_WIDTH_PT - totalWidthWithPadding) / 2; // Center horizontally
                const startY = topMargin; // Start from top with margin
                // Add the card image from buffer
                doc.image(imageBuffer, startX, startY, {
                    width: totalWidthWithPadding,
                    height: totalHeightWithPadding
                });
                // Add cutting guides (at original card size, inside the bleed area)
                this.addCuttingGuides(doc, startX, startY);
                // Add footer with print instructions
                doc.undash()
                    .fontSize(10)
                    .fillColor('#CC0000')
                    .text('⚠️ CRITICAL: Print at ACTUAL SIZE (100% scale). DO NOT use "Fit to Page"!', 0, A4_HEIGHT_PT - 60, { align: 'center', width: A4_WIDTH_PT })
                    .fontSize(8)
                    .fillColor('#666666')
                    .text(`Card size: ${CARD_WIDTH_CM}cm × ${CARD_HEIGHT_CM}cm | Measure with ruler after printing`, 0, A4_HEIGHT_PT - 42, { align: 'center', width: A4_WIDTH_PT })
                    .fontSize(7)
                    .fillColor('#999999')
                    .text('Printer: Scale=100%, Paper=A4, No margins. If cards are smaller, your printer scaled them.', 0, A4_HEIGHT_PT - 28, { align: 'center', width: A4_WIDTH_PT });
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
     * Add cutting guide lines to PDF
     * Guides are drawn at the original card size (inside the bleed area of each card)
     * Each card has bleed on all edges so cutting imprecision shows card content
     */
    addCuttingGuides(doc, centerX, centerY) {
        // The centerX/centerY point to the top-left of the padded image
        // Each card has bleed, so the actual card content starts at padding + bleed
        const cardStartX = centerX + CARD_MARGIN_PT + BLEED_PT;
        const cardStartY = centerY + CARD_MARGIN_PT + BLEED_PT;
        doc.strokeColor('#cccccc')
            .lineWidth(0.5)
            .dash(5, { space: 3 });
        // Horizontal lines (top and bottom of cards - at original size)
        // These span across both cards
        const totalWidth = CARD_WIDTH_PT * 2 + CARD_GAP_PT + (BLEED_PT * 2);
        doc.moveTo(cardStartX - 5, cardStartY)
            .lineTo(cardStartX + totalWidth + 5, cardStartY)
            .stroke();
        doc.moveTo(cardStartX - 5, cardStartY + CARD_HEIGHT_PT)
            .lineTo(cardStartX + totalWidth + 5, cardStartY + CARD_HEIGHT_PT)
            .stroke();
        // Vertical lines for back card (left edge)
        doc.moveTo(cardStartX, cardStartY - 5)
            .lineTo(cardStartX, cardStartY + CARD_HEIGHT_PT + 5)
            .stroke();
        // Vertical line for back card right edge / gap start
        const backCardRightX = cardStartX + CARD_WIDTH_PT;
        doc.moveTo(backCardRightX, cardStartY - 5)
            .lineTo(backCardRightX, cardStartY + CARD_HEIGHT_PT + 5)
            .stroke();
        // Vertical line for front card left edge (after gap and back card's right bleed)
        const frontCardLeftX = cardStartX + CARD_WIDTH_PT + BLEED_PT * 2 + CARD_GAP_PT;
        doc.moveTo(frontCardLeftX, cardStartY - 5)
            .lineTo(frontCardLeftX, cardStartY + CARD_HEIGHT_PT + 5)
            .stroke();
        // Vertical line for front card right edge
        const frontCardRightX = frontCardLeftX + CARD_WIDTH_PT;
        doc.moveTo(frontCardRightX, cardStartY - 5)
            .lineTo(frontCardRightX, cardStartY + CARD_HEIGHT_PT + 5)
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
                // Calculate card dimensions for 4 cards per page
                // Each card has bleed on ALL edges
                const cardWidthWithBleed = CARD_WIDTH_PT + (BLEED_PT * 2);
                const cardHeightWithBleed = CARD_HEIGHT_PT + (BLEED_PT * 2);
                const totalCardWidth = cardWidthWithBleed * 2 + CARD_GAP_PT;
                const availableWidth = A4_WIDTH_PT - (PAGE_MARGIN * 2);
                const scale = Math.min(1, availableWidth / totalCardWidth);
                const scaledCardWidth = totalCardWidth * scale;
                const scaledCardHeight = cardHeightWithBleed * scale;
                // Calculate vertical spacing for 4 cards
                const availableHeight = A4_HEIGHT_PT - (PAGE_MARGIN * 2);
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
                // Calculate dimensions (each card has bleed on ALL edges)
                const cardWidthWithBleed = CARD_WIDTH_PT + (BLEED_PT * 2);
                const cardHeightWithBleed = CARD_HEIGHT_PT + (BLEED_PT * 2);
                const totalCardWidth = cardWidthWithBleed * 2 + CARD_GAP_PT;
                const availableWidth = A4_WIDTH_PT - (PAGE_MARGIN * 2);
                const scale = Math.min(1, availableWidth / totalCardWidth);
                const scaledCardWidth = totalCardWidth * scale;
                const scaledCardHeight = cardHeightWithBleed * scale;
                const availableHeight = A4_HEIGHT_PT - (PAGE_MARGIN * 2);
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