import { ExtractedImages } from './types';
/**
 * PDF Image Extractor
 *
 * Note: Extracting images from PDFs is complex and typically requires
 * specialized libraries like pdf.js, pdf-lib, or external tools like
 * poppler-utils (pdfimages command).
 *
 * For production use, consider:
 * 1. Using pdf-lib for programmatic extraction
 * 2. Using poppler-utils (pdfimages) via child_process
 * 3. Using pdf.js for browser-compatible extraction
 * 4. Using a cloud service like AWS Textract
 *
 * This implementation provides a basic structure that can be extended.
 */
export declare class PDFImageExtractor {
    /**
     * Extract all images from PDF buffer
     */
    extractImages(buffer: Buffer): Promise<ExtractedImages>;
    /**
     * Find embedded images in PDF buffer
     * This is a simplified implementation that looks for common image markers
     */
    private findEmbeddedImages;
    /**
     * Find JPEG images in buffer
     */
    private findJPEGImages;
    /**
     * Find PNG images in buffer
     */
    private findPNGImages;
    /**
     * Extract barcode data from image
     * This would typically use a barcode scanning library
     */
    extractBarcodeData(_imageBuffer: Buffer): Promise<string | null>;
    /**
     * Extract QR code data from image
     * This would typically use a QR code scanning library
     */
    extractQRCodeData(_imageBuffer: Buffer): Promise<string | null>;
}
export declare const pdfImageExtractor: PDFImageExtractor;
export default pdfImageExtractor;
//# sourceMappingURL=imageExtractor.d.ts.map