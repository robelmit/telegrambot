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
     * Generate all card variants (color/grayscale, normal/mirrored)
     * NOTE: "Mirrored" variants are now the same as normal (no flipping)
     */
    async generateAllVariants(data, template) {
        try {
            // Generate color variants
            const colorFront = await this.cardRenderer.renderFront(data, { variant: 'color', template });
            const colorBack = await this.cardRenderer.renderBack(data, { variant: 'color', template });
            // Generate grayscale variants
            const grayscaleFront = await this.cardRenderer.renderFront(data, { variant: 'grayscale', template });
            const grayscaleBack = await this.cardRenderer.renderBack(data, { variant: 'grayscale', template });
            // Combine front and back into single images (NO mirroring)
            const colorNormalCombined = await this.combineCards(colorFront, colorBack, template);
            const grayscaleNormalCombined = await this.combineCards(grayscaleFront, grayscaleBack, template);
            return {
                colorNormal: {
                    front: colorFront,
                    back: colorBack,
                    combined: colorNormalCombined
                },
                colorMirrored: {
                    front: colorFront,
                    back: colorBack,
                    combined: colorNormalCombined
                },
                grayscaleNormal: {
                    front: grayscaleFront,
                    back: grayscaleBack,
                    combined: grayscaleNormalCombined
                },
                grayscaleMirrored: {
                    front: grayscaleFront,
                    back: grayscaleBack,
                    combined: grayscaleNormalCombined
                }
            };
        }
        catch (error) {
            logger_1.default.error('Failed to generate card variants:', error);
            throw new Error('Failed to generate ID card variants');
        }
    }
    /**
     * Generate mirrored variants only (as per requirements)
     * NOTE: Changed to generate NORMAL (non-mirrored) variants based on user feedback
     */
    async generateMirroredVariants(data, template) {
        try {
            // Generate color cards
            const colorFront = await this.cardRenderer.renderFront(data, { variant: 'color', template });
            const colorBack = await this.cardRenderer.renderBack(data, { variant: 'color', template });
            // Generate grayscale cards
            const grayscaleFront = await this.cardRenderer.renderFront(data, { variant: 'grayscale', template });
            const grayscaleBack = await this.cardRenderer.renderBack(data, { variant: 'grayscale', template });
            // Combine front and back (NO mirroring - return normal images)
            const colorCombined = await this.combineCards(colorFront, colorBack, template);
            const grayscaleCombined = await this.combineCards(grayscaleFront, grayscaleBack, template);
            return {
                colorMirrored: colorCombined,
                grayscaleMirrored: grayscaleCombined
            };
        }
        catch (error) {
            logger_1.default.error('Failed to generate mirrored variants:', error);
            throw new Error('Failed to generate mirrored ID cards');
        }
    }
    /**
     * Combine front and back cards into a single image (side by side like the example PNG)
     * Output is scaled to a reasonable size for delivery
     */
    async combineCards(front, back, template) {
        try {
            const { width, height } = (0, cardRenderer_1.getCardDimensions)(template);
            const gap = 30; // Gap between cards
            const totalWidth = width * 2 + gap;
            // Target output width (standard size for all templates)
            const targetWidth = 2054; // Same as Template 1 combined width
            const scale = targetWidth / totalWidth;
            const targetHeight = Math.round(height * scale);
            const scaledGap = Math.round(gap * scale);
            const scaledWidth = Math.round(width * scale);
            // Scale front and back images first
            const scaledFront = await (0, sharp_1.default)(front)
                .resize(scaledWidth, targetHeight)
                .toBuffer();
            const scaledBack = await (0, sharp_1.default)(back)
                .resize(scaledWidth, targetHeight)
                .toBuffer();
            // Create canvas (horizontal layout like the example PNG)
            const canvas = await (0, sharp_1.default)({
                create: {
                    width: targetWidth,
                    height: targetHeight,
                    channels: 4,
                    background: { r: 255, g: 255, b: 255, alpha: 1 }
                }
            })
                .png()
                .toBuffer();
            // Composite front and back (side by side)
            return await (0, sharp_1.default)(canvas)
                .composite([
                { input: scaledBack, left: 0, top: 0 }, // Back card on left
                { input: scaledFront, left: scaledWidth + scaledGap, top: 0 } // Front card on right
            ])
                .png()
                .toBuffer();
        }
        catch (error) {
            logger_1.default.error('Failed to combine cards:', error);
            throw new Error('Failed to combine front and back cards');
        }
    }
    /**
     * Save generated files to disk and return file paths
     */
    async saveToFiles(data, jobId, template) {
        try {
            // Ensure output directory exists
            await promises_1.default.mkdir(this.outputDir, { recursive: true });
            // Generate mirrored variants
            const { colorMirrored, grayscaleMirrored } = await this.generateMirroredVariants(data, template);
            // Generate safe filename from user name
            const safeName = this.sanitizeFilename(data.fullNameEnglish);
            // Define file paths
            const colorMirroredPngPath = path_1.default.join(this.outputDir, `${jobId}_${safeName}_color_mirrored.png`);
            const grayscaleMirroredPngPath = path_1.default.join(this.outputDir, `${jobId}_${safeName}_grayscale_mirrored.png`);
            // Save PNG files with 300 DPI
            await (0, sharp_1.default)(colorMirrored)
                .withMetadata({ density: 300 })
                .png()
                .toFile(colorMirroredPngPath);
            await (0, sharp_1.default)(grayscaleMirrored)
                .withMetadata({ density: 300 })
                .png()
                .toFile(grayscaleMirroredPngPath);
            // PDF paths will be generated by PDFGenerator
            const colorMirroredPdfPath = path_1.default.join(this.outputDir, `${jobId}_${safeName}_color_mirrored_A4.pdf`);
            const grayscaleMirroredPdfPath = path_1.default.join(this.outputDir, `${jobId}_${safeName}_grayscale_mirrored_A4.pdf`);
            return {
                colorMirroredPng: colorMirroredPngPath,
                grayscaleMirroredPng: grayscaleMirroredPngPath,
                colorMirroredPdf: colorMirroredPdfPath,
                grayscaleMirroredPdf: grayscaleMirroredPdfPath
            };
        }
        catch (error) {
            logger_1.default.error('Failed to save files:', error);
            throw new Error('Failed to save generated files');
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