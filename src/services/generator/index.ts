export { ImageProcessor } from './imageProcessor';
export { CardRenderer, CardRenderOptions, registerFonts, TemplateType, getAvailableTemplates } from './cardRenderer';
export { CardVariantGenerator, CardVariant } from './cardVariantGenerator';
export { PDFGenerator, A4PDFOptions } from './pdfGenerator';

import { EfaydaData, GeneratedFiles } from '../../types';
import { CardVariantGenerator } from './cardVariantGenerator';
import { PDFGenerator } from './pdfGenerator';
import { TemplateType } from './cardRenderer';
import logger from '../../utils/logger';
import fs from 'fs/promises';

/**
 * Main ID Generation Service
 * Orchestrates the complete ID card generation process
 */
export class IDGeneratorService {
  private cardGenerator: CardVariantGenerator;
  private pdfGenerator: PDFGenerator;
  private outputDir: string;

  constructor(outputDir?: string) {
    this.outputDir = outputDir || process.env.TEMP_DIR || 'temp';
    this.cardGenerator = new CardVariantGenerator(this.outputDir);
    this.pdfGenerator = new PDFGenerator();
  }

  /**
   * Generate all output files for a job
   * Returns: 2 mirrored PNG images + 2 mirrored A4 PDFs
   */
  async generateAll(data: EfaydaData, jobId: string, template?: TemplateType): Promise<GeneratedFiles> {
    try {
      logger.info(`Starting ID generation for job: ${jobId} with template: ${template || 'template0'}`);

      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });

      // Generate PNG files
      const pngFiles = await this.cardGenerator.saveToFiles(data, jobId, template);

      // Generate A4 PDFs from the PNG files
      await this.pdfGenerator.generateA4PDF(
        pngFiles.colorMirroredPng,
        pngFiles.colorMirroredPdf,
        { title: `ID Card - ${data.fullNameEnglish} (Color)` }
      );

      await this.pdfGenerator.generateA4PDF(
        pngFiles.grayscaleMirroredPng,
        pngFiles.grayscaleMirroredPdf,
        { title: `ID Card - ${data.fullNameEnglish} (Grayscale)` }
      );

      logger.info(`ID generation completed for job: ${jobId}`);

      return pngFiles;
    } catch (error) {
      logger.error(`ID generation failed for job ${jobId}:`, error);
      throw new Error('Failed to generate ID card files');
    }
  }

  /**
   * Clean up generated files for a job
   */
  async cleanup(files: GeneratedFiles): Promise<void> {
    const filePaths = [
      files.colorMirroredPng,
      files.grayscaleMirroredPng,
      files.colorMirroredPdf,
      files.grayscaleMirroredPdf
    ];

    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
        logger.debug(`Deleted file: ${filePath}`);
      } catch (error) {
        // File may not exist, ignore
        logger.debug(`Could not delete file: ${filePath}`);
      }
    }
  }

  /**
   * Check if all output files exist
   */
  async verifyFiles(files: GeneratedFiles): Promise<boolean> {
    const filePaths = [
      files.colorMirroredPng,
      files.grayscaleMirroredPng,
      files.colorMirroredPdf,
      files.grayscaleMirroredPdf
    ];

    for (const filePath of filePaths) {
      try {
        await fs.access(filePath);
      } catch {
        return false;
      }
    }

    return true;
  }

  /**
   * Get file sizes for all output files
   */
  async getFileSizes(files: GeneratedFiles): Promise<Record<string, number>> {
    const sizes: Record<string, number> = {};

    const entries = Object.entries(files) as [keyof GeneratedFiles, string][];
    
    for (const [key, filePath] of entries) {
      try {
        const stats = await fs.stat(filePath);
        sizes[key] = stats.size;
      } catch {
        sizes[key] = 0;
      }
    }

    return sizes;
  }
}

// Singleton instance
let idGeneratorInstance: IDGeneratorService | null = null;

export function getIDGeneratorService(): IDGeneratorService {
  if (!idGeneratorInstance) {
    idGeneratorInstance = new IDGeneratorService();
  }
  return idGeneratorInstance;
}
