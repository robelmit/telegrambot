import { EfaydaData } from '../../types';
import { PDFParser, ExtractedImages } from './types';
export declare class PDFParserImpl implements PDFParser {
    /**
     * Extract text content from PDF
     */
    extractText(buffer: Buffer): Promise<string>;
    /**
     * Extract images from PDF - EXACTLY like test script
     */
    extractImages(buffer: Buffer): Promise<ExtractedImages>;
    /**
     * Parse PDF text - EXACTLY like test script parsePdfText function
     */
    private parsePdfText;
    /**
     * Extract expiry date from images using targeted OCR on the expiry area
     */
    private extractExpiryFromImages;
    /**
     * Extract expiry dates from targeted OCR text (focused on expiry area)
     */
    private extractExpiryFromTargetedOCRText;
    parse(buffer: Buffer): Promise<EfaydaData>;
    /**
     * Calculate issue date (current date in YYYY/MM/DD format)
     */
    private calculateIssueDate;
    /**
     * Calculate issue date in Ethiopian calendar (approximately 7-8 years behind)
     */
    private calculateIssueDateEthiopian;
    /**
     * Calculate expiry date (10 years from DOB, not current date)
     */
    private calculateExpiryDate;
    /**
     * Calculate expiry date in Ethiopian calendar (DOB + 30 years)
     */
    private calculateExpiryDateEthiopian;
}
export declare const pdfParser: PDFParserImpl;
export default pdfParser;
//# sourceMappingURL=parser.d.ts.map