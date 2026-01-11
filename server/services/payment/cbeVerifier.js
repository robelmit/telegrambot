"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CBEVerifier = void 0;
const logger_1 = __importDefault(require("../../utils/logger"));
const cheerio = __importStar(require("cheerio"));
const tesseract_js_1 = __importDefault(require("tesseract.js"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const CBE_BASE_URL = 'https://apps.cbe.com.et:100';
class CBEVerifier {
    receiverAccount;
    constructor(expectedReceiver) {
        this.receiverAccount = expectedReceiver || process.env.CBE_RECEIVER_ACCOUNT || '';
    }
    getReceiverAccount() {
        return this.receiverAccount;
    }
    // Get the last 8 digits of the receiver account (required by CBE)
    getAccountSuffix() {
        const account = this.receiverAccount.replace(/[\s\-]/g, '');
        return account.slice(-8);
    }
    async verify(transactionId) {
        try {
            if (!transactionId || transactionId.trim() === '') {
                return {
                    isValid: false,
                    error: 'Transaction ID is required'
                };
            }
            // Clean the transaction ID - keep the FT prefix
            let cleanedId = transactionId.trim().toUpperCase();
            // Ensure FT prefix is present
            if (!cleanedId.startsWith('FT')) {
                cleanedId = 'FT' + cleanedId;
            }
            // Validate format: FT followed by 10-12 alphanumeric characters
            if (cleanedId.length < 12 || cleanedId.length > 14) {
                return {
                    isValid: false,
                    error: 'Invalid CBE transaction ID format. Expected format: FT followed by 10-12 characters (e.g., FT260030WKRY)'
                };
            }
            const accountSuffix = this.getAccountSuffix();
            if (accountSuffix.length !== 8) {
                logger_1.default.error('Invalid receiver account - need last 8 digits');
                return {
                    isValid: false,
                    error: 'Payment verification not configured properly'
                };
            }
            // Try both Mobile Banking and Internet Banking URLs
            let receipt = await this.verifyMobileBanking(cleanedId, accountSuffix);
            if (!receipt) {
                receipt = await this.verifyInternetBanking(cleanedId, accountSuffix);
            }
            if (receipt) {
                return {
                    isValid: true,
                    amount: receipt.amount,
                    receiver: receipt.receiver,
                    sender: receipt.sender,
                    timestamp: receipt.timestamp
                };
            }
            return {
                isValid: false,
                error: 'Unable to verify transaction. Please ensure the transaction ID is correct.'
            };
        }
        catch (error) {
            logger_1.default.error('CBE verification error:', error);
            return {
                isValid: false,
                error: 'Verification service temporarily unavailable'
            };
        }
    }
    /**
     * Verify using Mobile Banking receipt URL
     */
    async verifyMobileBanking(ftCode, accountSuffix) {
        const url = `${CBE_BASE_URL}/?id=${ftCode}${accountSuffix}`;
        logger_1.default.info(`Trying Mobile Banking URL: ${url}`);
        return this.fetchAndParseReceipt(url, ftCode);
    }
    /**
     * Verify using Internet Banking receipt URL
     */
    async verifyInternetBanking(ftCode, accountSuffix) {
        const url = `${CBE_BASE_URL}/inBank/${ftCode}${accountSuffix}`;
        logger_1.default.info(`Trying Internet Banking URL: ${url}`);
        return this.fetchAndParseReceipt(url, ftCode);
    }
    /**
     * Fetch receipt page and parse it
     */
    async fetchAndParseReceipt(url, ftCode) {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                }
            });
            if (!response.ok) {
                logger_1.default.warn(`Receipt page returned ${response.status}`);
                return null;
            }
            const contentType = response.headers.get('content-type') || '';
            // Check if response is a PDF
            if (contentType.includes('pdf')) {
                const buffer = Buffer.from(await response.arrayBuffer());
                return this.extractDataFromPDF(buffer, ftCode);
            }
            // Check if response is an image
            if (contentType.includes('image')) {
                const buffer = Buffer.from(await response.arrayBuffer());
                return this.extractDataFromImage(buffer, ftCode);
            }
            // Parse HTML response
            const html = await response.text();
            // Check for error messages
            if (html.includes('not correct') || html.includes('not found') || html.includes('Page Not Found')) {
                logger_1.default.warn('Receipt not found');
                return null;
            }
            const $ = cheerio.load(html);
            // Try to find receipt image in the page
            const imageUrl = this.findReceiptImage($, url);
            if (imageUrl) {
                logger_1.default.info(`Found receipt image: ${imageUrl}`);
                const imageResponse = await fetch(imageUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                if (imageResponse.ok) {
                    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
                    return this.extractDataFromImage(imageBuffer, ftCode);
                }
            }
            // Try to extract data from HTML directly
            return this.extractDataFromHTML($, ftCode);
        }
        catch (error) {
            logger_1.default.error('Failed to fetch receipt:', error);
            return null;
        }
    }
    /**
     * Find receipt image URL from HTML
     */
    findReceiptImage($, baseUrl) {
        const imgSelectors = [
            'img[src*="receipt"]',
            'img[src*="Receipt"]',
            'img.receipt',
            '#receipt img',
            '.receipt-image',
            'img'
        ];
        for (const selector of imgSelectors) {
            const img = $(selector).first();
            if (img.length > 0) {
                let src = img.attr('src');
                if (src && !src.includes('logo') && !src.includes('icon')) {
                    if (src.startsWith('/')) {
                        const urlObj = new URL(baseUrl);
                        src = `${urlObj.protocol}//${urlObj.host}${src}`;
                    }
                    else if (!src.startsWith('http')) {
                        src = new URL(src, baseUrl).href;
                    }
                    return src;
                }
            }
        }
        return null;
    }
    /**
     * Extract data from HTML content
     */
    extractDataFromHTML($, ftCode) {
        try {
            let amount = 0;
            let receiver = '';
            let sender = '';
            // Look for common receipt data patterns in HTML
            const text = $('body').text();
            // Extract amount
            const amountPatterns = [
                /Amount[:\s]+ETB?\s*([\d,]+\.?\d*)/i,
                /ETB\s*([\d,]+\.?\d*)/i,
                /Birr\s*([\d,]+\.?\d*)/i,
                /([\d,]+\.?\d*)\s*(?:ETB|Birr)/i
            ];
            for (const pattern of amountPatterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    amount = parseFloat(match[1].replace(/,/g, ''));
                    if (amount > 0)
                        break;
                }
            }
            // Extract account numbers
            const accountPattern = /(?:1000|100)\d{9,13}/g;
            const accounts = text.match(accountPattern) || [];
            if (accounts.length >= 2) {
                sender = accounts[0] || '';
                receiver = accounts[1] || '';
            }
            else if (accounts.length === 1) {
                receiver = accounts[0] || '';
            }
            if (amount > 0) {
                logger_1.default.info(`Extracted from HTML: amount=${amount}, receiver=${receiver}`);
                return {
                    transactionId: ftCode,
                    amount,
                    sender,
                    receiver,
                    timestamp: new Date(),
                    status: 'completed'
                };
            }
            return null;
        }
        catch (error) {
            logger_1.default.error('HTML extraction failed:', error);
            return null;
        }
    }
    /**
     * Extract data from PDF receipt
     */
    async extractDataFromPDF(pdfBuffer, ftCode) {
        try {
            logger_1.default.info('Extracting text from PDF receipt...');
            const pdfData = await (0, pdf_parse_1.default)(pdfBuffer);
            const text = pdfData.text;
            logger_1.default.debug(`PDF extracted ${text.length} characters`);
            return this.parseReceiptText(text, ftCode);
        }
        catch (error) {
            logger_1.default.error('PDF extraction failed:', error);
            return null;
        }
    }
    /**
     * Extract data from receipt image using OCR
     */
    async extractDataFromImage(imageBuffer, ftCode) {
        try {
            logger_1.default.info('Performing OCR on receipt image...');
            const result = await tesseract_js_1.default.recognize(imageBuffer, 'eng', {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        logger_1.default.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
                    }
                }
            });
            const text = result.data.text;
            logger_1.default.info(`OCR extracted ${text.length} characters`);
            return this.parseReceiptText(text, ftCode);
        }
        catch (error) {
            logger_1.default.error('OCR extraction failed:', error);
            return null;
        }
    }
    /**
     * Parse OCR text to extract receipt data
     */
    parseReceiptText(text, ftCode) {
        try {
            let amount = 0;
            let receiver = '';
            let sender = '';
            let receiverName = '';
            // Extract amount - CBE format shows amount after "Amount" or in ETB format
            const amountPatterns = [
                /Amount[:\s]*([\d,]+\.?\d*)/i,
                /ETB\s*([\d,]+\.?\d*)/i,
                /Birr\s*([\d,]+\.?\d*)/i,
                /([\d,]+\.?\d*)\s*(?:ETB|Birr)/i,
                /Total[:\s]*([\d,]+\.?\d*)/i
            ];
            for (const pattern of amountPatterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    const parsed = parseFloat(match[1].replace(/,/g, ''));
                    if (parsed > 0) {
                        amount = parsed;
                        break;
                    }
                }
            }
            // CBE PDF format parsing - accounts are masked like "1****5627"
            // Look for Receiver line followed by Account line
            const receiverMatch = text.match(/Receiver\s*([A-Z][A-Z\s\/]+?)(?=Account|\n|$)/i);
            if (receiverMatch) {
                receiverName = receiverMatch[1].trim();
            }
            // Extract masked account numbers
            // Payer account: E****0960 format (TeleBirr)
            // Receiver account: 1****5627 format (CBE)
            const payerAccountMatch = text.match(/Account\s*([A-Z\d\*]+)/i);
            const receiverAccountMatch = text.match(/Account\s*[A-Z\d\*]+[\s\S]*?Account\s*(\d\*+\d+)/i);
            if (payerAccountMatch) {
                sender = payerAccountMatch[1];
            }
            if (receiverAccountMatch) {
                receiver = receiverAccountMatch[1];
            }
            // Alternative: look for masked account pattern directly
            const maskedAccounts = text.match(/\d\*{3,}\d{3,}/g) || [];
            if (maskedAccounts.length >= 2) {
                sender = sender || maskedAccounts[0] || '';
                receiver = receiver || maskedAccounts[1] || '';
            }
            else if (maskedAccounts.length === 1 && !receiver) {
                receiver = maskedAccounts[0] || '';
            }
            // Validate receiver matches expected account (last 4 digits)
            const expectedSuffix = this.receiverAccount.slice(-4);
            const receiverValid = receiver.endsWith(expectedSuffix);
            if (amount > 0) {
                logger_1.default.info(`Parsed receipt: amount=${amount}, receiver=${receiver}, sender=${sender}, receiverName=${receiverName}, valid=${receiverValid}`);
                return {
                    transactionId: ftCode,
                    amount,
                    sender,
                    receiver: receiverValid ? this.receiverAccount : receiver,
                    receiverName,
                    timestamp: new Date(),
                    status: 'completed'
                };
            }
            // If no amount found, try to find it in a different format
            // Sometimes CBE shows amount as just a number on its own line
            const lines = text.split('\n');
            for (const line of lines) {
                const numMatch = line.trim().match(/^([\d,]+\.?\d*)$/);
                if (numMatch) {
                    const parsed = parseFloat(numMatch[1].replace(/,/g, ''));
                    if (parsed > 10 && parsed < 1000000) { // Reasonable amount range
                        amount = parsed;
                        break;
                    }
                }
            }
            if (amount > 0) {
                logger_1.default.info(`Parsed receipt (fallback): amount=${amount}, receiver=${receiver}`);
                return {
                    transactionId: ftCode,
                    amount,
                    sender,
                    receiver: receiverValid ? this.receiverAccount : receiver,
                    receiverName,
                    timestamp: new Date(),
                    status: 'completed'
                };
            }
            logger_1.default.warn('Could not extract amount from receipt');
            return null;
        }
        catch (error) {
            logger_1.default.error('Receipt parsing failed:', error);
            return null;
        }
    }
    validateReceiver(verification, expectedReceiver) {
        if (!verification.isValid || !verification.receiver) {
            return false;
        }
        const normalizeAccount = (account) => {
            return account.replace(/[\s\-]/g, '');
        };
        const actualReceiver = normalizeAccount(verification.receiver);
        const expected = normalizeAccount(expectedReceiver);
        return actualReceiver === expected ||
            actualReceiver.endsWith(expected.slice(-5)) ||
            expected.endsWith(actualReceiver.slice(-5));
    }
    validateAmount(verification, expectedAmount) {
        if (!verification.isValid || verification.amount === undefined) {
            return false;
        }
        return Math.abs(verification.amount - expectedAmount) < 0.01;
    }
}
exports.CBEVerifier = CBEVerifier;
exports.default = CBEVerifier;
//# sourceMappingURL=cbeVerifier.js.map