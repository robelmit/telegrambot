export interface BulkPDFOptions {
    title?: string;
    author?: string;
}
export declare class BulkPDFService {
    /**
     * Combine multiple ID card images into a single PDF
     * Each card pair (front+back) goes on its own page
     */
    combineIntoPDF(imagePaths: string[], outputPath: string, options?: BulkPDFOptions): Promise<string>;
    /**
     * Add cutting guide lines to PDF
     */
    private addCuttingGuides;
    /**
     * Combine multiple PNG images into a single multi-page PDF
     */
    combineFromBuffers(imageBuffers: Buffer[], outputPath: string, options?: BulkPDFOptions): Promise<string>;
}
export default BulkPDFService;
//# sourceMappingURL=index.d.ts.map