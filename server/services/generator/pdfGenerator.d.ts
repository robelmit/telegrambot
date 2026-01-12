export interface A4PDFOptions {
    title?: string;
    author?: string;
    subject?: string;
    mirrored?: boolean;
}
export declare class PDFGenerator {
    constructor();
    /**
     * Generate A4 PDF with ID card images positioned for printing
     */
    generateA4PDF(cardImagePath: string, outputPath: string, options?: A4PDFOptions): Promise<string>;
    /**
     * Generate A4 PDF from image buffer
     */
    generateA4PDFFromBuffer(imageBuffer: Buffer, outputPath: string, options?: A4PDFOptions): Promise<string>;
    /**
     * Add cutting guide lines to PDF with increased margins for transparency
     */
    private addCuttingGuides;
    /**
     * Get A4 page dimensions
     */
    getA4Dimensions(): {
        width: number;
        height: number;
        unit: string;
    };
    /**
     * Verify PDF is A4 size (for testing)
     */
    isA4Size(widthPt: number, heightPt: number): boolean;
    /**
     * Generate combined A4 PDF with multiple ID cards (5 per page)
     * Each card image contains front+back side by side
     */
    generateCombinedPDF(cardImagePaths: string[], outputPath: string, options?: A4PDFOptions): Promise<string>;
    /**
     * Generate combined PDF from image buffers
     */
    generateCombinedPDFFromBuffers(imageBuffers: Buffer[], outputPath: string, options?: A4PDFOptions): Promise<string>;
}
export default PDFGenerator;
//# sourceMappingURL=pdfGenerator.d.ts.map