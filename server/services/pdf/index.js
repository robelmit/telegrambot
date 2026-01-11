"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pdfService = exports.PDFService = exports.DataNormalizerImpl = exports.dataNormalizer = exports.PDFImageExtractor = exports.pdfImageExtractor = exports.PDFParserImpl = exports.pdfParser = exports.PDFValidatorImpl = exports.pdfValidator = void 0;
// Export PDF service components
var validator_1 = require("./validator");
Object.defineProperty(exports, "pdfValidator", { enumerable: true, get: function () { return validator_1.pdfValidator; } });
Object.defineProperty(exports, "PDFValidatorImpl", { enumerable: true, get: function () { return validator_1.PDFValidatorImpl; } });
var parser_1 = require("./parser");
Object.defineProperty(exports, "pdfParser", { enumerable: true, get: function () { return parser_1.pdfParser; } });
Object.defineProperty(exports, "PDFParserImpl", { enumerable: true, get: function () { return parser_1.PDFParserImpl; } });
var imageExtractor_1 = require("./imageExtractor");
Object.defineProperty(exports, "pdfImageExtractor", { enumerable: true, get: function () { return imageExtractor_1.pdfImageExtractor; } });
Object.defineProperty(exports, "PDFImageExtractor", { enumerable: true, get: function () { return imageExtractor_1.PDFImageExtractor; } });
var normalizer_1 = require("./normalizer");
Object.defineProperty(exports, "dataNormalizer", { enumerable: true, get: function () { return normalizer_1.dataNormalizer; } });
Object.defineProperty(exports, "DataNormalizerImpl", { enumerable: true, get: function () { return normalizer_1.DataNormalizerImpl; } });
__exportStar(require("./types"), exports);
// Main PDF service that combines all components
const validator_2 = require("./validator");
const parser_2 = require("./parser");
const normalizer_2 = require("./normalizer");
const logger_1 = require("../../utils/logger");
class PDFService {
    /**
     * Validate and parse an eFayda PDF document
     */
    async processDocument(buffer, filename) {
        // Step 1: Validate file extension
        const extensionResult = validator_2.pdfValidator.validateFileExtension(filename);
        if (!extensionResult.isValid) {
            return { isValid: false, errors: extensionResult.errors };
        }
        // Step 2: Validate PDF structure
        const structureResult = await validator_2.pdfValidator.validatePDFStructure(buffer);
        if (!structureResult.isValid) {
            return { isValid: false, errors: structureResult.errors };
        }
        // Step 3: Validate eFayda document
        const efaydaResult = await validator_2.pdfValidator.validateEfaydaDocument(buffer);
        if (!efaydaResult.isValid) {
            return { isValid: false, errors: efaydaResult.errors };
        }
        try {
            // Step 4: Parse the document
            const rawData = await parser_2.pdfParser.parse(buffer);
            // Step 5: Normalize the data
            const normalizedData = normalizer_2.dataNormalizer.normalizeEfaydaData(rawData);
            logger_1.logger.info('Successfully processed eFayda document');
            return {
                isValid: true,
                data: normalizedData,
                errors: []
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to process eFayda document:', error);
            return {
                isValid: false,
                errors: ['Failed to extract data from the document']
            };
        }
    }
    /**
     * Quick validation without full parsing
     */
    async validateDocument(buffer, filename) {
        // Validate file extension
        const extensionResult = validator_2.pdfValidator.validateFileExtension(filename);
        if (!extensionResult.isValid) {
            return extensionResult;
        }
        // Validate eFayda document
        return validator_2.pdfValidator.validateEfaydaDocument(buffer);
    }
}
exports.PDFService = PDFService;
// Export singleton instance
exports.pdfService = new PDFService();
exports.default = exports.pdfService;
//# sourceMappingURL=index.js.map