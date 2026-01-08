"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IDGeneratorService = exports.PDFGenerator = exports.CardVariantGenerator = exports.registerFonts = exports.CardRenderer = exports.ImageProcessor = void 0;
exports.getIDGeneratorService = getIDGeneratorService;
var imageProcessor_1 = require("./imageProcessor");
Object.defineProperty(exports, "ImageProcessor", { enumerable: true, get: function () { return imageProcessor_1.ImageProcessor; } });
var cardRenderer_1 = require("./cardRenderer");
Object.defineProperty(exports, "CardRenderer", { enumerable: true, get: function () { return cardRenderer_1.CardRenderer; } });
Object.defineProperty(exports, "registerFonts", { enumerable: true, get: function () { return cardRenderer_1.registerFonts; } });
var cardVariantGenerator_1 = require("./cardVariantGenerator");
Object.defineProperty(exports, "CardVariantGenerator", { enumerable: true, get: function () { return cardVariantGenerator_1.CardVariantGenerator; } });
var pdfGenerator_1 = require("./pdfGenerator");
Object.defineProperty(exports, "PDFGenerator", { enumerable: true, get: function () { return pdfGenerator_1.PDFGenerator; } });
const cardVariantGenerator_2 = require("./cardVariantGenerator");
const pdfGenerator_2 = require("./pdfGenerator");
const logger_1 = __importDefault(require("../../utils/logger"));
const promises_1 = __importDefault(require("fs/promises"));
/**
 * Main ID Generation Service
 * Orchestrates the complete ID card generation process
 */
class IDGeneratorService {
    cardGenerator;
    pdfGenerator;
    outputDir;
    constructor(outputDir) {
        this.outputDir = outputDir || process.env.TEMP_DIR || 'temp';
        this.cardGenerator = new cardVariantGenerator_2.CardVariantGenerator(this.outputDir);
        this.pdfGenerator = new pdfGenerator_2.PDFGenerator();
    }
    /**
     * Generate all output files for a job
     * Returns: 2 mirrored PNG images + 2 mirrored A4 PDFs
     */
    async generateAll(data, jobId) {
        try {
            logger_1.default.info(`Starting ID generation for job: ${jobId}`);
            // Ensure output directory exists
            await promises_1.default.mkdir(this.outputDir, { recursive: true });
            // Generate PNG files
            const pngFiles = await this.cardGenerator.saveToFiles(data, jobId);
            // Generate A4 PDFs from the PNG files
            await this.pdfGenerator.generateA4PDF(pngFiles.colorMirroredPng, pngFiles.colorMirroredPdf, { title: `ID Card - ${data.fullNameEnglish} (Color)` });
            await this.pdfGenerator.generateA4PDF(pngFiles.grayscaleMirroredPng, pngFiles.grayscaleMirroredPdf, { title: `ID Card - ${data.fullNameEnglish} (Grayscale)` });
            logger_1.default.info(`ID generation completed for job: ${jobId}`);
            return pngFiles;
        }
        catch (error) {
            logger_1.default.error(`ID generation failed for job ${jobId}:`, error);
            throw new Error('Failed to generate ID card files');
        }
    }
    /**
     * Clean up generated files for a job
     */
    async cleanup(files) {
        const filePaths = [
            files.colorMirroredPng,
            files.grayscaleMirroredPng,
            files.colorMirroredPdf,
            files.grayscaleMirroredPdf
        ];
        for (const filePath of filePaths) {
            try {
                await promises_1.default.unlink(filePath);
                logger_1.default.debug(`Deleted file: ${filePath}`);
            }
            catch (error) {
                // File may not exist, ignore
                logger_1.default.debug(`Could not delete file: ${filePath}`);
            }
        }
    }
    /**
     * Check if all output files exist
     */
    async verifyFiles(files) {
        const filePaths = [
            files.colorMirroredPng,
            files.grayscaleMirroredPng,
            files.colorMirroredPdf,
            files.grayscaleMirroredPdf
        ];
        for (const filePath of filePaths) {
            try {
                await promises_1.default.access(filePath);
            }
            catch {
                return false;
            }
        }
        return true;
    }
    /**
     * Get file sizes for all output files
     */
    async getFileSizes(files) {
        const sizes = {};
        const entries = Object.entries(files);
        for (const [key, filePath] of entries) {
            try {
                const stats = await promises_1.default.stat(filePath);
                sizes[key] = stats.size;
            }
            catch {
                sizes[key] = 0;
            }
        }
        return sizes;
    }
}
exports.IDGeneratorService = IDGeneratorService;
// Singleton instance
let idGeneratorInstance = null;
function getIDGeneratorService() {
    if (!idGeneratorInstance) {
        idGeneratorInstance = new IDGeneratorService();
    }
    return idGeneratorInstance;
}
//# sourceMappingURL=index.js.map