"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageProcessor = void 0;
const sharp_1 = __importDefault(require("sharp"));
const canvas_1 = require("canvas");
const logger_1 = __importDefault(require("../../utils/logger"));
class ImageProcessor {
    /**
     * Mirror an image horizontally (flip) using canvas
     */
    async mirror(input) {
        try {
            const img = await (0, canvas_1.loadImage)(input);
            const canvas = (0, canvas_1.createCanvas)(img.width, img.height);
            const ctx = canvas.getContext('2d');
            // Flip horizontally
            ctx.translate(img.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0);
            return canvas.toBuffer('image/png');
        }
        catch (error) {
            logger_1.default.error('Image mirror failed:', error);
            throw new Error('Failed to mirror image');
        }
    }
    /**
     * Mirror using Sharp (alternative, faster for large images)
     */
    async mirrorSharp(input) {
        try {
            return await (0, sharp_1.default)(input)
                .flop()
                .toBuffer();
        }
        catch (error) {
            logger_1.default.error('Image mirror failed:', error);
            throw new Error('Failed to mirror image');
        }
    }
    /**
     * Convert image to grayscale
     */
    async grayscale(input) {
        try {
            return await (0, sharp_1.default)(input)
                .grayscale()
                .toBuffer();
        }
        catch (error) {
            logger_1.default.error('Grayscale conversion failed:', error);
            throw new Error('Failed to convert to grayscale');
        }
    }
    /**
     * Resize image while preserving aspect ratio
     */
    async resize(input, width, height) {
        try {
            return await (0, sharp_1.default)(input)
                .resize(width, height, {
                fit: 'inside',
                withoutEnlargement: false
            })
                .toBuffer();
        }
        catch (error) {
            logger_1.default.error('Image resize failed:', error);
            throw new Error('Failed to resize image');
        }
    }
    /**
     * Resize image to exact dimensions (may crop)
     */
    async resizeExact(input, width, height) {
        try {
            return await (0, sharp_1.default)(input)
                .resize(width, height, {
                fit: 'cover',
                position: 'center'
            })
                .toBuffer();
        }
        catch (error) {
            logger_1.default.error('Exact resize failed:', error);
            throw new Error('Failed to resize image');
        }
    }
    /**
     * Apply rounded corners mask to photo (for ID card photo)
     */
    async applyRoundedMask(input, width, height, radius = 10) {
        try {
            // Create rounded rectangle SVG mask
            const roundedMask = Buffer.from(`<svg width="${width}" height="${height}">
          <rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="white"/>
        </svg>`);
            // Resize input to target dimensions
            const resized = await (0, sharp_1.default)(input)
                .resize(width, height, { fit: 'cover', position: 'center' })
                .toBuffer();
            // Apply mask
            return await (0, sharp_1.default)(resized)
                .composite([{
                    input: roundedMask,
                    blend: 'dest-in'
                }])
                .png()
                .toBuffer();
        }
        catch (error) {
            logger_1.default.error('Rounded mask failed:', error);
            throw new Error('Failed to apply rounded mask');
        }
    }
    /**
     * Apply oval/ellipse mask to photo (alternative style)
     */
    async applyOvalMask(input, width, height) {
        try {
            // Create ellipse SVG mask
            const ovalMask = Buffer.from(`<svg width="${width}" height="${height}">
          <ellipse cx="${width / 2}" cy="${height / 2}" rx="${width / 2}" ry="${height / 2}" fill="white"/>
        </svg>`);
            // Resize input to target dimensions
            const resized = await (0, sharp_1.default)(input)
                .resize(width, height, { fit: 'cover', position: 'center' })
                .toBuffer();
            // Apply mask
            return await (0, sharp_1.default)(resized)
                .composite([{
                    input: ovalMask,
                    blend: 'dest-in'
                }])
                .png()
                .toBuffer();
        }
        catch (error) {
            logger_1.default.error('Oval mask failed:', error);
            throw new Error('Failed to apply oval mask');
        }
    }
    /**
     * Get image metadata
     */
    async getMetadata(input) {
        return await (0, sharp_1.default)(input).metadata();
    }
    /**
     * Ensure image is at specified DPI
     */
    async setDpi(input, dpi = 300) {
        try {
            return await (0, sharp_1.default)(input)
                .withMetadata({ density: dpi })
                .toBuffer();
        }
        catch (error) {
            logger_1.default.error('Set DPI failed:', error);
            throw new Error('Failed to set image DPI');
        }
    }
    /**
     * Convert image to PNG format
     */
    async toPng(input) {
        try {
            return await (0, sharp_1.default)(input)
                .png()
                .toBuffer();
        }
        catch (error) {
            logger_1.default.error('PNG conversion failed:', error);
            throw new Error('Failed to convert to PNG');
        }
    }
    /**
     * Composite multiple images together
     */
    async composite(base, overlays) {
        try {
            let image = (0, sharp_1.default)(base);
            const compositeInputs = overlays.map(overlay => ({
                input: overlay.input,
                left: overlay.left,
                top: overlay.top
            }));
            return await image
                .composite(compositeInputs)
                .toBuffer();
        }
        catch (error) {
            logger_1.default.error('Image composite failed:', error);
            throw new Error('Failed to composite images');
        }
    }
    /**
     * Create a blank canvas with specified color
     */
    async createCanvas(width, height, color = '#FFFFFF') {
        try {
            return await (0, sharp_1.default)({
                create: {
                    width,
                    height,
                    channels: 4,
                    background: color
                }
            })
                .png()
                .toBuffer();
        }
        catch (error) {
            logger_1.default.error('Canvas creation failed:', error);
            throw new Error('Failed to create canvas');
        }
    }
    /**
     * Add text to image using SVG overlay
     */
    async addText(input, text, x, y, options = {}) {
        try {
            const metadata = await (0, sharp_1.default)(input).metadata();
            const width = metadata.width || 800;
            const height = metadata.height || 600;
            const { fontSize = 14, fontFamily = 'Arial, sans-serif', color = '#000000', fontWeight = 'normal' } = options;
            // Escape special XML characters
            const escapedText = text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
            const textSvg = Buffer.from(`<svg width="${width}" height="${height}">
          <text x="${x}" y="${y}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${color}">${escapedText}</text>
        </svg>`);
            return await (0, sharp_1.default)(input)
                .composite([{ input: textSvg, left: 0, top: 0 }])
                .toBuffer();
        }
        catch (error) {
            logger_1.default.error('Add text failed:', error);
            throw new Error('Failed to add text to image');
        }
    }
}
exports.ImageProcessor = ImageProcessor;
exports.default = ImageProcessor;
//# sourceMappingURL=imageProcessor.js.map