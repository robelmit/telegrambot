import { PaymentVerifier } from './types';
import { TransactionVerification } from '../../types';
export declare class CBEVerifier implements PaymentVerifier {
    private receiverAccount;
    constructor(expectedReceiver?: string);
    getReceiverAccount(): string;
    private getAccountSuffix;
    verify(transactionId: string): Promise<TransactionVerification>;
    /**
     * Verify using Mobile Banking receipt URL
     */
    private verifyMobileBanking;
    /**
     * Verify using Internet Banking receipt URL
     */
    private verifyInternetBanking;
    /**
     * Fetch receipt page and parse it
     */
    private fetchAndParseReceipt;
    /**
     * Find receipt image URL from HTML
     */
    private findReceiptImage;
    /**
     * Extract data from HTML content
     */
    private extractDataFromHTML;
    /**
     * Extract data from PDF receipt
     */
    private extractDataFromPDF;
    /**
     * Extract data from receipt image using OCR
     */
    private extractDataFromImage;
    /**
     * Parse OCR text to extract receipt data
     */
    private parseReceiptText;
    validateReceiver(verification: TransactionVerification, expectedReceiver: string): boolean;
    validateAmount(verification: TransactionVerification, expectedAmount: number): boolean;
}
export default CBEVerifier;
//# sourceMappingURL=cbeVerifier.d.ts.map