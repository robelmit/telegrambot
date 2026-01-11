import sharp from 'sharp';
export interface ImageProcessorOptions {
    width?: number;
    height?: number;
    dpi?: number;
}
export declare class ImageProcessor {
    /**
     * Mirror an image horizontally (flip) using canvas
     */
    mirror(input: Buffer): Promise<Buffer>;
    /**
     * Mirror using Sharp (alternative, faster for large images)
     */
    mirrorSharp(input: Buffer): Promise<Buffer>;
    /**
     * Convert image to grayscale
     */
    grayscale(input: Buffer): Promise<Buffer>;
    /**
     * Resize image while preserving aspect ratio
     */
    resize(input: Buffer, width: number, height?: number): Promise<Buffer>;
    /**
     * Resize image to exact dimensions (may crop)
     */
    resizeExact(input: Buffer, width: number, height: number): Promise<Buffer>;
    /**
     * Apply rounded corners mask to photo (for ID card photo)
     */
    applyRoundedMask(input: Buffer, width: number, height: number, radius?: number): Promise<Buffer>;
    /**
     * Apply oval/ellipse mask to photo (alternative style)
     */
    applyOvalMask(input: Buffer, width: number, height: number): Promise<Buffer>;
    /**
     * Get image metadata
     */
    getMetadata(input: Buffer): Promise<sharp.Metadata>;
    /**
     * Ensure image is at specified DPI
     */
    setDpi(input: Buffer, dpi?: number): Promise<Buffer>;
    /**
     * Convert image to PNG format
     */
    toPng(input: Buffer): Promise<Buffer>;
    /**
     * Composite multiple images together
     */
    composite(base: Buffer, overlays: Array<{
        input: Buffer;
        left: number;
        top: number;
    }>): Promise<Buffer>;
    /**
     * Create a blank canvas with specified color
     */
    createCanvas(width: number, height: number, color?: string): Promise<Buffer>;
    /**
     * Add text to image using SVG overlay
     */
    addText(input: Buffer, text: string, x: number, y: number, options?: {
        fontSize?: number;
        fontFamily?: string;
        color?: string;
        fontWeight?: string;
    }): Promise<Buffer>;
}
export default ImageProcessor;
//# sourceMappingURL=imageProcessor.d.ts.map