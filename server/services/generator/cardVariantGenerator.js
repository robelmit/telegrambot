"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardVariantGenerator = void 0;
const sharp_1 = __importDefault(require("sharp"));
const cardRenderer_1 = require("./cardRenderer");
const logger_1 = __importDefault(require("../../utils/logger"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
class CardVariantGenerator {
    cardRenderer;
    outputDir;
    constructor(outputDir) {
        this.cardRenderer = new cardRenderer_1.CardRenderer();
        this.outputDir = outputDir || process.env.TEMP_DIR || 'temp';
    }
    /**
     * Generate color card variants (normal and mirrored for printing)
     */
    async generateColorVariants(data, template) {
        try {
            // Generate color cards
            const colorFront = await this.cardRenderer.renderFront(data, { variant: 'color', template });
            const colorBack = await this.cardRenderer.renderBack(data, { variant: 'color', template });
            // Normal: front and back side by side (back | front)
            const normalCombined = await this.combineCards(colorFront, colorBack, template, false);
            // Mirrored: back is flipped horizontally for printing (back_flipped | front)
            const mirroredCombined = await this.combineCards(colorFront, colorBack, template, true);
            logger_1.default.info('Generated color card variants (normal + mirrored for printing)');
            return {
                normalCombined,
                mirroredCombined
            };
        }
        catch (error) {
            logger_1.default.error('Failed to generate color variants:', error);
            throw new Error('Failed to generate ID cards');
        }
    }
    /**
     * Combine front and back cards into a single image (side by side)
     * @param mirrored - If true, flip both cards horizontally for printing
     * Output maintains 300 DPI for proper printing
     * Standard card size: 8.67cm × 5.47cm = 1024×646px at 300 DPI
     *
     * BLEED AREA: Each card has bleed on ALL edges (3mm = ~35px at 300 DPI)
     * so when cut, there's card content at edges instead of white paper
     */
    async combineCards(front, back, template, mirrored = false) {
        try {
            const { width, height } = (0, cardRenderer_1.getCardDimensions)(template);
            const gap = 80; // Good spacing between cards for cutting
            const padding = 30; // Padding around the entire image
            // Bleed area: 3mm = ~35px at 300 DPI (standard print bleed)
            // Applied to ALL edges of EACH card
            const bleed = 35;
            // Process cards (flip if mirrored)
            let processedFront;
            let processedBack;
            if (mirrored) {
                processedFront = await (0, sharp_1.default)(front).flop().toBuffer();
                processedBack = await (0, sharp_1.default)(back).flop().toBuffer();
            }
            else {
                processedFront = front;
                processedBack = back;
            }
            // Add bleed to each card individually
            const frontWithBleed = await (0, sharp_1.default)(processedFront)
                .extend({
                top: bleed,
                bottom: bleed,
                left: bleed,
                right: bleed,
                extendWith: 'mirror'
            })
                .toBuffer();
            const backWithBleed = await (0, sharp_1.default)(processedBack)
                .extend({
                top: bleed,
                bottom: bleed,
                left: bleed,
                right: bleed,
                extendWith: 'mirror'
            })
                .toBuffer();
            // Card dimensions with bleed
            const cardWithBleedWidth = width + bleed * 2;
            const cardWithBleedHeight = height + bleed * 2;
            // Total dimensions
            const totalWidth = cardWithBleedWidth * 2 + gap + (padding * 2);
            const totalHeight = cardWithBleedHeight + (padding * 2);
            // Create canvas with white background
            const canvas = await (0, sharp_1.default)({
                create: {
                    width: totalWidth,
                    height: totalHeight,
                    channels: 4,
                    background: { r: 255, g: 255, b: 255, alpha: 1 }
                }
            }).png().toBuffer();
            // Composite cards with bleed (back on left, front on right)
            return await (0, sharp_1.default)(canvas)
                .composite([
                { input: backWithBleed, left: padding, top: padding },
                { input: frontWithBleed, left: padding + cardWithBleedWidth + gap, top: padding }
            ])
                .withMetadata({ density: 300 })
                .png({
                compressionLevel: 9,
                effort: 10
            })
                .toBuffer();
        }
        catch (error) {
            logger_1.default.error('Failed to combine cards:', error);
            throw new Error('Failed to combine front and back cards');
        }
    }
    /**
     * Save generated files to disk and return file paths
     * Generates: normal PNG, mirrored PNG, normal PDF, mirrored PDF (all color)
     */
    async saveToFiles(data, jobId, template) {
        try {
            // Ensure output directory exists
            await promises_1.default.mkdir(this.outputDir, { recursive: true });
            // Generate color variants (normal and mirrored)
            const { normalCombined, mirroredCombined } = await this.generateColorVariants(data, template);
            // Generate safe filename from user name
            const safeName = this.sanitizeFilename(data.fullNameEnglish);
            // Define file paths
            const colorNormalPngPath = path_1.default.join(this.outputDir, `${jobId}_${safeName}_normal.png`);
            const colorMirroredPngPath = path_1.default.join(this.outputDir, `${jobId}_${safeName}_mirrored.png`);
            // Save PNG files (no compression - templates already optimized)
            await this.savePng(normalCombined, colorNormalPngPath);
            await this.savePng(mirroredCombined, colorMirroredPngPath);
            // PDF paths will be generated by PDFGenerator
            const colorNormalPdfPath = path_1.default.join(this.outputDir, `${jobId}_${safeName}_normal_A4.pdf`);
            const colorMirroredPdfPath = path_1.default.join(this.outputDir, `${jobId}_${safeName}_mirrored_A4.pdf`);
            return {
                colorNormalPng: colorNormalPngPath,
                colorMirroredPng: colorMirroredPngPath,
                colorNormalPdf: colorNormalPdfPath,
                colorMirroredPdf: colorMirroredPdfPath
            };
        }
        catch (error) {
            logger_1.default.error('Failed to save files:', error);
            throw new Error('Failed to save generated files');
        }
    }
    /**
     * Save PNG with good compression - templates are already optimized
     * Embed sRGB color profile for consistent printing
     */
    async savePng(imageBuffer, outputPath) {
        try {
            const result = await (0, sharp_1.default)(imageBuffer)
                .withMetadata({ density: 300 })
                .toColorspace('srgb')
                .png({
                compressionLevel: 9,
                effort: 10,
                palette: false
            })
                .toBuffer();
            await promises_1.default.writeFile(outputPath, result);
            const finalSize = Math.round(result.length / 1024);
            logger_1.default.info(`Saved PNG: ${outputPath} (${finalSize}KB)`);
        }
        catch (error) {
            logger_1.default.error('PNG save failed:', error);
            // Fallback to direct write
            await promises_1.default.writeFile(outputPath, imageBuffer);
        }
    }
    /**
     * Sanitize filename to remove invalid characters
     */
    sanitizeFilename(name) {
        return name
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 50);
    }
    /**
     * Get image resolution/DPI
     */
    async getImageResolution(imageBuffer) {
        const metadata = await (0, sharp_1.default)(imageBuffer).metadata();
        return {
            width: metadata.width || 0,
            height: metadata.height || 0,
            dpi: metadata.density || 72
        };
    }
}
exports.CardVariantGenerator = CardVariantGenerator;
exports.default = CardVariantGenerator;
//# sourceMappingURL=cardVariantGenerator.js.map