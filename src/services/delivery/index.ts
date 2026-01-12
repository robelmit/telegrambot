import fs from 'fs/promises';
import path from 'path';
import { Telegraf } from 'telegraf';
import { GeneratedFiles } from '../../types';
import logger from '../../utils/logger';

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

export class FileDeliveryService {
  private bot: Telegraf<any>;
  private tempDir: string;
  private fileTTL: number; // Time to live in milliseconds

  constructor(bot: Telegraf<any>, tempDir?: string, fileTTL?: number) {
    this.bot = bot;
    this.tempDir = tempDir || process.env.TEMP_DIR || 'temp';
    this.fileTTL = fileTTL || 24 * 60 * 60 * 1000; // 24 hours default
  }

  /**
   * Deliver generated files to user via Telegram
   */
  async deliverFiles(
    chatId: number,
    files: GeneratedFiles,
    userName: string
  ): Promise<DeliveryResult> {
    const result: DeliveryResult = {
      success: false,
      deliveredFiles: [],
      errors: []
    };

    const fileInfos = this.getFileInfos(files, userName);

    try {
      // Send a message before files
      await this.bot.telegram.sendMessage(
        chatId,
        '✅ Your ID cards are ready! Here are your files:'
      );

      // Send each file
      for (const fileInfo of fileInfos) {
        try {
          await this.sendFile(chatId, fileInfo);
          result.deliveredFiles.push(fileInfo.filename);
        } catch (error) {
          const errorMsg = `Failed to send ${fileInfo.filename}: ${(error as Error).message}`;
          result.errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      // Send completion message
      if (result.deliveredFiles.length === fileInfos.length) {
        result.success = true;
      } else {
        await this.bot.telegram.sendMessage(
          chatId,
          `⚠️ Some files could not be delivered. ${result.deliveredFiles.length}/${fileInfos.length} files sent.`
        );
      }

      logger.info(`Delivered ${result.deliveredFiles.length} files to chat ${chatId}`);
    } catch (error) {
      result.errors.push(`Delivery failed: ${(error as Error).message}`);
      logger.error('File delivery failed:', error);
    }

    return result;
  }

  /**
   * Send a single file to Telegram
   */
  private async sendFile(chatId: number, fileInfo: FileInfo): Promise<void> {
    const fileBuffer = await fs.readFile(fileInfo.path);
    
    const caption = this.generateCaption(fileInfo);

    if (fileInfo.type === 'png') {
      await this.bot.telegram.sendDocument(chatId, {
        source: fileBuffer,
        filename: fileInfo.filename
      }, {
        caption
      });
    } else {
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
  private generateCaption(fileInfo: FileInfo): string {
    const typeLabel = fileInfo.type === 'png' ? 'Image' : 'PDF (A4)';
    const variantLabel = fileInfo.variant === 'color' ? '📄 Normal' : '🖨️ Mirrored (for printing)';
    return `${variantLabel} ${typeLabel}`;
  }

  /**
   * Get file information array from GeneratedFiles
   */
  private getFileInfos(files: GeneratedFiles, userName: string): FileInfo[] {
    const safeName = this.sanitizeFilename(userName);
    
    return [
      {
        path: files.colorNormalPng,
        filename: this.generateFilename(safeName, 'normal', 'png'),
        type: 'png' as const,
        variant: 'color' as const
      },
      {
        path: files.colorMirroredPng,
        filename: this.generateFilename(safeName, 'mirrored', 'png'),
        type: 'png' as const,
        variant: 'grayscale' as const  // Using grayscale to indicate mirrored in caption
      },
      {
        path: files.colorNormalPdf,
        filename: this.generateFilename(safeName, 'normal', 'pdf'),
        type: 'pdf' as const,
        variant: 'color' as const
      },
      {
        path: files.colorMirroredPdf,
        filename: this.generateFilename(safeName, 'mirrored', 'pdf'),
        type: 'pdf' as const,
        variant: 'grayscale' as const  // Using grayscale to indicate mirrored in caption
      }
    ];
  }

  /**
   * Generate descriptive filename
   * Format: ID_Card_[Name]_[Variant].[ext]
   */
  generateFilename(userName: string, variant: 'normal' | 'mirrored', extension: 'png' | 'pdf'): string {
    const safeName = this.sanitizeFilename(userName);
    const variantLabel = variant === 'normal' ? 'Normal' : 'Mirrored';
    return `ID_Card_${safeName}_${variantLabel}.${extension}`;
  }

  /**
   * Sanitize filename to remove invalid characters
   */
  private sanitizeFilename(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 30);
  }

  /**
   * Clean up temporary files for a job
   */
  async cleanupJobFiles(files: GeneratedFiles): Promise<void> {
    const filePaths = [
      files.colorNormalPng,
      files.colorMirroredPng,
      files.colorNormalPdf,
      files.colorMirroredPdf
    ];

    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
        logger.debug(`Deleted file: ${filePath}`);
      } catch (error) {
        // File may not exist
        logger.debug(`Could not delete file: ${filePath}`);
      }
    }
  }

  /**
   * Clean up old temporary files
   */
  async cleanupOldFiles(): Promise<number> {
    let deletedCount = 0;
    
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();

      for (const file of files) {
        if (file === '.gitkeep') continue;
        
        const filePath = path.join(this.tempDir, file);
        
        try {
          const stats = await fs.stat(filePath);
          const age = now - stats.mtimeMs;
          
          if (age > this.fileTTL) {
            await fs.unlink(filePath);
            deletedCount++;
            logger.debug(`Cleaned up old file: ${filePath}`);
          }
        } catch (error) {
          // Skip files that can't be accessed
        }
      }

      logger.info(`Cleaned up ${deletedCount} old files`);
    } catch (error) {
      logger.error('File cleanup failed:', error);
    }

    return deletedCount;
  }

  /**
   * Schedule periodic cleanup
   */
  startCleanupScheduler(intervalMs: number = 60 * 60 * 1000): NodeJS.Timeout {
    return setInterval(() => {
      this.cleanupOldFiles().catch(err => {
        logger.error('Scheduled cleanup failed:', err);
      });
    }, intervalMs);
  }

  /**
   * Get expected output file count
   */
  getExpectedFileCount(): number {
    return 4; // 2 PNG + 2 PDF
  }

  /**
   * Validate filename format
   */
  isValidFilenameFormat(filename: string): boolean {
    // Expected format: ID_Card_[Name]_[Variant].[ext]
    const pattern = /^ID_Card_[A-Za-z0-9_]+_(Normal|Mirrored)\.(png|pdf)$/;
    return pattern.test(filename);
  }
}

export default FileDeliveryService;
