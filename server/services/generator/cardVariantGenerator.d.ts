import { EfaydaData, GeneratedFiles } from '../../types';
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
     * Generate all card variants (color/grayscale, normal/mirrored)
     * NOTE: "Mirrored" variants are now the same as normal (no flipping)
     */
    generateAllVariants(data: EfaydaData): Promise<{
        colorNormal: CardVariant;
        colorMirrored: CardVariant;
        grayscaleNormal: CardVariant;
        grayscaleMirrored: CardVariant;
    }>;
    /**
     * Generate mirrored variants only (as per requirements)
     * NOTE: Changed to generate NORMAL (non-mirrored) variants based on user feedback
     */
    generateMirroredVariants(data: EfaydaData): Promise<{
        colorMirrored: Buffer;
        grayscaleMirrored: Buffer;
    }>;
    /**
     * Combine front and back cards into a single image (side by side like the example PNG)
     */
    private combineCards;
    /**
     * Save generated files to disk and return file paths
     */
    saveToFiles(data: EfaydaData, jobId: string): Promise<GeneratedFiles>;
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