import { Telegraf } from 'telegraf';
import { GeneratedFiles } from '../../types';
export interface DeliveryResult {
    success: boolean;
    deliveredFiles: string[];
    errors: string[];
}
export interface FileInfo {
    path: string;
    filename: string;
    type: 'png' | 'pdf';
    variant: 'color' | 'grayscale';
}
export declare class FileDeliveryService {
    private bot;
    private tempDir;
    private fileTTL;
    constructor(bot: Telegraf<any>, tempDir?: string, fileTTL?: number);
    /**
     * Deliver generated files to user via Telegram
     */
    deliverFiles(chatId: number, files: GeneratedFiles, userName: string): Promise<DeliveryResult>;
    /**
     * Send a single file to Telegram
     */
    private sendFile;
    /**
     * Generate file caption
     */
    private generateCaption;
    /**
     * Get file information array from GeneratedFiles
     */
    private getFileInfos;
    /**
     * Generate descriptive filename
     * Format: ID_Card_[Name]_[Variant]_Mirrored.[ext]
     */
    generateFilename(userName: string, variant: 'color' | 'grayscale', extension: 'png' | 'pdf'): string;
    /**
     * Sanitize filename to remove invalid characters
     */
    private sanitizeFilename;
    /**
     * Clean up temporary files for a job
     */
    cleanupJobFiles(files: GeneratedFiles): Promise<void>;
    /**
     * Clean up old temporary files
     */
    cleanupOldFiles(): Promise<number>;
    /**
     * Schedule periodic cleanup
     */
    startCleanupScheduler(intervalMs?: number): NodeJS.Timeout;
    /**
     * Get expected output file count
     */
    getExpectedFileCount(): number;
    /**
     * Validate filename format
     */
    isValidFilenameFormat(filename: string): boolean;
}
export default FileDeliveryService;
//# sourceMappingURL=index.d.ts.map