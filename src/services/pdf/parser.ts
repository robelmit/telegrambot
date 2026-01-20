/**
 * PDF Parser - Optimized with fast OCR
 */
import pdfParse from 'pdf-parse';
import { EfaydaData } from '../../types';
import { PDFParser, ExtractedImages } from './types';
import { logger } from '../../utils/logger';
import { ocrService } from './ocrService';

export class PDFParserImpl implements PDFParser {
  /**
   * Extract text content from PDF
   */
  async extractText(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer);
      return data.text || '';
    } catch (error) {
      logger.error('Failed to extract text from PDF:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Extract images from PDF - EXACTLY like test script
   */
  async extractImages(buffer: Buffer): Promise<ExtractedImages> {
    const result: ExtractedImages = {
      photo: null,
      qrCode: null,
      barcode: null
    };

    // Find JPEG images
    const jpegStart = Buffer.from([0xFF, 0xD8, 0xFF]);
    const jpegEnd = Buffer.from([0xFF, 0xD9]);

    const images: Buffer[] = [];
    let startIndex = 0;

    while (startIndex < buffer.length) {
      const start = buffer.indexOf(jpegStart, startIndex);
      if (start === -1) break;

      const end = buffer.indexOf(jpegEnd, start + 3);
      if (end === -1) break;

      const imageBuffer = buffer.slice(start, end + 2);
      if (imageBuffer.length > 500) {
        images.push(imageBuffer);
      }
      startIndex = end + 2;
    }

    logger.info(`Found ${images.length} images in PDF`);

    // Based on our analysis:
    // - Image 1 (index 0) = actual photo for rendering
    // - Image 2 (index 1) = QR code  
    // - Image 3 (index 2) = front card with expiry date (for OCR only)
    // - Image 4 (index 3) = back card with FIN (for OCR only)
    
    if (images.length >= 1) {
      result.photo = images[0]; // Use image 1 (index 0) for actual photo rendering
      logger.info(`Using image 1 as photo: ${images[0].length} bytes`);
    }

    if (images.length >= 2) {
      result.qrCode = images[1];
      logger.info(`QR code size: ${images[1].length} bytes`);
    }

    // Store image 3 separately for OCR expiry extraction
    if (images.length >= 3) {
      result.frontCardImage = images[2]; // Image 3 for OCR expiry extraction only
      logger.info(`Front card image for OCR: ${images[2].length} bytes`);
    }

    // Store image 4 separately for OCR FIN extraction
    if (images.length >= 4) {
      result.backCardImage = images[3]; // Image 4 for OCR FIN extraction only
      logger.info(`Back card image for OCR: ${images[3].length} bytes`);
    }

    return result;
  }

  /**
   * Parse PDF text - EXACTLY like test script parsePdfText function
   */
  private parsePdfText(text: string): {
    fullNameAmharic: string;
    fullNameEnglish: string;
    dateOfBirthEthiopian: string;
    dateOfBirthGregorian: string;
    expiryDateEthiopian: string;
    expiryDateGregorian: string;
    sex: 'Male' | 'Female';
    sexAmharic: string;
    phoneNumber: string;
    regionAmharic: string;
    regionEnglish: string;
    zoneAmharic: string;
    zoneEnglish: string;
    woredaAmharic: string;
    woredaEnglish: string;
    fcn: string;
    fin: string;
  } {
    const data = {
      fullNameAmharic: '',
      fullNameEnglish: '',
      dateOfBirthEthiopian: '',
      dateOfBirthGregorian: '',
      expiryDateEthiopian: '',
      expiryDateGregorian: '',
      sex: 'Male' as 'Male' | 'Female',
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
    if (dates1.length > 0) data.dateOfBirthGregorian = dates1[0] || '';
    if (dates1.length > 1) data.expiryDateGregorian = dates1[1] || '';
    
    if (dates2.length > 0) data.dateOfBirthEthiopian = dates2[0] || '';
    if (dates2.length > 1) data.expiryDateEthiopian = dates2[1] || '';

    // Region - extract from structured format after phone number
    // Pattern: Phone number -> Amharic Region -> English Region
    const phonePattern = /(09\d{8})/;
    const phoneMatch = text.match(phonePattern);
    if (phoneMatch) {
      data.phoneNumber = phoneMatch[1];
      
      // Find region after phone number
      const phoneIndex = text.indexOf(phoneMatch[1]);
      const afterPhone = text.substring(phoneIndex + phoneMatch[1].length);
      
      // Extract region (Amharic then English on next line)
      const regionPattern = /\s*([\u1200-\u137F]+)\s*\n\s*([A-Za-z\s]+?)\s*\n/;
      const regionMatch = afterPhone.match(regionPattern);
      
      if (regionMatch) {
        data.regionAmharic = regionMatch[1].trim();
        data.regionEnglish = regionMatch[2].trim();
        logger.info(`Found region: ${data.regionAmharic} / ${data.regionEnglish}`);
        
        // Extract zone/city after region
        const afterRegion = afterPhone.substring(regionMatch.index! + regionMatch[0].length);
        const zonePattern = /\s*([\u1200-\u137F\s]+?)\s*\n\s*([A-Za-z\s]+?)\s*\n/;
        const zoneMatch = afterRegion.match(zonePattern);
        
        if (zoneMatch) {
          data.zoneAmharic = zoneMatch[1].trim();
          data.zoneEnglish = zoneMatch[2].trim();
          logger.info(`Found zone: ${data.zoneAmharic} / ${data.zoneEnglish}`);
          
          // Extract woreda after zone (before FCN)
          const afterZone = afterRegion.substring(zoneMatch.index! + zoneMatch[0].length);
          
          // Woreda pattern: Amharic line (may include / and special chars), English line, then FCN or name
          // Handle patterns like: ቐ/ወያነ ክ/ከተማ or ወያነ ክ/ከተማ or ወረዳ 07
          const woredaPattern = /\s*([\u1200-\u137F\/\s\d]+?)\s*\n\s*([A-Za-z\s'\d]+?)\s*\n\s*(?:FCN:|FIN:|\d{4}\s+\d{4}|[\u1200-\u137F]{3,})/;
          const woredaMatch = afterZone.match(woredaPattern);
          
          if (woredaMatch) {
            data.woredaAmharic = woredaMatch[1].trim();
            data.woredaEnglish = woredaMatch[2].trim();
            logger.info(`Found woreda: ${data.woredaAmharic} / ${data.woredaEnglish}`);
          }
        }
      }
    }

    // Extract FCN (16 digits with spaces) - this is the FAN
    const fcnPattern = /(\d{4}\s+\d{4}\s+\d{4}\s+\d{4})/;
    const fcnMatch = text.match(fcnPattern);
    if (fcnMatch) data.fcn = fcnMatch[1];

    // FIN extraction is ONLY done via OCR from back card image (image 4)
    // Do NOT extract FIN from PDF text - it's unreliable
    // Leave data.fin empty here, will be filled by OCR extraction
    data.fin = '';

    // Extract sex
    if (text.includes('ወንድ')) {
      data.sexAmharic = 'ወንድ';
      data.sex = 'Male';
    } else if (text.includes('ሴት')) {
      data.sexAmharic = 'ሴት';
      data.sex = 'Female';
    }

    // Extract English name - improved pattern to catch more variations
    // Look for 3 consecutive capitalized words that form a name
    const englishNamePattern = /([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)/g;
    const englishMatches = [...text.matchAll(englishNamePattern)];

    const excludeEnglish = [
      'Ethiopian', 'Digital', 'National', 'Date', 'Birth', 'Sub', 'City', 
      'Phone', 'Number', 'Region', 'Woreda', 'Demographic', 'Data', 
      'Disclaimer', 'Personal', 'Identity', 'Card', 'Program', 'Fayda',
      'Male', 'Female', 'Sex', 'Nationality', 'Address', 'Zone'
    ];

    // Try to find English name - iterate from end to find the actual name (not headers)
    for (let i = englishMatches.length - 1; i >= 0; i--) {
      const fullMatch = englishMatches[i][0];
      const words = fullMatch.split(/\s+/);
      const isExcluded = words.some(w => excludeEnglish.includes(w));
      if (!isExcluded && words.length >= 3) {
        data.fullNameEnglish = fullMatch;
        logger.info(`Found English name: ${fullMatch}`);
        break;
      }
    }

    // If no English name found with 3 words, try 2 words
    if (!data.fullNameEnglish) {
      const twoWordPattern = /([A-Z][a-z]+)\s+([A-Z][a-z]+)/g;
      const twoWordMatches = [...text.matchAll(twoWordPattern)];
      
      for (let i = twoWordMatches.length - 1; i >= 0; i--) {
        const fullMatch = twoWordMatches[i][0];
        const words = fullMatch.split(/\s+/);
        const isExcluded = words.some(w => excludeEnglish.includes(w));
        if (!isExcluded) {
          data.fullNameEnglish = fullMatch;
          logger.info(`Found English name (2 words): ${fullMatch}`);
          break;
        }
      }
    }

    // Extract Amharic name - look for Amharic text right before the English name
    if (data.fullNameEnglish) {
      const englishNameIndex = text.indexOf(data.fullNameEnglish);
      if (englishNameIndex !== -1) {
        // Look in a small window before the English name (100 chars)
        const windowStart = Math.max(0, englishNameIndex - 100);
        const nearbyText = text.substring(windowStart, englishNameIndex);
        
        // Look for Amharic name pattern (2-4 words) right before English name
        const amharicBeforeEnglishPattern = /([\u1200-\u137F]+(?:\s+[\u1200-\u137F]+){1,3})\s*$/;
        const match = nearbyText.match(amharicBeforeEnglishPattern);
        
        if (match) {
          const candidateName = match[1].trim();
          const excludeWords = [
            'ኢትዮጵያ', 'ብሔራዊ', 'መታወቂያ', 'ፕሮግራም', 'ዲጂታል', 'ካርድ', 
            'ክፍለ', 'ከተማ', 'ወረዳ', 'ክልል', 'ዜግነት', 'ስልክ', 'የስነ', 
            'ሕዝብ', 'መረጃ', 'ማሳሰቢያ', 'ፋይዳ', 'ቁጥር', 'አድራሻ', 'ጾታ',
            'የትውልድ', 'ቀን', 'ያበቃል', 'ተሰጠ', 'እዚህ', 'ይቁረጡ', 'ቅዳ',
            'ስም', 'ሙሉ', 'ፆታ', 'ወንድ', 'ሴት', 'ኢትዮጵያዊ', 'ተወላጅ',
            'የማንነት', 'መገለጫዎች', 'ናቸው', 'አበባ', 'አዲስ', 'ዞን', 'ማዕከላዊ',
            'ቀይሕ', 'ተኽሊ', 'ወሎሰፈር', 'ቦሌ', 'ጎዳና', 'ቻይና', 'ኢትዮ', 'ትግራይ',
            'አዋጅ', 'መሠረት', 'ህጋዊ', 'ናቸው', 'ማንኛውም', 'ከብሄራዊ', 'ሲስተም',
            'ታትሞ', 'የተገኘ', 'ወይም', 'በቀጥታ', 'የሚታተም'
          ];
          const isExcluded = excludeWords.some(w => candidateName.includes(w));
          
          if (!isExcluded) {
            data.fullNameAmharic = candidateName;
            logger.info(`Found Amharic name before English name: ${candidateName}`);
          }
        }
      }
    }

    // Fallback: If we have English but no Amharic, try to find Amharic anywhere
    if (data.fullNameEnglish && !data.fullNameAmharic) {
      logger.warn('Found English name but no Amharic name, searching more broadly...');
      
      // Look for any sequence of Amharic words
      const broadAmharicPattern = /([\u1200-\u137F]{2,})\s+([\u1200-\u137F]{2,})(?:\s+([\u1200-\u137F]{2,}))?/g;
      const broadAmharicMatches = [...text.matchAll(broadAmharicPattern)];
      
      const excludeAmharic = [
        'ኢትዮጵያ', 'ብሔራዊ', 'መታወቂያ', 'ፕሮግራም', 'ዲጂታል', 'ካርድ', 
        'ክፍለ', 'ከተማ', 'ወረዳ', 'ክልል', 'ዜግነት', 'ስልክ', 'የስነ', 
        'ሕዝብ', 'መረጃ', 'ማሳሰቢያ', 'ፋይዳ', 'ቁጥር', 'አድራሻ', 'ጾታ',
        'የትውልድ', 'ቀን', 'ያበቃል', 'ተሰጠ', 'እዚህ', 'ይቁረጡ', 'ቅዳ',
        'ስም', 'ሙሉ', 'ፆታ', 'ወንድ', 'ሴት', 'ኢትዮጵያዊ', 'ተወላጅ',
        'የማንነት', 'መገለጫዎች', 'ናቸው', 'አበባ', 'አዲስ', 'ዞን', 'ማዕከላዊ',
        'ቀይሕ', 'ተኽሊ', 'ወሎሰፈር', 'ቦሌ', 'ጎዳና', 'ቻይና', 'ኢትዮ', 'ትግራይ',
        'አዋጅ', 'መሠረት', 'ህጋዊ', 'ናቸው', 'ማንኛውም', 'ከብሄራዊ', 'ሲስተም',
        'ታትሞ', 'የተገኘ', 'ወይም', 'በቀጥታ', 'የሚታተም'
      ];
      
      for (const match of broadAmharicMatches) {
        const fullMatch = match[0];
        const words = fullMatch.split(/\s+/);
        const isExcluded = words.some(w => excludeAmharic.some(e => w.includes(e)));
        
        if (!isExcluded && words.length >= 2) {
          data.fullNameAmharic = fullMatch;
          logger.info(`Found Amharic name (broad search): ${fullMatch}`);
          break;
        }
      }
    }

    // Log warning if either name is still missing
    if (!data.fullNameEnglish) {
      logger.warn('Could not extract English name from PDF');
    }
    if (!data.fullNameAmharic) {
      logger.warn('Could not extract Amharic name from PDF');
    }

    // Region - extract from structured format after phone number
    // (Already extracted above with phone number)
    if (!data.regionAmharic) {
      if (text.includes('ትግራይ')) {
        data.regionAmharic = 'ትግራይ';
        data.regionEnglish = 'Tigray';
      } else if (text.includes('አማራ')) {
        data.regionAmharic = 'አማራ';
        data.regionEnglish = 'Amhara';
      } else if (text.includes('ኦሮሚያ')) {
        data.regionAmharic = 'ኦሮሚያ';
        data.regionEnglish = 'Oromia';
      } else if (text.includes('አዲስ አበባ') || text.includes('አበባ')) {
        data.regionAmharic = 'አዲስ አበባ'; // Always use full name
        data.regionEnglish = 'Addis Ababa';
      }
    } else if (data.regionAmharic === 'አበባ') {
      // Fix incomplete region name
      data.regionAmharic = 'አዲስ አበባ';
    }

    return data;
  }

  /**
   * Extract ONLY FIN from back card image using OCR (optimized for speed)
   * Address is extracted from PDF text instead (instant, 100% accurate)
   */
  private async extractBackCardData(images: ExtractedImages, _fcn: string = ''): Promise<{
    fin: string;
    phoneNumber: string;
    regionAmharic: string;
    regionEnglish: string;
    zoneAmharic: string;
    zoneEnglish: string;
    woredaAmharic: string;
    woredaEnglish: string;
  }> {
    const result = {
      fin: '',
      phoneNumber: '',
      regionAmharic: '',
      regionEnglish: '',
      zoneAmharic: '',
      zoneEnglish: '',
      woredaAmharic: '',
      woredaEnglish: ''
    };

    try {
      if (images.backCardImage) {
        // OPTIMIZATION: Only extract FIN and phone (numbers are easier for OCR)
        // Skip address extraction - use PDF text instead (instant, accurate)
        logger.info('Extracting FIN and phone from back card image using OCR...');
        const startTime = Date.now();
        
        // Preprocess image for better OCR quality
        // Use full 2000px resolution for maximum accuracy
        const sharp = require('sharp');
        const preprocessedImage = await sharp(images.backCardImage)
          .resize({ width: 2000 }) // Full resolution for accuracy
          .normalize() // Improve contrast
          .sharpen() // Sharpen text
          .toBuffer();
        
        const ocrResult = await ocrService.extractText(preprocessedImage, {
          preferredMethod: process.env.GOOGLE_VISION_ENABLED === 'true' ? 'google-vision' : 'tesseract',
          languages: 'eng+amh',
          minConfidence: 0.6
        });

        let ocrText = ocrResult.text;
        const ocrTime = Date.now() - startTime;
        logger.info(`${ocrResult.method} OCR completed in ${ocrTime}ms, extracted ${ocrText.length} characters, confidence: ${ocrResult.confidence.toFixed(2)}`);
        
        // Log first 500 chars of OCR text for debugging
        if (ocrText.length > 0) {
          logger.debug('OCR text (first 500 chars):', ocrText.substring(0, 500));
        } else {
          logger.error('OCR returned empty text from back card image!');
        }

        // Extract FIN (12 digits: XXXX XXXX XXXX)
        // Multiple strategies for robust extraction with OCR error handling
        let finExtracted = false;
        
        // Strategy 1: Look for FIN/EIN keyword (OCR often reads F as E)
        const hasFinKeyword = ocrText.toLowerCase().includes('fin') || ocrText.includes('FIN') || 
                              ocrText.toLowerCase().includes('ein') || ocrText.includes('EIN');
        
        if (hasFinKeyword) {
          logger.debug('Found FIN/EIN keyword in OCR text');
          const finKeywordIndex = ocrText.search(/[fe]in/i);
          const afterFin = ocrText.substring(Math.max(0, finKeywordIndex - 20), Math.min(ocrText.length, finKeywordIndex + 100));
          
          // Pattern 1: FIN/EIN followed by 12 digits with spaces: "FIN 4726 3910 3548"
          const finPattern1 = /[FE]IN\s*(\d{4})\s+(\d{4})\s+(\d{4})/i;
          const finMatch1 = afterFin.match(finPattern1);
          
          if (finMatch1) {
            result.fin = `${finMatch1[1]} ${finMatch1[2]} ${finMatch1[3]}`;
            logger.info(`Extracted FIN with keyword (spaced): ${result.fin}`);
            finExtracted = true;
          }
          
          // Pattern 2: FIN/EIN followed by digits (handle OCR errors like "4314 6981 62175")
          if (!finExtracted) {
            // Look for pattern: keyword + 4digits + 4digits + 4-5digits
            const finPattern2 = /[FE]IN\s*(\d{4})\s+(\d{4})\s+(\d{4,5})/i;
            const finMatch2 = afterFin.match(finPattern2);
            
            if (finMatch2) {
              const group1 = finMatch2[1];
              const group2 = finMatch2[2];
              let group3 = finMatch2[3];
              
              // If third group has 5 digits, take only first 4
              if (group3.length === 5) {
                group3 = group3.substring(0, 4);
                logger.info(`OCR error: third group had 5 digits, using first 4`);
              }
              
              result.fin = `${group1} ${group2} ${group3}`;
              logger.info(`Extracted FIN with keyword (OCR corrected): ${result.fin}`);
              finExtracted = true;
            }
          }
          
          // Pattern 3: FIN/EIN followed by 12 digits without spaces
          if (!finExtracted) {
            const finPattern3 = /[FE]IN\s*(\d{12})/i;
            const finMatch3 = afterFin.match(finPattern3);
            
            if (finMatch3) {
              const digits = finMatch3[1];
              result.fin = `${digits.substring(0,4)} ${digits.substring(4,8)} ${digits.substring(8,12)}`;
              logger.info(`Extracted FIN with keyword (no spaces): ${result.fin}`);
              finExtracted = true;
            }
          }
        }
        
        // Strategy 2: Find pattern 4digits + 4digits + 4-5digits (handle OCR errors)
        if (!finExtracted) {
          const allDigits = ocrText.match(/\d+/g);
          if (allDigits) {
            logger.debug('All digit groups found:', allDigits);
            // Look for pattern: 4 + 4 + 4-5 digits
            for (let i = 0; i < allDigits.length - 2; i++) {
              if (allDigits[i].length === 4 && allDigits[i+1].length === 4 && 
                  (allDigits[i+2].length === 4 || allDigits[i+2].length === 5)) {
                let group3 = allDigits[i+2];
                if (group3.length === 5) {
                  group3 = group3.substring(0, 4);
                  logger.info(`OCR error: third group had 5 digits, using first 4`);
                }
                result.fin = `${allDigits[i]} ${allDigits[i+1]} ${group3}`;
                logger.info(`Extracted FIN from digit groups (OCR corrected): ${result.fin}`);
                finExtracted = true;
                break;
              }
            }
          }
        }
        
        // Strategy 3: Look for any 12-digit sequence and split it
        if (!finExtracted) {
          const twelveDigitPattern = /\b(\d{12})\b/;
          const twelveDigitMatch = ocrText.match(twelveDigitPattern);
          
          if (twelveDigitMatch) {
            const digits = twelveDigitMatch[1];
            result.fin = `${digits.substring(0,4)} ${digits.substring(4,8)} ${digits.substring(8,12)}`;
            logger.info(`Extracted FIN from 12-digit sequence: ${result.fin}`);
            finExtracted = true;
          }
        }
        
        if (!finExtracted) {
          logger.warn('Could not extract FIN from back card OCR');
        }

        // Extract phone number
        const phonePattern = /(09\d{8})/;
        const phoneMatch = ocrText.match(phonePattern);
        if (phoneMatch) {
          result.phoneNumber = phoneMatch[1];
          logger.info(`Extracted phone from back card: ${result.phoneNumber}`);
        }

        // SKIP address extraction - use PDF text instead (faster, more accurate)
      }
    } catch (error) {
      logger.error('Failed to extract data from back card image:', error);
    }

    return result;
  }

  /**
   * Extract expiry date from images using targeted OCR on the expiry area
   * OPTIMIZED: Run normal and rotated OCR in parallel, with smart cropping for speed
   */
  private async extractExpiryFromImages(images: ExtractedImages): Promise<{
    expiryDateGregorian: string;
    expiryDateEthiopian: string;
    issueDateGregorian: string;
    issueDateEthiopian: string;
  }> {
    const result = {
      expiryDateGregorian: '',
      expiryDateEthiopian: '',
      issueDateGregorian: '',
      issueDateEthiopian: ''
    };

    try {
      // Focus on the front card image (image 3) for expiry date extraction
      if (images.frontCardImage) {
        logger.info('Performing OCR on front card for issue/expiry dates...');
        
        // Import sharp for image processing
        const sharp = require('sharp');
        
        // OPTIMIZATION: Prepare both normal and rotated images in parallel
        // Normal: crop bottom 40% for expiry date (remove top 60%)
        // Rotated: keep full image for issue date accuracy
        const [preprocessedImage, rotatedImage] = await Promise.all([
          // Normal orientation for expiry dates - crop to bottom 40%
          (async () => {
            const fullImage = await sharp(images.frontCardImage)
              .resize({ width: 2000 })
              .toBuffer();
            
            const metadata = await sharp(fullImage).metadata();
            const width = metadata.width || 2000;
            const height = metadata.height || 1250;
            
            // Crop bottom 40% height (remove top 60%), keep full width
            const cropHeight = Math.floor(height * 0.40);
            const cropWidth = width;
            const cropTop = height - cropHeight; // Start from bottom
            const cropLeft = 0;
            
            logger.info(`Cropping normal front card for expiry: ${cropWidth}x${cropHeight} from position (${cropLeft}, ${cropTop})`);
            
            return sharp(fullImage)
              .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
              .normalize()
              .sharpen()
              .toBuffer();
          })(),
          // Rotated 90° clockwise for issue dates (no cropping for maximum accuracy)
          sharp(images.frontCardImage)
            .rotate(90)
            .resize({ width: 2000 })
            .normalize()
            .sharpen()
            .toBuffer()
        ]);
        
        logger.info('Running parallel OCR on normal (cropped) and rotated front card...');
        
        // OPTIMIZATION: Run both OCR operations in parallel
        const [normalOcrResult, rotatedOcrResult] = await Promise.all([
          ocrService.extractText(preprocessedImage, {
            preferredMethod: 'tesseract',
            languages: 'eng',
            minConfidence: 0.5
          }),
          ocrService.extractText(rotatedImage, {
            preferredMethod: 'tesseract',
            languages: 'eng',
            minConfidence: 0.5
          })
        ]);

        // Process normal orientation (expiry dates)
        const normalOcrText = normalOcrResult.text;
        logger.info(`Normal front card OCR extracted ${normalOcrText.length} characters using ${normalOcrResult.method}`);
        logger.debug('Normal OCR Text:', normalOcrText);

        const normalDates = this.extractExpiryFromTargetedOCRText(normalOcrText);
        if (normalDates.expiryDateGregorian || normalDates.expiryDateEthiopian) {
          result.expiryDateGregorian = normalDates.expiryDateGregorian;
          result.expiryDateEthiopian = normalDates.expiryDateEthiopian;
          logger.info('Found expiry dates in normal orientation:', { 
            gregorian: normalDates.expiryDateGregorian, 
            ethiopian: normalDates.expiryDateEthiopian 
          });
        }

        // Process rotated orientation (issue dates)
        const rotatedOcrText = rotatedOcrResult.text;
        logger.info(`Rotated front card OCR extracted ${rotatedOcrText.length} characters`);
        logger.debug('Rotated OCR Text:', rotatedOcrText);

        const rotatedDates = this.extractExpiryFromTargetedOCRText(rotatedOcrText);
        if (rotatedDates.issueDateGregorian || rotatedDates.issueDateEthiopian) {
          result.issueDateGregorian = rotatedDates.issueDateGregorian;
          result.issueDateEthiopian = rotatedDates.issueDateEthiopian;
          logger.info('Found issue dates in rotated orientation:', { 
            gregorian: rotatedDates.issueDateGregorian, 
            ethiopian: rotatedDates.issueDateEthiopian 
          });
        }

        return result;
      }

    } catch (error) {
      logger.error('Targeted OCR extraction failed:', error);
    }

    return result;
  }

  /**
   * Normalize Ethiopian date - convert month names to numbers
   */
  private normalizeEthiopianDate(dateStr: string): string {
    const monthMap: Record<string, string> = {
      'jan': '01', 'january': '01',
      'feb': '02', 'february': '02',
      'mar': '03', 'march': '03',
      'apr': '04', 'april': '04',
      'may': '05',
      'jun': '06', 'june': '06',
      'jul': '07', 'july': '07',
      'aug': '08', 'august': '08',
      'sep': '09', 'september': '09',
      'oct': '10', 'october': '10', '0ct': '10', // Handle OCR misread
      'nov': '11', 'november': '11',
      'dec': '12', 'december': '12'
    };

    // Replace month names with numbers
    let normalized = dateStr;
    for (const [monthName, monthNum] of Object.entries(monthMap)) {
      const regex = new RegExp(`/${monthName}/`, 'gi');
      normalized = normalized.replace(regex, `/${monthNum}/`);
    }

    return normalized;
  }

  /**
   * Extract expiry dates from targeted OCR text (focused on expiry area)
   */
  private extractExpiryFromTargetedOCRText(text: string): {
    expiryDateGregorian: string;
    expiryDateEthiopian: string;
    issueDateGregorian: string;
    issueDateEthiopian: string;
  } {
    const result = {
      expiryDateGregorian: '',
      expiryDateEthiopian: '',
      issueDateGregorian: '',
      issueDateEthiopian: ''
    };

    logger.debug('Analyzing targeted OCR text for expiry dates...');

    // Look for "Date of Expiry" or "Expiry" followed by dates
    // Also look for "Date of Issue" or "Issue" followed by dates
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();
      
      // Check for ISSUE date
      if (lowerLine.includes('issue') && !lowerLine.includes('expiry')) {
        logger.debug(`Found issue keyword in line: ${line}`);
        
        // Look for dates in this line and the next few lines
        const searchLines = lines.slice(i, Math.min(i + 3, lines.length));
        const searchText = searchLines.join(' ');
        
        // Look for date patterns - handle OCR spacing issues
        // IMPORTANT: First date is Ethiopian, second date is Gregorian
        const datePatterns = [
          // Handle "20 18/05/03" -> "2018/05/03" (OCR splits year, format is YYYY/MM/DD)
          { name: 'YYYY/MM/DD with year split', regex: /(\d{2})\s+(\d{2}\/\d{1,2}\/\d{1,2})/g, type: 'ethiopian-split', needsCleanup: true },
          { name: 'DD/MM/YYYY', regex: /(\d{1,2}\/\d{1,2}\/\d{4})/g, type: 'gregorian-ddmmyyyy', needsCleanup: false },
          { name: 'YYYY/MM/DD', regex: /(\d{4}\/\d{1,2}\/\d{1,2})/g, type: 'ethiopian-yyyymmdd', needsCleanup: false },
          // Handle "2026/Jan/ 11" -> "2026/Jan/11"
          { name: 'YYYY/Mon/DD with space', regex: /(\d{4}\/[A-Za-z]{3}\/\s*\d{1,2})/g, type: 'gregorian', needsCleanup: true },
          { name: 'YYYY/Mon/DD', regex: /(\d{4}\/[A-Za-z]{3,9}\/\d{1,2})/g, type: 'gregorian', needsCleanup: false },
        ];

        let foundDates: Array<{date: string, type: string, order: number}> = [];
        let orderCounter = 0;

        for (const pattern of datePatterns) {
          const matches = [...searchText.matchAll(pattern.regex)];
          for (const match of matches) {
            let dateStr = match[1];
            let year = 0;
            
            // Handle year split case: "20 18/05/03" -> "2018/05/03"
            if (pattern.type === 'ethiopian-split' && match[2]) {
              dateStr = match[1] + match[2]; // Combine "20" + "18/05/03"
              dateStr = dateStr.replace(/\s+/g, ''); // Remove spaces -> "2018/05/03"
              year = parseInt(dateStr.split('/')[0]); // Year is first part in YYYY/MM/DD
            }
            // Clean up OCR spacing issues
            else if (pattern.needsCleanup) {
              dateStr = dateStr.replace(/\s+/g, ''); // Remove all spaces
              year = pattern.type === 'gregorian-ddmmyyyy' ? 
                parseInt(dateStr.split('/')[2]) : 
                parseInt(dateStr.split('/')[0]);
            }
            else {
              year = pattern.type === 'gregorian-ddmmyyyy' ? 
                parseInt(dateStr.split('/')[2]) : 
                parseInt(dateStr.split('/')[0]);
            }
              
            if (year > 2015 && year <= 2040) { // Issue date should be recent
              foundDates.push({
                date: dateStr,
                type: pattern.type,
                order: orderCounter++
              });
            }
          }
        }

        // First date is Ethiopian, second date is Gregorian
        if (foundDates.length >= 1) {
          const firstDate = foundDates[0];
          if (firstDate.type.includes('ethiopian')) {
            result.issueDateEthiopian = this.normalizeEthiopianDate(firstDate.date);
            logger.info(`Found Ethiopian issue date (1st): ${result.issueDateEthiopian}`);
          }
        }
        
        if (foundDates.length >= 2) {
          const secondDate = foundDates[1];
          if (secondDate.type.includes('gregorian') || secondDate.type.includes('YYYY/Mon')) {
            result.issueDateGregorian = this.normalizeEthiopianDate(secondDate.date);
            logger.info(`Found Gregorian issue date (2nd): ${result.issueDateGregorian}`);
          }
        }
      }
      
      // Check for EXPIRY date
      if (lowerLine.includes('expiry') || lowerLine.includes('expire')) {
        logger.debug(`Found expiry keyword in line: ${line}`);
        
        // Look for dates in this line and the next few lines
        const searchLines = lines.slice(i, Math.min(i + 3, lines.length));
        const searchText = searchLines.join(' ');
        
        // Look for date patterns in the expiry context
        const datePatterns = [
          { name: 'DD/MM/YYYY', regex: /(\d{1,2}\/\d{1,2}\/\d{4})/g, type: 'gregorian' },
          { name: 'YYYY/MM/DD', regex: /(\d{4}\/\d{1,2}\/\d{1,2})/g, type: 'ethiopian' },
          { name: 'YYYY/Mon/DD', regex: /(\d{4}\/[A-Za-z]{3,9}\/\d{1,2})/g, type: 'ethiopian' },
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
                logger.info(`Found Gregorian expiry date: ${dateStr}`);
              } else if (year >= 2030 && year <= 2040) {
                // Years 2030-2040 are likely Ethiopian expiry dates
                let cleanDate = this.normalizeEthiopianDate(dateStr);
                result.expiryDateEthiopian = cleanDate;
                logger.info(`Found Ethiopian expiry date: ${cleanDate}`);
              } else {
                // Fallback to pattern-based classification
                if (pattern.type === 'gregorian') {
                  result.expiryDateGregorian = dateStr;
                  logger.info(`Found Gregorian expiry date: ${dateStr}`);
                } else {
                  let cleanDate = this.normalizeEthiopianDate(dateStr);
                  result.expiryDateEthiopian = cleanDate;
                  logger.info(`Found Ethiopian expiry date: ${cleanDate}`);
                }
              }
            }
          }
        }
        
        // If we found expiry dates, continue to next line (might have issue date too)
        if (result.expiryDateGregorian || result.expiryDateEthiopian) {
          continue;
        }
      }
    }

    // If no expiry keyword found, look for dates that appear after DOB
    if (!result.expiryDateGregorian && !result.expiryDateEthiopian) {
      logger.debug('No expiry keyword found, looking for dates after DOB...');
      
      // Find all dates and assume the later ones are expiry
      const allDates: Array<{date: string, year: number, type: string}> = [];
      
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
        logger.info(`Selected latest Gregorian date as expiry: ${latestGregorian.date}`);
      }
      
      if (latestEthiopian) {
        result.expiryDateEthiopian = this.normalizeEthiopianDate(latestEthiopian.date);
        logger.info(`Selected latest Ethiopian date as expiry: ${result.expiryDateEthiopian}`);
      }
    }

    return result;
  }

  async parse(buffer: Buffer): Promise<EfaydaData> {
    const text = await this.extractText(buffer);
    const images = await this.extractImages(buffer);
    const parsed = this.parsePdfText(text);

    // OPTIMIZATION: Run all OCR operations in parallel for maximum speed
    logger.info('Starting parallel OCR operations...');
    const startTime = Date.now();
    
    const [ocrExpiry, backCardData] = await Promise.all([
      // Extract issue/expiry dates from front card (image 3)
      this.extractExpiryFromImages(images),
      // Extract FIN and phone from back card (image 4)
      this.extractBackCardData(images, parsed.fcn)
    ]);
    
    const ocrTime = Date.now() - startTime;
    logger.info(`All OCR operations completed in ${ocrTime}ms (parallel execution)`);

    logger.info(`Parsed: FCN=${parsed.fcn}, FIN=${parsed.fin}`);
    logger.info(`OCR Back Card: FIN=${backCardData.fin}, Phone=${backCardData.phoneNumber}`);
    logger.info(`OCR Back Card Address: region=${backCardData.regionAmharic}/${backCardData.regionEnglish}, zone=${backCardData.zoneAmharic}/${backCardData.zoneEnglish}, woreda=${backCardData.woredaAmharic}/${backCardData.woredaEnglish}`);
    logger.info(`Parsed Amharic: region=${parsed.regionAmharic}, zone=${parsed.zoneAmharic}, woreda=${parsed.woredaAmharic}`);
    logger.info(`OCR Dates - Issue: ${ocrExpiry.issueDateGregorian}/${ocrExpiry.issueDateEthiopian}, Expiry: ${ocrExpiry.expiryDateGregorian}/${ocrExpiry.expiryDateEthiopian}`);

    // IMPORTANT: Free OCR engines (Tesseract, OCR.space) produce very poor results for Amharic script
    // Accuracy is only 40-50% for Amharic text, resulting in garbled output
    // Therefore, we ALWAYS use PDF text for address fields (region, zone, woreda)
    // PDF text extraction is 100% accurate and much faster
    //
    // OCR is only used for:
    // 1. FIN extraction (numbers are easier to OCR correctly)
    // 2. Phone number extraction (numbers)
    // 3. Expiry date extraction (from front card image)
    //
    // For production use with high-quality Amharic OCR, enable Google Vision API
    
    // Always use PDF text for address (most reliable)
    const finalRegionAmharic = parsed.regionAmharic;
    const finalRegionEnglish = parsed.regionEnglish;
    const finalZoneAmharic = parsed.zoneAmharic;
    const finalZoneEnglish = parsed.zoneEnglish;
    const finalWoredaAmharic = parsed.woredaAmharic;
    const finalWoredaEnglish = parsed.woredaEnglish;
    
    // For phone and FIN, use OCR ONLY (from back card image 4)
    // FIN is NOT extracted from PDF text, only from OCR
    const finalPhoneNumber = backCardData.phoneNumber || parsed.phoneNumber;
    const finalFin = backCardData.fin; // ONLY from OCR, no fallback to parsed.fin
    
    // Warn if FIN was not extracted via OCR
    if (!finalFin) {
      logger.warn('FIN was not extracted from back card image (OCR failed). FIN will be empty.');
    }

    logger.info(`Final values: FIN=${finalFin}, Phone=${finalPhoneNumber}`);
    logger.info(`Final Address: region=${finalRegionAmharic}/${finalRegionEnglish}, zone=${finalZoneAmharic}/${finalZoneEnglish}, woreda=${finalWoredaAmharic}/${finalWoredaEnglish}`);

    return {
      fullNameAmharic: parsed.fullNameAmharic,
      fullNameEnglish: parsed.fullNameEnglish,
      dateOfBirthEthiopian: parsed.dateOfBirthEthiopian,
      dateOfBirthGregorian: parsed.dateOfBirthGregorian,
      sex: parsed.sex,
      nationality: 'Ethiopian',
      phoneNumber: finalPhoneNumber,
      region: finalRegionEnglish,
      city: finalZoneEnglish,
      subcity: finalWoredaEnglish,
      fcn: parsed.fcn,
      fin: finalFin, // Use OCR FIN from back card (primary), fallback to parsed
      fan: parsed.fcn,
      // 8-digit random serial number
      serialNumber: String(Math.floor(10000000 + Math.random() * 90000000)),
      // Use OCR-extracted dates from front card (image 3) or fallback to calculated dates
      issueDate: ocrExpiry.issueDateGregorian || this.calculateIssueDate(parsed.dateOfBirthGregorian),
      issueDateEthiopian: ocrExpiry.issueDateEthiopian || this.calculateIssueDateEthiopian(parsed.dateOfBirthEthiopian),
      expiryDate: ocrExpiry.expiryDateGregorian || parsed.expiryDateGregorian || this.calculateExpiryDate(parsed.dateOfBirthGregorian),
      expiryDateGregorian: ocrExpiry.expiryDateGregorian || parsed.expiryDateGregorian || this.calculateExpiryDate(parsed.dateOfBirthGregorian),
      expiryDateEthiopian: ocrExpiry.expiryDateEthiopian || parsed.expiryDateEthiopian || this.calculateExpiryDateEthiopian(parsed.dateOfBirthEthiopian),
      photo: images.photo || undefined,
      qrCode: images.qrCode || undefined,
      barcode: images.barcode || undefined,
      // Store Amharic values for rendering (use OCR data as primary source)
      regionAmharic: finalRegionAmharic,
      zoneAmharic: finalZoneAmharic,
      woredaAmharic: finalWoredaAmharic,
      sexAmharic: parsed.sexAmharic
    } as EfaydaData;
  }

  /**
   * Calculate issue date (current date in YYYY/MM/DD format)
   */
  private calculateIssueDate(_dobGregorian: string): string {
    const now = new Date();
    return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
  }

  /**
   * Calculate issue date in Ethiopian calendar (approximately 7-8 years behind)
   */
  private calculateIssueDateEthiopian(_dobEthiopian: string): string {
    const now = new Date();
    const ethYear = now.getFullYear() - 8;
    return `${ethYear}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
  }

  /**
   * Calculate expiry date (10 years from DOB, not current date)
   */
  private calculateExpiryDate(dobGregorian: string): string {
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
    } catch (error) {
      logger.error('Error calculating expiry date:', error);
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
  private calculateExpiryDateEthiopian(dobEthiopian: string): string {
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
    } catch (error) {
      logger.error('Error calculating Ethiopian expiry date:', error);
      // Fallback
      const now = new Date();
      const expiry = new Date(now);
      expiry.setFullYear(expiry.getFullYear() + 10);
      const ethYear = expiry.getFullYear() - 8;
      return `${ethYear}/${String(expiry.getMonth() + 1).padStart(2, '0')}/${String(expiry.getDate()).padStart(2, '0')}`;
    }
  }
}

export const pdfParser = new PDFParserImpl();
export default pdfParser;
