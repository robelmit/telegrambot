"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileDeliveryService = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("../../utils/logger"));
class FileDeliveryService {
    bot;
    tempDir;
    fileTTL; // Time to live in milliseconds
    constructor(bot, tempDir, fileTTL) {
        this.bot = bot;
        this.tempDir = tempDir || process.env.TEMP_DIR || 'temp';
        this.fileTTL = fileTTL || 24 * 60 * 60 * 1000; // 24 hours default
    }
    /**
     * Deliver generated files to user via Telegram
     */
    async deliverFiles(chatId, files, userName) {
        const result = {
            success: false,
            deliveredFiles: [],
            errors: []
        };
        const fileInfos = this.getFileInfos(files, userName);
        try {
            // Send a message before files
            await this.bot.telegram.sendMessage(chatId, '✅ Your ID cards are ready! Here are your files:');
            // Send each file
            for (const fileInfo of fileInfos) {
                try {
                    await this.sendFile(chatId, fileInfo);
                    result.deliveredFiles.push(fileInfo.filename);
                }
                catch (error) {
                    const errorMsg = `Failed to send ${fileInfo.filename}: ${error.message}`;
                    result.errors.push(errorMsg);
                    logger_1.default.error(errorMsg);
                }
            }
            // Send completion message
            if (result.deliveredFiles.length === fileInfos.length) {
                result.success = true;
            }
            else {
                await this.bot.telegram.sendMessage(chatId, `⚠️ Some files could not be delivered. ${result.deliveredFiles.length}/${fileInfos.length} files sent.`);
            }
            logger_1.default.info(`Delivered ${result.deliveredFiles.length} files to chat ${chatId}`);
        }
        catch (error) {
            result.errors.push(`Delivery failed: ${error.message}`);
            logger_1.default.error('File delivery failed:', error);
        }
        return result;
    }
    /**
     * Send a single file to Telegram
     */
    async sendFile(chatId, fileInfo) {
        const fileBuffer = await promises_1.default.readFile(fileInfo.path);
        const caption = this.generateCaption(fileInfo);
        if (fileInfo.type === 'png') {
            await this.bot.telegram.sendDocument(chatId, {
                source: fileBuffer,
                filename: fileInfo.filename
            }, {
                caption
            });
        }
        else {
            await this.bot.telegram.sendDocument(chatId, {
                source: fileBuffer,
                filename: fileInfo.filename
            }, {
                caption
            });
        }
    }
    /**
     * Generate file caption
     */
    generateCaption(fileInfo) {
        const variantLabel = fileInfo.variant === 'color' ? '🎨 Color' : '⬛ Grayscale';
        const typeLabel = fileInfo.type === 'png' ? 'Image' : 'PDF (A4)';
        return `${variantLabel} ${typeLabel} - Mirrored`;
    }
    /**
     * Get file information array from GeneratedFiles
     */
    getFileInfos(files, userName) {
        const safeName = this.sanitizeFilename(userName);
        return [
            {
                path: files.colorMirroredPng,
                filename: this.generateFilename(safeName, 'color', 'png'),
                type: 'png',
                variant: 'color'
            },
            {
                path: files.grayscaleMirroredPng,
                filename: this.generateFilename(safeName, 'grayscale', 'png'),
                type: 'png',
                variant: 'grayscale'
            },
            {
                path: files.colorMirroredPdf,
                filename: this.generateFilename(safeName, 'color', 'pdf'),
                type: 'pdf',
                variant: 'color'
            },
            {
                path: files.grayscaleMirroredPdf,
                filename: this.generateFilename(safeName, 'grayscale', 'pdf'),
                type: 'pdf',
                variant: 'grayscale'
            }
        ];
    }
    /**
     * Generate descriptive filename
     * Format: ID_Card_[Name]_[Variant]_Mirrored.[ext]
     */
    generateFilename(userName, variant, extension) {
        const safeName = this.sanitizeFilename(userName);
        const variantLabel = variant === 'color' ? 'Color' : 'Grayscale';
        return `ID_Card_${safeName}_${variantLabel}_Mirrored.${extension}`;
    }
    /**
     * Sanitize filename to remove invalid characters
     */
    sanitizeFilename(name) {
        return name
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 30);
    }
    /**
     * Clean up temporary files for a job
     */
    async cleanupJobFiles(files) {
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
                // File may not exist
                logger_1.default.debug(`Could not delete file: ${filePath}`);
            }
        }
    }
    /**
     * Clean up old temporary files
     */
    async cleanupOldFiles() {
        let deletedCount = 0;
        try {
            const files = await promises_1.default.readdir(this.tempDir);
            const now = Date.now();
            for (const file of files) {
                if (file === '.gitkeep')
                    continue;
                const filePath = path_1.default.join(this.tempDir, file);
                try {
                    const stats = await promises_1.default.stat(filePath);
                    const age = now - stats.mtimeMs;
                    if (age > this.fileTTL) {
                        await promises_1.default.unlink(filePath);
                        deletedCount++;
                        logger_1.default.debug(`Cleaned up old file: ${filePath}`);
                    }
                }
                catch (error) {
                    // Skip files that can't be accessed
                }
            }
            logger_1.default.info(`Cleaned up ${deletedCount} old files`);
        }
        catch (error) {
            logger_1.default.error('File cleanup failed:', error);
        }
        return deletedCount;
    }
    /**
     * Schedule periodic cleanup
     */
    startCleanupScheduler(intervalMs = 60 * 60 * 1000) {
        return setInterval(() => {
            this.cleanupOldFiles().catch(err => {
                logger_1.default.error('Scheduled cleanup failed:', err);
            });
        }, intervalMs);
    }
    /**
     * Get expected output file count
     */
    getExpectedFileCount() {
        return 4; // 2 PNG + 2 PDF
    }
    /**
     * Validate filename format
     */
    isValidFilenameFormat(filename) {
        // Expected format: ID_Card_[Name]_[Variant]_Mirrored.[ext]
        const pattern = /^ID_Card_[A-Za-z0-9_]+_(Color|Grayscale)_Mirrored\.(png|pdf)$/;
        return pattern.test(filename);
    }
}
exports.FileDeliveryService = FileDeliveryService;
exports.default = FileDeliveryService;
//# sourceMappingURL=index.js.map