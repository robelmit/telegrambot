export { ImageProcessor } from './imageProcessor';
export { CardRenderer, CardRenderOptions, registerFonts, TemplateType, getAvailableTemplates } from './cardRenderer';
export { CardVariantGenerator, CardVariant } from './cardVariantGenerator';
export { PDFGenerator, A4PDFOptions } from './pdfGenerator';
import { EfaydaData, GeneratedFiles } from '../../types';
import { TemplateType } from './cardRenderer';
/**
 * Main ID Generation Service
 * Orchestrates the complete ID card generation process
 */
export declare class IDGeneratorService {
    private cardGenerator;
    private pdfGenerator;
    private outputDir;
    constructor(outputDir?: string);
    /**
     * Generate all output files for a job
     * Returns: 2 PNG images (normal + mirrored) + 2 A4 PDFs (normal + mirrored)
     */
    generateAll(data: EfaydaData, jobId: string, template?: TemplateType): Promise<GeneratedFiles>;
    /**
     * Clean up generated files for a job
     */
    cleanup(files: GeneratedFiles): Promise<void>;
    /**
     * Check if all output files exist
     */
    verifyFiles(files: GeneratedFiles): Promise<boolean>;
    /**
     * Get file sizes for all output files
     */
    getFileSizes(files: GeneratedFiles): Promise<Record<string, number>>;
}
export declare function getIDGeneratorService(): IDGeneratorService;
//# sourceMappingURL=index.d.ts.map