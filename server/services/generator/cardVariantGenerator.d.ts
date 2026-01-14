import { EfaydaData, GeneratedFiles } from '../../types';
import { TemplateType } from './cardRenderer';
export interface CardVariant {
    front: Buffer;
    back: Buffer;
    combined: Buffer;
}
export declare class CardVariantGenerator {
    private cardRenderer;
    private outputDir;
    constructor(outputDir?: string);
    /**
     * Generate color card variants (normal and mirrored for printing)
     */
    generateColorVariants(data: EfaydaData, template?: TemplateType): Promise<{
        normalCombined: Buffer;
        mirroredCombined: Buffer;
    }>;
    /**
     * Combine front and back cards into a single image (side by side)
     * @param mirrored - If true, flip both cards horizontally for printing
     * Output maintains 300 DPI for proper printing
     * Standard card size: 8.67cm × 5.47cm = 1024×646px at 300 DPI
     *
     * BLEED AREA: Each card has bleed on ALL edges (3mm = ~35px at 300 DPI)
     * so when cut, there's card content at edges instead of white paper
     */
    private combineCards;
    /**
     * Save generated files to disk and return file paths
     * Generates: normal PNG, mirrored PNG, normal PDF, mirrored PDF (all color)
     */
    saveToFiles(data: EfaydaData, jobId: string, template?: TemplateType): Promise<GeneratedFiles>;
    /**
     * Save PNG with good compression - templates are already optimized
     * Embed sRGB color profile for consistent printing
     */
    private savePng;
    /**
     * Sanitize filename to remove invalid characters
     */
    private sanitizeFilename;
    /**
     * Get image resolution/DPI
     */
    getImageResolution(imageBuffer: Buffer): Promise<{
        width: number;
        height: number;
        dpi: number;
    }>;
}
export default CardVariantGenerator;
//# sourceMappingURL=cardVariantGenerator.d.ts.map