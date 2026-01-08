"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pdfParser = exports.PDFParserImpl = void 0;
/**
 * PDF Parser - EXACTLY like test-pdf-full.ts from commit a8d0b98
 */
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const tesseract_js_1 = __importDefault(require("tesseract.js"));
const logger_1 = require("../../utils/logger");
class PDFParserImpl {
    /**
     * Extract text content from PDF
     */
    async extractText(buffer) {
        try {
            const data = await (0, pdf_parse_1.default)(buffer);
            return data.text || '';
        }
        catch (error) {
            logger_1.logger.error('Failed to extract text from PDF:', error);
            throw new Error('Failed to extract text from PDF');
        }
    }
    /**
     * Extract images from PDF - EXACTLY like test script
     */
    async extractImages(buffer) {
        const result = {
            photo: null,
            qrCode: null,
            barcode: null
        };
        // Find JPEG images
        const jpegStart = Buffer.from([0xFF, 0xD8, 0xFF]);
        const jpegEnd = Buffer.from([0xFF, 0xD9]);
        const images = [];
        let startIndex = 0;
        while (startIndex < buffer.length) {
            const start = buffer.indexOf(jpegStart, startIndex);
            if (start === -1)
                break;
            const end = buffer.indexOf(jpegEnd, start + 3);
            if (end === -1)
                break;
            const imageBuffer = buffer.slice(start, end + 2);
            if (imageBuffer.length > 500) {
                images.push(imageBuffer);
            }
            startIndex = end + 2;
        }
        logger_1.logger.info(`Found ${images.length} images in PDF`);
        // Based on our analysis:
        // - Image 1 (index 0) = actual photo for rendering
        // - Image 2 (index 1) = QR code  
        // - Image 3 (index 2) = front card with expiry date (for OCR only)
        // - Image 4 (index 3) = back card
        if (images.length >= 1) {
            result.photo = images[0]; // Use image 1 (index 0) for actual photo rendering
            logger_1.logger.info(`Using image 1 as photo: ${images[0].length} bytes`);
        }
        if (images.length >= 2) {
            result.qrCode = images[1];
            logger_1.logger.info(`QR code size: ${images[1].length} bytes`);
        }
        // Store image 3 separately for OCR expiry extraction
        if (images.length >= 3) {
            result.frontCardImage = images[2]; // Image 3 for OCR expiry extraction only
            logger_1.logger.info(`Front card image for OCR: ${images[2].length} bytes`);
        }
        return result;
    }
    /**
     * Parse PDF text - EXACTLY like test script parsePdfText function
     */
    parsePdfText(text) {
        const data = {
            fullNameAmharic: '',
            fullNameEnglish: '',
            dateOfBirthEthiopian: '',
            dateOfBirthGregorian: '',
            expiryDateEthiopian: '',
            expiryDateGregorian: '',
            sex: 'Male',
            sexAmharic: '',
            phoneNumber: '',
            regionAmharic: '',
            regionEnglish: '',
            zoneAmharic: '',
            zoneEnglish: '',
            woredaAmharic: '',
            woredaEnglish: '',
            fcn: '',
            fin: ''
        };
        // Extract ALL dates from PDF
        // Format 1: DD/MM/YYYY (Gregorian style)
        // Format 2: YYYY/MM/DD (Ethiopian style)
        const datePattern1 = /(\d{2}\/\d{2}\/\d{4})/g;
        const datePattern2 = /(\d{4}\/\d{2}\/\d{2})/g;
        const dates1 = text.match(datePattern1) || [];
        const dates2 = text.match(datePattern2) || [];
        // DOB is typically the first date, expiry is typically the second date
        if (dates1.length > 0)
            data.dateOfBirthGregorian = dates1[0] || '';
        if (dates1.length > 1)
            data.expiryDateGregorian = dates1[1] || '';
        if (dates2.length > 0)
            data.dateOfBirthEthiopian = dates2[0] || '';
        if (dates2.length > 1)
            data.expiryDateEthiopian = dates2[1] || '';
        // Extract phone number
        const phonePattern = /(09\d{8})/;
        const phoneMatch = text.match(phonePattern);
        if (phoneMatch)
            data.phoneNumber = phoneMatch[1];
        // Extract FCN (16 digits with spaces) - this is the FAN
        const fcnPattern = /(\d{4}\s+\d{4}\s+\d{4}\s+\d{4})/;
        const fcnMatch = text.match(fcnPattern);
        if (fcnMatch)
            data.fcn = fcnMatch[1];
        // Extract FIN (12 digits with spaces) - look for different pattern
        // FIN format is typically XXXX XXXX XXXX (12 digits)
        const finPattern = /(\d{4}\s+\d{4}\s+\d{4})(?!\s+\d)/;
        const finMatch = text.match(finPattern);
        if (finMatch) {
            data.fin = finMatch[1];
        }
        else {
            // If no separate FIN found, generate from FCN (first 12 digits)
            const fcnDigits = data.fcn.replace(/\s/g, '');
            if (fcnDigits.length >= 12) {
                const finDigits = fcnDigits.substring(0, 12);
                data.fin = `${finDigits.substring(0, 4)} ${finDigits.substring(4, 8)} ${finDigits.substring(8, 12)}`;
            }
        }
        // Extract sex
        if (text.includes('ወንድ')) {
            data.sexAmharic = 'ወንድ';
            data.sex = 'Male';
        }
        else if (text.includes('ሴት')) {
            data.sexAmharic = 'ሴት';
            data.sex = 'Female';
        }
        // Extract English name
        const englishNamePattern = /([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)/g;
        const englishMatches = [...text.matchAll(englishNamePattern)];
        const excludeEnglish = ['Ethiopian', 'Digital', 'National', 'Date', 'Birth', 'Sub', 'City', 'Phone', 'Number', 'Region', 'Woreda', 'Demographic', 'Data', 'Disclaimer', 'Personal'];
        for (let i = englishMatches.length - 1; i >= 0; i--) {
            const fullMatch = englishMatches[i][0];
            const words = fullMatch.split(/\s+/);
            const isExcluded = words.some(w => excludeEnglish.includes(w));
            if (!isExcluded) {
                data.fullNameEnglish = fullMatch;
                break;
            }
        }
        // Extract Amharic name
        const amharicNamePattern = /^([\u1200-\u137F]+\s+[\u1200-\u137F]+\s+[\u1200-\u137F]+)$/gm;
        const amharicMatches = [...text.matchAll(amharicNamePattern)];
        const excludeAmharic = ['ኢትዮጵያ', 'ብሔራዊ', 'መታወቂያ', 'ፕሮግራም', 'ዲጂታል', 'ካርድ', 'ክፍለ', 'ከተማ', 'ወረዳ', 'ክልል', 'ዜግነት', 'ስልክ', 'የስነ', 'ሕዝብ', 'መረጃ', 'ማሳሰቢያ'];
        for (let i = amharicMatches.length - 1; i >= 0; i--) {
            const fullMatch = amharicMatches[i][1];
            const words = fullMatch.split(/\s+/);
            const isExcluded = words.some(w => excludeAmharic.some(e => w.includes(e)));
            if (!isExcluded && words.length >= 3) {
                data.fullNameAmharic = fullMatch;
                break;
            }
        }
        // Region
        if (text.includes('ትግራይ')) {
            data.regionAmharic = 'ትግራይ';
            data.regionEnglish = 'Tigray';
        }
        else if (text.includes('አዲስ አበባ')) {
            data.regionAmharic = 'አዲስ አበባ';
            data.regionEnglish = 'Addis Ababa';
        }
        else if (text.includes('አማራ')) {
            data.regionAmharic = 'አማራ';
            data.regionEnglish = 'Amhara';
        }
        else if (text.includes('ኦሮሚያ')) {
            data.regionAmharic = 'ኦሮሚያ';
            data.regionEnglish = 'Oromia';
        }
        // Zone/City
        if (text.includes('መቐለ')) {
            data.zoneAmharic = 'መቐለ';
            data.zoneEnglish = 'Mekelle';
        }
        else if (text.includes('አዲስ አበባ') && !data.zoneAmharic) {
            data.zoneAmharic = 'አዲስ አበባ';
            data.zoneEnglish = 'Addis Ababa';
        }
        // Woreda
        const woredaAmharicPattern = /([\u1200-\u137F]+)\s*ክ\/ከተማ/;
        const woredaMatch = text.match(woredaAmharicPattern);
        if (woredaMatch) {
            data.woredaAmharic = woredaMatch[0];
        }
        const woredaEnglishPattern = /([A-Za-z]+)\s+Sub\s+City/i;
        const woredaEnglishMatch = text.match(woredaEnglishPattern);
        if (woredaEnglishMatch) {
            data.woredaEnglish = woredaEnglishMatch[0];
        }
        return data;
    }
    /**
     * Extract expiry date from images using targeted OCR on the expiry area
     */
    async extractExpiryFromImages(images) {
        const result = {
            expiryDateGregorian: '',
            expiryDateEthiopian: ''
        };
        try {
            // Focus on the front card image (image 3) for expiry date extraction
            if (images.frontCardImage) {
                logger_1.logger.info('Performing targeted OCR on expiry area (below sex field)...');
                // Import sharp for image processing
                const sharp = require('sharp');
                // Get image dimensions
                const metadata = await sharp(images.frontCardImage).metadata();
                logger_1.logger.info(`Front card image dimensions: ${metadata.width}x${metadata.height}`);
                // Crop the bottom portion where expiry date is located (below sex field)
                const cropHeight = Math.floor(metadata.height * 0.4); // Bottom 40% of image
                const cropTop = Math.floor(metadata.height * 0.6); // Start from 60% down
                const croppedBuffer = await sharp(images.frontCardImage)
                    .extract({
                    left: 0,
                    top: cropTop,
                    width: metadata.width,
                    height: cropHeight
                })
                    .toBuffer();
                logger_1.logger.info(`Cropped expiry area: top=${cropTop}, height=${cropHeight}`);
                // Run OCR on the cropped area
                const ocrResult = await tesseract_js_1.default.recognize(croppedBuffer, 'eng', {
                    logger: (m) => {
                        if (m.status === 'recognizing text') {
                            logger_1.logger.debug(`Expiry OCR progress: ${Math.round(m.progress * 100)}%`);
                        }
                    }
                });
                const ocrText = ocrResult.data.text;
                logger_1.logger.info(`Expiry area OCR extracted ${ocrText.length} characters`);
                logger_1.logger.debug('Expiry OCR Text:', ocrText);
                // Look for expiry dates in OCR text
                const expiryDates = this.extractExpiryFromTargetedOCRText(ocrText);
                if (expiryDates.expiryDateGregorian || expiryDates.expiryDateEthiopian) {
                    result.expiryDateGregorian = expiryDates.expiryDateGregorian;
                    result.expiryDateEthiopian = expiryDates.expiryDateEthiopian;
                    logger_1.logger.info('Found expiry dates in targeted OCR:', expiryDates);
                    return result;
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Targeted OCR extraction failed:', error);
        }
        return result;
    }
    /**
     * Extract expiry dates from targeted OCR text (focused on expiry area)
     */
    extractExpiryFromTargetedOCRText(text) {
        const result = {
            expiryDateGregorian: '',
            expiryDateEthiopian: ''
        };
        logger_1.logger.debug('Analyzing targeted OCR text for expiry dates...');
        // Look for "Date of Expiry" or "Expiry" followed by dates
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lowerLine = line.toLowerCase();
            // Check if this line or the next line contains expiry information
            if (lowerLine.includes('expiry') || lowerLine.includes('expire')) {
                logger_1.logger.debug(`Found expiry keyword in line: ${line}`);
                // Look for dates in this line and the next few lines
                const searchLines = lines.slice(i, Math.min(i + 3, lines.length));
                const searchText = searchLines.join(' ');
                // Look for date patterns in the expiry context
                const datePatterns = [
                    { name: 'DD/MM/YYYY', regex: /(\d{1,2}\/\d{1,2}\/\d{4})/g, type: 'gregorian' },
                    { name: 'YYYY/MM/DD', regex: /(\d{4}\/\d{1,2}\/\d{1,2})/g, type: 'ethiopian' },
                    { name: 'YYYY/Mon/DD', regex: /(\d{4}\/[A-Za-z]{3}\/\d{1,2})/g, type: 'ethiopian' },
                    { name: 'YYYY/0ct/DD', regex: /(\d{4}\/0ct\/\d{1,2})/g, type: 'ethiopian' }, // Handle OCR misread
                ];
                for (const pattern of datePatterns) {
                    const matches = [...searchText.matchAll(pattern.regex)];
                    for (const match of matches) {
                        const dateStr = match[1];
                        // Skip if it's clearly a DOB (years before 2020)
                        const year = pattern.type === 'gregorian' ?
                            parseInt(dateStr.split('/')[2]) :
                            parseInt(dateStr.split('/')[0]);
                        if (year > 2020) { // Future date, likely expiry
                            // Smart classification based on year ranges
                            if (year >= 2025 && year <= 2030) {
                                // Years 2025-2030 are likely Gregorian expiry dates
                                result.expiryDateGregorian = dateStr;
                                logger_1.logger.info(`Found Gregorian expiry date: ${dateStr}`);
                            }
                            else if (year >= 2030 && year <= 2040) {
                                // Years 2030-2040 are likely Ethiopian expiry dates
                                let cleanDate = dateStr.replace('/0ct/', '/10/'); // Fix Oct -> 10
                                result.expiryDateEthiopian = cleanDate;
                                logger_1.logger.info(`Found Ethiopian expiry date: ${cleanDate}`);
                            }
                            else {
                                // Fallback to pattern-based classification
                                if (pattern.type === 'gregorian') {
                                    result.expiryDateGregorian = dateStr;
                                    logger_1.logger.info(`Found Gregorian expiry date: ${dateStr}`);
                                }
                                else {
                                    let cleanDate = dateStr.replace('/0ct/', '/10/'); // Fix Oct -> 10
                                    result.expiryDateEthiopian = cleanDate;
                                    logger_1.logger.info(`Found Ethiopian expiry date: ${cleanDate}`);
                                }
                            }
                        }
                    }
                }
                // If we found expiry dates, break
                if (result.expiryDateGregorian || result.expiryDateEthiopian) {
                    break;
                }
            }
        }
        // If no expiry keyword found, look for dates that appear after DOB
        if (!result.expiryDateGregorian && !result.expiryDateEthiopian) {
            logger_1.logger.debug('No expiry keyword found, looking for dates after DOB...');
            // Find all dates and assume the later ones are expiry
            const allDates = [];
            const patterns = [
                { regex: /(\d{1,2}\/\d{1,2}\/\d{4})/g, type: 'gregorian' },
                { regex: /(\d{4}\/\d{1,2}\/\d{1,2})/g, type: 'ethiopian' },
                { regex: /(\d{4}\/[A-Za-z]{3}\/\d{1,2})/g, type: 'ethiopian' },
            ];
            patterns.forEach(pattern => {
                const matches = [...text.matchAll(pattern.regex)];
                matches.forEach(match => {
                    const dateStr = match[1];
                    const year = pattern.type === 'gregorian' ?
                        parseInt(dateStr.split('/')[2]) :
                        parseInt(dateStr.split('/')[0]);
                    allDates.push({ date: dateStr, year: year, type: pattern.type });
                });
            });
            // Sort by year and take the latest dates as expiry
            allDates.sort((a, b) => a.year - b.year);
            // Find the latest gregorian and ethiopian dates
            const latestGregorian = allDates.filter(d => d.type === 'gregorian' && d.year > 2020).pop();
            const latestEthiopian = allDates.filter(d => d.type === 'ethiopian' && d.year > 2020).pop();
            if (latestGregorian) {
                result.expiryDateGregorian = latestGregorian.date;
                logger_1.logger.info(`Selected latest Gregorian date as expiry: ${latestGregorian.date}`);
            }
            if (latestEthiopian) {
                result.expiryDateEthiopian = latestEthiopian.date;
                logger_1.logger.info(`Selected latest Ethiopian date as expiry: ${latestEthiopian.date}`);
            }
        }
        return result;
    }
    async parse(buffer) {
        const text = await this.extractText(buffer);
        const images = await this.extractImages(buffer);
        const parsed = this.parsePdfText(text);
        // Use OCR to extract expiry dates from images
        const ocrExpiry = await this.extractExpiryFromImages(images);
        logger_1.logger.info(`Parsed: FCN=${parsed.fcn}, FIN=${parsed.fin}`);
        logger_1.logger.info(`Parsed Amharic: region=${parsed.regionAmharic}, zone=${parsed.zoneAmharic}, woreda=${parsed.woredaAmharic}`);
        logger_1.logger.info(`OCR Expiry: Gregorian=${ocrExpiry.expiryDateGregorian}, Ethiopian=${ocrExpiry.expiryDateEthiopian}`);
        return {
            fullNameAmharic: parsed.fullNameAmharic,
            fullNameEnglish: parsed.fullNameEnglish,
            dateOfBirthEthiopian: parsed.dateOfBirthEthiopian,
            dateOfBirthGregorian: parsed.dateOfBirthGregorian,
            sex: parsed.sex,
            nationality: 'Ethiopian',
            phoneNumber: parsed.phoneNumber,
            region: parsed.regionEnglish,
            city: parsed.zoneEnglish,
            subcity: parsed.woredaEnglish,
            fcn: parsed.fcn,
            fin: parsed.fin,
            fan: parsed.fcn,
            serialNumber: String(Math.floor(1000000 + Math.random() * 9000000)),
            // Use OCR-extracted expiry dates or fallback to calculated dates
            issueDate: this.calculateIssueDate(parsed.dateOfBirthGregorian),
            issueDateEthiopian: this.calculateIssueDateEthiopian(parsed.dateOfBirthEthiopian),
            expiryDate: ocrExpiry.expiryDateGregorian || parsed.expiryDateGregorian || this.calculateExpiryDate(parsed.dateOfBirthGregorian),
            expiryDateGregorian: ocrExpiry.expiryDateGregorian || parsed.expiryDateGregorian || this.calculateExpiryDate(parsed.dateOfBirthGregorian),
            expiryDateEthiopian: ocrExpiry.expiryDateEthiopian || parsed.expiryDateEthiopian || this.calculateExpiryDateEthiopian(parsed.dateOfBirthEthiopian),
            photo: images.photo || undefined,
            qrCode: images.qrCode || undefined,
            barcode: images.barcode || undefined,
            // Store Amharic values for rendering
            regionAmharic: parsed.regionAmharic,
            zoneAmharic: parsed.zoneAmharic,
            woredaAmharic: parsed.woredaAmharic,
            sexAmharic: parsed.sexAmharic
        };
    }
    /**
     * Calculate issue date (current date in YYYY/MM/DD format)
     */
    calculateIssueDate(_dobGregorian) {
        const now = new Date();
        return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
    }
    /**
     * Calculate issue date in Ethiopian calendar (approximately 7-8 years behind)
     */
    calculateIssueDateEthiopian(_dobEthiopian) {
        const now = new Date();
        const ethYear = now.getFullYear() - 8;
        return `${ethYear}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
    }
    /**
     * Calculate expiry date (10 years from DOB, not current date)
     */
    calculateExpiryDate(dobGregorian) {
        try {
            if (!dobGregorian) {
                // Fallback to current date + 10 years
                const now = new Date();
                const expiry = new Date(now);
                expiry.setFullYear(expiry.getFullYear() + 10);
                return `${expiry.getFullYear()}/${String(expiry.getMonth() + 1).padStart(2, '0')}/${String(expiry.getDate()).padStart(2, '0')}`;
            }
            // Parse DOB (format: DD/MM/YYYY)
            const [day, month, year] = dobGregorian.split('/').map(Number);
            const dobDate = new Date(year, month - 1, day);
            // Calculate expiry as DOB + 30 years (more realistic for ID cards)
            const expiryDate = new Date(dobDate);
            expiryDate.setFullYear(expiryDate.getFullYear() + 30);
            return `${expiryDate.getFullYear()}/${String(expiryDate.getMonth() + 1).padStart(2, '0')}/${String(expiryDate.getDate()).padStart(2, '0')}`;
        }
        catch (error) {
            logger_1.logger.error('Error calculating expiry date:', error);
            // Fallback
            const now = new Date();
            const expiry = new Date(now);
            expiry.setFullYear(expiry.getFullYear() + 10);
            return `${expiry.getFullYear()}/${String(expiry.getMonth() + 1).padStart(2, '0')}/${String(expiry.getDate()).padStart(2, '0')}`;
        }
    }
    /**
     * Calculate expiry date in Ethiopian calendar (DOB + 30 years)
     */
    calculateExpiryDateEthiopian(dobEthiopian) {
        try {
            if (!dobEthiopian) {
                // Fallback
                const now = new Date();
                const expiry = new Date(now);
                expiry.setFullYear(expiry.getFullYear() + 10);
                const ethYear = expiry.getFullYear() - 8;
                return `${ethYear}/${String(expiry.getMonth() + 1).padStart(2, '0')}/${String(expiry.getDate()).padStart(2, '0')}`;
            }
            // Parse Ethiopian DOB (format: YYYY/MM/DD)
            const [year, month, day] = dobEthiopian.split('/').map(Number);
            // Add 30 years to Ethiopian year
            const expiryYear = year + 30;
            return `${expiryYear}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
        }
        catch (error) {
            logger_1.logger.error('Error calculating Ethiopian expiry date:', error);
            // Fallback
            const now = new Date();
            const expiry = new Date(now);
            expiry.setFullYear(expiry.getFullYear() + 10);
            const ethYear = expiry.getFullYear() - 8;
            return `${ethYear}/${String(expiry.getMonth() + 1).padStart(2, '0')}/${String(expiry.getDate()).padStart(2, '0')}`;
        }
    }
}
exports.PDFParserImpl = PDFParserImpl;
exports.pdfParser = new PDFParserImpl();
exports.default = exports.pdfParser;
//# sourceMappingURL=parser.js.map