"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardRenderer = void 0;
exports.registerFonts = registerFonts;
exports.getCardDimensions = getCardDimensions;
exports.getAvailableTemplates = getAvailableTemplates;
/**
 * Card Renderer - EXACTLY like test-pdf-full.ts from commit a8d0b98
 */
const canvas_1 = require("canvas");
const logger_1 = __importDefault(require("../../utils/logger"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const jsbarcode_1 = __importDefault(require("jsbarcode"));
const qrcode_1 = __importDefault(require("qrcode"));
const sharp_1 = __importDefault(require("sharp"));
const background_removal_node_1 = require("@imgly/background-removal-node");
// Load layout configs
const layoutConfigs = {
    template0: JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, '../../config/cardLayout.json'), 'utf-8')),
    template1: JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, '../../config/cardLayout1.json'), 'utf-8')),
    template2: JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, '../../config/cardLayout2.json'), 'utf-8'))
};
// Default layout for backward compatibility
const layout = layoutConfigs.template0;
const { dimensions } = layout;
const FONTS_DIR = path_1.default.join(process.cwd(), 'assets/fonts');
const TEMPLATE_DIR = path_1.default.join(process.cwd(), 'assets');
let fontsRegistered = false;
function registerFonts() {
    if (fontsRegistered)
        return;
    try {
        const fontFiles = [
            { file: 'nyala.ttf', family: 'Nyala', weight: 'normal' },
            { file: 'ARIAL.TTF', family: 'Arial', weight: 'normal' },
            { file: 'ARIALBD.TTF', family: 'Arial', weight: 'bold' },
            { file: 'ebrima.ttf', family: 'Ebrima', weight: 'normal' },
            { file: 'Inter-Regular.otf', family: 'Inter', weight: 'normal' },
            { file: 'Inter-Bold.otf', family: 'Inter', weight: 'bold' },
            { file: 'Inter-SemiBold.otf', family: 'Inter', weight: '600' },
            { file: 'Inter-Medium.otf', family: 'Inter', weight: '500' },
            { file: 'OCR.ttf', family: 'OCR-B', weight: 'normal' },
        ];
        for (const font of fontFiles) {
            const fontPath = path_1.default.join(FONTS_DIR, font.file);
            if (fs_1.default.existsSync(fontPath)) {
                (0, canvas_1.registerFont)(fontPath, { family: font.family, weight: font.weight });
                logger_1.default.info(`Registered font: ${font.file}`);
            }
            else {
                logger_1.default.warn(`Font not found: ${fontPath}`);
            }
        }
        fontsRegistered = true;
    }
    catch (error) {
        logger_1.default.warn('Font registration failed:', error);
    }
}
// Grayscale conversion is now done in removeBackgroundSharp function
/**
 * Remove background using AI-based @imgly/background-removal-node
 * Uses 'small' model for lower RAM usage (~500MB vs ~2GB for large)
 * Falls back to flood-fill method if AI fails
 */
async function removeBackgroundAI(photoBuffer) {
    try {
        logger_1.default.info('Using AI background removal (medium model)...');
        // Convert buffer to blob for the library
        const blob = new Blob([photoBuffer], { type: 'image/png' });
        // Remove background using AI with medium model for better quality
        const resultBlob = await (0, background_removal_node_1.removeBackground)(blob, {
            model: 'medium', // Options: 'small', 'medium', 'large' - medium uses ~1GB RAM
            output: {
                format: 'image/png',
                quality: 1
            }
        });
        // Convert blob back to buffer
        const arrayBuffer = await resultBlob.arrayBuffer();
        const resultBuffer = Buffer.from(arrayBuffer);
        // Convert to grayscale while preserving alpha
        const { data, info } = await (0, sharp_1.default)(resultBuffer)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
        const pixels = Buffer.from(data);
        const width = info.width;
        const height = info.height;
        // Convert to grayscale
        for (let i = 0; i < width * height * 4; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            pixels[i] = gray;
            pixels[i + 1] = gray;
            pixels[i + 2] = gray;
            // Alpha preserved
        }
        const finalResult = await (0, sharp_1.default)(pixels, {
            raw: { width, height, channels: 4 }
        }).png().toBuffer();
        logger_1.default.info('AI background removal successful');
        return finalResult;
    }
    catch (error) {
        logger_1.default.warn('AI background removal failed, falling back to flood-fill:', error);
        return removeBackgroundFloodFill(photoBuffer);
    }
}
/**
 * Remove background (white OR black) using sharp - flood fill from edges, then convert to grayscale
 * Automatically detects whether background is white or black based on edge pixels
 * This is the fallback method when AI removal fails
 */
async function removeBackgroundFloodFill(photoBuffer) {
    try {
        const { data, info } = await (0, sharp_1.default)(photoBuffer)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
        const width = info.width;
        const height = info.height;
        const pixels = Buffer.from(data);
        // Helper to get pixel index
        const getIdx = (x, y) => (y * width + x) * 4;
        // Analyze edge pixels to determine if background is white or black
        let whiteCount = 0;
        let blackCount = 0;
        const edgePixels = [];
        // Sample edge pixels
        for (let x = 0; x < width; x++) {
            edgePixels.push(getIdx(x, 0));
            edgePixels.push(getIdx(x, height - 1));
        }
        for (let y = 0; y < height; y++) {
            edgePixels.push(getIdx(0, y));
            edgePixels.push(getIdx(width - 1, y));
        }
        // Count white vs black edge pixels
        const WHITE_THRESHOLD = 240;
        const BLACK_THRESHOLD = 30;
        for (const idx of edgePixels) {
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];
            if (r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD) {
                whiteCount++;
            }
            else if (r <= BLACK_THRESHOLD && g <= BLACK_THRESHOLD && b <= BLACK_THRESHOLD) {
                blackCount++;
            }
        }
        // Determine background type
        const isBlackBackground = blackCount > whiteCount;
        const threshold = isBlackBackground ? BLACK_THRESHOLD : WHITE_THRESHOLD;
        logger_1.default.info(`Background detection: white=${whiteCount}, black=${blackCount}, using ${isBlackBackground ? 'BLACK' : 'WHITE'} removal`);
        // Helper to check if pixel matches background color
        const isBackground = (idx) => {
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];
            if (isBlackBackground) {
                // Check for black/dark pixels
                return r <= threshold && g <= threshold && b <= threshold;
            }
            else {
                // Check for white/light pixels
                return r >= threshold && g >= threshold && b >= threshold;
            }
        };
        // Create visited set for flood fill
        const visited = new Set();
        const queue = [];
        // Add all edge pixels to queue
        for (let x = 0; x < width; x++) {
            queue.push(getIdx(x, 0));
            queue.push(getIdx(x, height - 1));
        }
        for (let y = 0; y < height; y++) {
            queue.push(getIdx(0, y));
            queue.push(getIdx(width - 1, y));
        }
        let transparentCount = 0;
        // Flood fill from edges - only remove connected background pixels
        while (queue.length > 0) {
            const idx = queue.shift();
            if (visited.has(idx))
                continue;
            visited.add(idx);
            if (!isBackground(idx))
                continue;
            // Make transparent
            pixels[idx + 3] = 0;
            transparentCount++;
            // Get x, y from index
            const pixelNum = idx / 4;
            const x = pixelNum % width;
            const y = Math.floor(pixelNum / width);
            // Add neighbors to queue
            if (x > 0)
                queue.push(getIdx(x - 1, y));
            if (x < width - 1)
                queue.push(getIdx(x + 1, y));
            if (y > 0)
                queue.push(getIdx(x, y - 1));
            if (y < height - 1)
                queue.push(getIdx(x, y + 1));
        }
        // Now convert to grayscale while preserving alpha
        for (let i = 0; i < width * height * 4; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            pixels[i] = gray;
            pixels[i + 1] = gray;
            pixels[i + 2] = gray;
            // Alpha (pixels[i + 3]) is preserved
        }
        logger_1.default.info(`Background removed: ${transparentCount} pixels made transparent (${isBlackBackground ? 'black' : 'white'} bg), converted to grayscale`);
        const result = await (0, sharp_1.default)(pixels, {
            raw: {
                width: width,
                height: height,
                channels: 4
            }
        }).png().toBuffer();
        return result;
    }
    catch (error) {
        logger_1.default.error('Failed to remove background:', error);
        return photoBuffer; // Return original if failed
    }
}
// Keep old function name for backward compatibility - now uses AI removal
async function removeWhiteBackgroundSharp(photoBuffer) {
    return removeBackgroundAI(photoBuffer);
}
// Cache for normalized template images (sRGB color space) - templates don't change
const templateCache = new Map();
/**
 * Load and normalize template image to sRGB color space for consistent printing
 */
async function loadNormalizedTemplate(templatePath) {
    // Check cache first
    const cached = templateCache.get(templatePath);
    if (cached) {
        return cached;
    }
    try {
        // Load template and convert to sRGB color space
        const normalized = await (0, sharp_1.default)(templatePath)
            .toColorspace('srgb')
            .png() // Convert to PNG for consistent handling
            .toBuffer();
        // Cache the normalized template
        templateCache.set(templatePath, normalized);
        logger_1.default.info(`Loaded and normalized template: ${templatePath}`);
        return normalized;
    }
    catch (error) {
        logger_1.default.error(`Failed to normalize template ${templatePath}:`, error);
        // Fallback to reading file directly
        return fs_1.default.readFileSync(templatePath);
    }
}
class CardRenderer {
    constructor() {
        registerFonts();
    }
    getCardDimensions() {
        return { width: dimensions.width, height: dimensions.height };
    }
    /**
     * Render front card - EXACTLY like test script renderFrontCard function
     * Uses sRGB normalized templates for consistent color printing
     */
    async renderFront(data, options = { variant: 'color' }) {
        const templateType = options.template || 'template0';
        const layout = layoutConfigs[templateType];
        const { dimensions, front } = layout;
        const templateFile = layout.templateFiles?.front || 'front_template.png';
        const canvas = (0, canvas_1.createCanvas)(dimensions.width, dimensions.height);
        const ctx = canvas.getContext('2d');
        // Draw template (normalized to sRGB for consistent colors)
        const templatePath = path_1.default.join(TEMPLATE_DIR, templateFile);
        const normalizedTemplate = await loadNormalizedTemplate(templatePath);
        const template = await (0, canvas_1.loadImage)(normalizedTemplate);
        ctx.drawImage(template, 0, 0, dimensions.width, dimensions.height);
        // Draw photo with transparent background
        if (data.photo) {
            try {
                const photoBuffer = typeof data.photo === 'string' ? Buffer.from(data.photo, 'base64') : data.photo;
                // Process photo - no caching, always fresh
                logger_1.default.info('Processing photo (AI background removal)...');
                const photoProcessed = await removeWhiteBackgroundSharp(photoBuffer);
                const photo = await (0, canvas_1.loadImage)(photoProcessed);
                // Draw main photo (already grayscale with transparent background)
                ctx.drawImage(photo, front.mainPhoto.x, front.mainPhoto.y, front.mainPhoto.width, front.mainPhoto.height);
                // Draw small photo (already grayscale with transparent background)
                ctx.drawImage(photo, front.smallPhoto.x, front.smallPhoto.y, front.smallPhoto.width, front.smallPhoto.height);
            }
            catch (e) {
                logger_1.default.error('Could not load photo:', e);
            }
        }
        ctx.textBaseline = 'top';
        // Name Amharic - EXACTLY like test script
        ctx.fillStyle = front.nameAmharic.color;
        ctx.font = `bold ${front.nameAmharic.fontSize}px Ebrima`;
        ctx.fillText(data.fullNameAmharic, front.nameAmharic.x, front.nameAmharic.y);
        // Name English - EXACTLY like test script
        ctx.fillStyle = front.nameEnglish.color;
        ctx.font = `bold ${front.nameEnglish.fontSize}px Arial`;
        ctx.fillText(data.fullNameEnglish, front.nameEnglish.x, front.nameEnglish.y);
        // DOB - EXACTLY like test script
        ctx.fillStyle = front.dateOfBirth.color;
        ctx.font = `bold ${front.dateOfBirth.fontSize}px Arial`;
        ctx.fillText(`${data.dateOfBirthGregorian} | ${data.dateOfBirthEthiopian}`, front.dateOfBirth.x, front.dateOfBirth.y);
        // Sex - EXACTLY like test script
        ctx.fillStyle = front.sex.color;
        ctx.font = `bold ${front.sex.fontSize}px Ebrima`;
        const sexAmharic = data.sexAmharic || (data.sex === 'Female' ? 'ሴት' : 'ወንድ');
        ctx.fillText(sexAmharic, front.sex.x, front.sex.y);
        const sexWidth = ctx.measureText(sexAmharic).width;
        ctx.font = `bold ${front.sex.fontSize}px Arial`;
        ctx.fillText(`  |  ${data.sex}`, front.sex.x + sexWidth, front.sex.y);
        // Expiry - EXACTLY like test script
        ctx.fillStyle = front.expiryDate.color;
        ctx.font = `bold ${front.expiryDate.fontSize}px Arial`;
        ctx.fillText(`${data.expiryDateGregorian || ''} | ${data.expiryDateEthiopian || ''}`, front.expiryDate.x, front.expiryDate.y);
        // FAN - EXACTLY like test script
        ctx.fillStyle = front.fan.color;
        ctx.font = `bold ${front.fan.fontSize}px Consolas`;
        ctx.fillText(data.fcn, front.fan.x, front.fan.y);
        // Barcode - EXACTLY like test script
        const barcodeCanvas = (0, canvas_1.createCanvas)(front.barcode.width, front.barcode.height);
        (0, jsbarcode_1.default)(barcodeCanvas, data.fcn.replace(/\s/g, ''), {
            format: 'CODE128',
            width: 2,
            height: front.barcode.height - 5,
            displayValue: false,
            margin: 0,
            background: 'transparent'
        });
        ctx.drawImage(barcodeCanvas, front.barcode.x, front.barcode.y, front.barcode.width, front.barcode.height);
        // Issue dates (rotated) - use dates from PDF
        ctx.fillStyle = front.dateOfIssueEthiopian.color;
        ctx.font = `bold ${front.dateOfIssueEthiopian.fontSize}px Arial`;
        ctx.save();
        ctx.translate(front.dateOfIssueEthiopian.x, front.dateOfIssueEthiopian.y);
        ctx.rotate((front.dateOfIssueEthiopian.rotation * Math.PI) / 180);
        ctx.fillText(data.issueDateEthiopian || '', 0, 0);
        ctx.restore();
        ctx.save();
        ctx.translate(front.dateOfIssueGregorian.x, front.dateOfIssueGregorian.y);
        ctx.rotate((front.dateOfIssueGregorian.rotation * Math.PI) / 180);
        ctx.fillText(data.issueDate || '', 0, 0);
        ctx.restore();
        // Apply full grayscale if variant is grayscale
        if (options.variant === 'grayscale') {
            this.applyGrayscale(ctx, canvas);
        }
        return canvas.toBuffer('image/png');
    }
    /**
     * Render back card - EXACTLY like test script renderBackCard function
     * Uses sRGB normalized templates for consistent color printing
     */
    async renderBack(data, options = { variant: 'color' }) {
        const templateType = options.template || 'template0';
        const layout = layoutConfigs[templateType];
        const { dimensions, back } = layout;
        const templateFile = layout.templateFiles?.back || 'back_template.png';
        const canvas = (0, canvas_1.createCanvas)(dimensions.width, dimensions.height);
        const ctx = canvas.getContext('2d');
        // Draw template (normalized to sRGB for consistent colors)
        const templatePath = path_1.default.join(TEMPLATE_DIR, templateFile);
        const normalizedTemplate = await loadNormalizedTemplate(templatePath);
        const template = await (0, canvas_1.loadImage)(normalizedTemplate);
        ctx.drawImage(template, 0, 0, dimensions.width, dimensions.height);
        // Draw QR code - EXACTLY like test script
        if (data.qrCode) {
            try {
                const qrBuffer = typeof data.qrCode === 'string' ? Buffer.from(data.qrCode, 'base64') : data.qrCode;
                const qr = await (0, canvas_1.loadImage)(qrBuffer);
                ctx.drawImage(qr, back.qrCode.x, back.qrCode.y, back.qrCode.width, back.qrCode.height);
            }
            catch (e) {
                // Generate QR from FCN if extraction failed
                const qrCanvas = (0, canvas_1.createCanvas)(back.qrCode.width, back.qrCode.height);
                await qrcode_1.default.toCanvas(qrCanvas, data.fcn.replace(/\s/g, ''), { width: back.qrCode.width, margin: 0 });
                ctx.drawImage(qrCanvas, back.qrCode.x, back.qrCode.y);
            }
        }
        else {
            // Generate QR from FCN
            const qrCanvas = (0, canvas_1.createCanvas)(back.qrCode.width, back.qrCode.height);
            await qrcode_1.default.toCanvas(qrCanvas, data.fcn.replace(/\s/g, ''), { width: back.qrCode.width, margin: 0 });
            ctx.drawImage(qrCanvas, back.qrCode.x, back.qrCode.y);
        }
        ctx.textBaseline = 'top';
        // Phone - EXACTLY like test script
        ctx.fillStyle = back.phoneNumber.color;
        ctx.font = `bold ${back.phoneNumber.fontSize}px Arial`;
        ctx.fillText(data.phoneNumber, back.phoneNumber.x, back.phoneNumber.y);
        // Nationality (Amharic | English in one line)
        if (back.nationality) {
            ctx.fillStyle = back.nationality.color;
            ctx.font = `bold ${back.nationality.fontSize}px Ebrima`;
            const nationalityAmharic = 'ኢትዮጵያዊ';
            ctx.fillText(nationalityAmharic, back.nationality.x, back.nationality.y);
            const amharicWidth = ctx.measureText(nationalityAmharic).width;
            ctx.font = `bold ${back.nationality.fontSize}px Arial`;
            ctx.fillText(`  |  ${data.nationality || 'Ethiopian'}`, back.nationality.x + amharicWidth, back.nationality.y);
        }
        // Region - EXACTLY like test script
        ctx.fillStyle = back.regionAmharic.color;
        ctx.font = `bold ${back.regionAmharic.fontSize}px Ebrima`;
        ctx.fillText(data.regionAmharic || '', back.regionAmharic.x, back.regionAmharic.y);
        ctx.fillStyle = back.regionEnglish.color;
        ctx.font = `bold ${back.regionEnglish.fontSize}px Arial`;
        ctx.fillText(data.region || '', back.regionEnglish.x, back.regionEnglish.y);
        // Zone - EXACTLY like test script
        ctx.fillStyle = back.zoneAmharic.color;
        ctx.font = `bold ${back.zoneAmharic.fontSize}px Ebrima`;
        ctx.fillText(data.zoneAmharic || '', back.zoneAmharic.x, back.zoneAmharic.y);
        ctx.fillStyle = back.zoneEnglish.color;
        ctx.font = `bold ${back.zoneEnglish.fontSize}px Arial`;
        ctx.fillText(data.city || '', back.zoneEnglish.x, back.zoneEnglish.y);
        // Woreda - EXACTLY like test script
        ctx.fillStyle = back.woredaAmharic.color;
        ctx.font = `bold ${back.woredaAmharic.fontSize}px Ebrima`;
        ctx.fillText(data.woredaAmharic || '', back.woredaAmharic.x, back.woredaAmharic.y);
        ctx.fillStyle = back.woredaEnglish.color;
        ctx.font = `bold ${back.woredaEnglish.fontSize}px Arial`;
        ctx.fillText(data.subcity || '', back.woredaEnglish.x, back.woredaEnglish.y);
        // FIN - EXACTLY like test script
        ctx.fillStyle = back.fin.color;
        ctx.font = `bold ${back.fin.fontSize}px Consolas`;
        ctx.fillText(data.fin, back.fin.x, back.fin.y);
        // Serial Number - EXACTLY like test script
        ctx.fillStyle = back.serialNumber.color;
        ctx.font = `bold ${back.serialNumber.fontSize}px Arial`;
        ctx.fillText(data.serialNumber || '', back.serialNumber.x, back.serialNumber.y);
        // Apply full grayscale if variant is grayscale
        if (options.variant === 'grayscale') {
            this.applyGrayscale(ctx, canvas);
        }
        return canvas.toBuffer('image/png');
    }
    applyGrayscale(ctx, canvas) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const avg = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            data[i] = avg;
            data[i + 1] = avg;
            data[i + 2] = avg;
        }
        ctx.putImageData(imageData, 0, 0);
    }
}
exports.CardRenderer = CardRenderer;
exports.default = CardRenderer;
function getCardDimensions(template = 'template0') {
    const layout = layoutConfigs[template];
    return { width: layout.dimensions.width, height: layout.dimensions.height };
}
function getAvailableTemplates() {
    return Object.entries(layoutConfigs).map(([id, config]) => ({
        id: id,
        name: config.templateName || id
    }));
}
//# sourceMappingURL=cardRenderer.js.map