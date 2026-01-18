/**
 * PDF Parser - EXACTLY like test-pdf-full.ts from commit a8d0b98
 */
import pdfParse from 'pdf-parse';
import Tesseract from 'tesseract.js';
import { EfaydaData } from '../../types';
import { PDFParser, ExtractedImages } from './types';
import { logger } from '../../utils/logger';

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
          
          // Woreda pattern: Amharic line (may include / and special chars), English line, then FCN
          // Handle patterns like: ቐ/ወያነ ክ/ከተማ or ወያነ ክ/ከተማ
          const woredaPattern = /\s*([\u1200-\u137F\/\s]+?)\s*\n\s*([A-Za-z\s']+?)\s*\n\s*(?:FCN:|FIN:|\d{4}\s+\d{4})/;
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

    // Extract FIN (12 digits with spaces) - look for different pattern
    // FIN format is typically XXXX XXXX XXXX (12 digits)
    const finPattern = /(\d{4}\s+\d{4}\s+\d{4})(?!\s+\d)/;
    const finMatch = text.match(finPattern);
    if (finMatch) {
      data.fin = finMatch[1];
    } else {
      // If no separate FIN found, generate from FCN (LAST 12 digits, not first!)
      const fcnDigits = data.fcn.replace(/\s/g, '');
      if (fcnDigits.length >= 12) {
        // FIN is the LAST 12 digits of FCN
        const finDigits = fcnDigits.substring(fcnDigits.length - 12);
        data.fin = `${finDigits.substring(0,4)} ${finDigits.substring(4,8)} ${finDigits.substring(8,12)}`;
      }
    }

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
      } else if (text.includes('አዲስ አበባ')) {
        data.regionAmharic = 'አዲስ አበባ';
        data.regionEnglish = 'Addis Ababa';
      }
    }

    return data;
  }

  /**
   * Validate if extracted FIN looks correct
   * Returns true if FIN appears valid, false if suspicious
   */
  private validateFIN(fin: string, fcn: string): boolean {
    if (!fin || fin.length < 12) {
      return false;
    }

    // Remove spaces for comparison
    const finDigits = fin.replace(/\s/g, '');
    const fcnDigits = fcn.replace(/\s/g, '');

    // Check 1: FIN should be exactly 12 digits
    if (finDigits.length !== 12 || !/^\d{12}$/.test(finDigits)) {
      logger.warn('FIN validation failed: Not 12 digits');
      return false;
    }

    // Check 2: FIN should NOT be the last 12 digits of FCN (that's a fallback, not real FIN)
    if (fcnDigits.length >= 12) {
      const fcnLast12 = fcnDigits.substring(fcnDigits.length - 12);
      if (finDigits === fcnLast12) {
        logger.warn('FIN validation failed: FIN is last 12 digits of FCN (likely fallback)');
        return false;
      }
    }

    // Check 3: FIN should have reasonable digit distribution (not all same digit)
    const uniqueDigits = new Set(finDigits.split('')).size;
    if (uniqueDigits < 3) {
      logger.warn('FIN validation failed: Too few unique digits');
      return false;
    }

    logger.info('FIN validation passed');
    return true;
  }

  /**
   * Extract address and FIN from back card image using OCR
   * Uses hybrid approach: Try Tesseract first (fast), then scribe.js-ocr if needed (accurate)
   */
  private async extractBackCardData(images: ExtractedImages, fcn: string = ''): Promise<{
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
        // STRATEGY: Try Tesseract first (fast ~3s), validate, then retry with scribe.js-ocr if needed
        
        // Step 1: Try Tesseract (fast)
        logger.info('Extracting data from back card image using Tesseract (fast)...');
        const startTime = Date.now();
        
        const tesseractResult = await Tesseract.recognize(images.backCardImage, 'eng+amh', {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              logger.debug(`Back card OCR progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        });

        let ocrText = tesseractResult.data.text;
        const tesseractTime = Date.now() - startTime;
        logger.info(`Tesseract OCR completed in ${tesseractTime}ms, extracted ${ocrText.length} characters`);
        logger.debug('Tesseract OCR text:', ocrText);

        // Extract FIN (12 digits: XXXX XXXX XXXX)
        const finPattern = /(\d{4}\s+\d{4}\s+\d{4})(?!\s+\d)/;
        const finMatch = ocrText.match(finPattern);
        
        if (finMatch) {
          result.fin = finMatch[1];
          logger.info(`Extracted FIN from back card (Tesseract): ${result.fin}`);
        } else {
          logger.warn('FIN not found in Tesseract OCR text');
          // Try to find any 12-digit sequence
          const allDigits = ocrText.match(/\d+/g);
          if (allDigits) {
            logger.debug('All digit groups found:', allDigits);
            // Look for groups that could form a FIN
            for (let i = 0; i < allDigits.length - 2; i++) {
              if (allDigits[i].length === 4 && allDigits[i+1].length === 4 && allDigits[i+2].length === 4) {
                result.fin = `${allDigits[i]} ${allDigits[i+1]} ${allDigits[i+2]}`;
                logger.info(`Reconstructed FIN from digit groups: ${result.fin}`);
                break;
              }
            }
          }
        }

        // Extract phone number
        const phonePattern = /(09\d{8})/;
        const phoneMatch = ocrText.match(phonePattern);
        if (phoneMatch) {
          result.phoneNumber = phoneMatch[1];
          logger.info(`Extracted phone from back card: ${result.phoneNumber}`);
        }

        // Step 2: Validate FIN quality
        const finIsValid = result.fin && this.validateFIN(result.fin, fcn);
        
        // Step 3: If FIN not found OR looks suspicious, retry with scribe.js-ocr (slower but more accurate)
        if (!finIsValid) {
          if (!result.fin) {
            logger.warn('FIN not found with Tesseract, retrying with scribe.js-ocr for better accuracy...');
          } else {
            logger.warn('FIN validation failed, retrying with scribe.js-ocr for better accuracy...');
          }
          
          // Import scribe.js-ocr dynamically
          const scribe = await import('scribe.js-ocr');
          
          // Save image temporarily for scribe.js-ocr
          const fs = await import('fs');
          const path = await import('path');
          const os = await import('os');
          
          const tempDir = os.tmpdir();
          const tempImagePath = path.join(tempDir, `back-card-${Date.now()}.jpg`);
          fs.writeFileSync(tempImagePath, images.backCardImage);
          
          try {
            const scribeStartTime = Date.now();
            // Use scribe.js-ocr for better accuracy
            ocrText = await scribe.default.extractText([tempImagePath]);
            const scribeTime = Date.now() - scribeStartTime;
            
            logger.info(`scribe.js-ocr completed in ${scribeTime}ms, extracted ${ocrText.length} characters`);
            logger.debug('scribe.js-ocr text:', ocrText);
            
            // Clean up temp file
            fs.unlinkSync(tempImagePath);
            
            // Re-extract FIN with better OCR
            const finMatch2 = ocrText.match(finPattern);
            if (finMatch2) {
              result.fin = finMatch2[1];
              logger.info(`Extracted FIN from back card (scribe.js-ocr): ${result.fin}`);
            } else {
              // Try reconstruction again
              const allDigits2 = ocrText.match(/\d+/g);
              if (allDigits2) {
                for (let i = 0; i < allDigits2.length - 2; i++) {
                  if (allDigits2[i].length === 4 && allDigits2[i+1].length === 4 && allDigits2[i+2].length === 4) {
                    result.fin = `${allDigits2[i]} ${allDigits2[i+1]} ${allDigits2[i+2]}`;
                    logger.info(`Reconstructed FIN from scribe.js-ocr digit groups: ${result.fin}`);
                    break;
                  }
                }
              }
            }
            
            // Re-extract phone if not found
            if (!result.phoneNumber) {
              const phoneMatch2 = ocrText.match(phonePattern);
              if (phoneMatch2) {
                result.phoneNumber = phoneMatch2[1];
                logger.info(`Extracted phone from back card (scribe.js-ocr): ${result.phoneNumber}`);
              }
            }
          } catch (ocrError) {
            // Clean up temp file on error
            if (fs.existsSync(tempImagePath)) {
              fs.unlinkSync(tempImagePath);
            }
            logger.error('scribe.js-ocr failed:', ocrError);
            // Continue with Tesseract results
          }
        } else if (finIsValid) {
          logger.info('✅ FIN validation passed, using Tesseract result (fast path)');
        }

        // Extract address fields from OCR text
        // The back card has structured format:
        // Phone Number | FIN
        // Nationality
        // Region (Amharic)
        // Region (English)
        // Zone (Amharic)
        // Zone (English)
        // Woreda (Amharic)
        // Woreda (English)

        // Find phone number position and extract address after it
        const phoneIndex = ocrText.indexOf(result.phoneNumber || '09');
        if (phoneIndex !== -1) {
          const afterPhone = ocrText.substring(phoneIndex);
          
          // Extract region (first Amharic line after nationality, then English)
          const regionPattern = /(?:Ethiopian|ኢትዮጵያዊ)[^\n]*\n\s*([\u1200-\u137F]+)\s*\n\s*([A-Za-z\s]+?)\s*\n/;
          const regionMatch = afterPhone.match(regionPattern);
          
          if (regionMatch) {
            result.regionAmharic = regionMatch[1].trim();
            result.regionEnglish = regionMatch[2].trim();
            logger.info(`Extracted region from back card: ${result.regionAmharic} / ${result.regionEnglish}`);
            
            // Extract zone after region
            const afterRegion = afterPhone.substring(regionMatch.index! + regionMatch[0].length);
            const zonePattern = /\s*([\u1200-\u137F\s]+?)\s*\n\s*([A-Za-z\s]+?)\s*\n/;
            const zoneMatch = afterRegion.match(zonePattern);
            
            if (zoneMatch) {
              result.zoneAmharic = zoneMatch[1].trim();
              result.zoneEnglish = zoneMatch[2].trim();
              logger.info(`Extracted zone from back card: ${result.zoneAmharic} / ${result.zoneEnglish}`);
              
              // Extract woreda after zone
              const afterZone = afterRegion.substring(zoneMatch.index! + zoneMatch[0].length);
              const woredaPattern = /\s*([\u1200-\u137F\/\s]+?)\s*\n\s*([A-Za-z\s']+?)\s*\n/;
              const woredaMatch = afterZone.match(woredaPattern);
              
              if (woredaMatch) {
                result.woredaAmharic = woredaMatch[1].trim();
                result.woredaEnglish = woredaMatch[2].trim();
                logger.info(`Extracted woreda from back card: ${result.woredaAmharic} / ${result.woredaEnglish}`);
              }
            }
          }
        }
      }
    } catch (error) {
      logger.error('Failed to extract data from back card image:', error);
    }

    return result;
  }

  /**
   * Extract expiry date from images using targeted OCR on the expiry area
   */
  private async extractExpiryFromImages(images: ExtractedImages): Promise<{
    expiryDateGregorian: string;
    expiryDateEthiopian: string;
  }> {
    const result = {
      expiryDateGregorian: '',
      expiryDateEthiopian: ''
    };

    try {
      // Focus on the front card image (image 3) for expiry date extraction
      if (images.frontCardImage) {
        logger.info('Performing targeted OCR on expiry area (below sex field)...');
        
        // Import sharp for image processing
        const sharp = require('sharp');
        
        // Get image dimensions
        const metadata = await sharp(images.frontCardImage).metadata();
        logger.info(`Front card image dimensions: ${metadata.width}x${metadata.height}`);
        
        // Crop the bottom portion where expiry date is located (below sex field)
        const cropHeight = Math.floor(metadata.height * 0.4); // Bottom 40% of image
        const cropTop = Math.floor(metadata.height * 0.6);    // Start from 60% down
        
        const croppedBuffer = await sharp(images.frontCardImage)
          .extract({
            left: 0,
            top: cropTop,
            width: metadata.width,
            height: cropHeight
          })
          .toBuffer();
        
        logger.info(`Cropped expiry area: top=${cropTop}, height=${cropHeight}`);
        
        // Run OCR on the cropped area
        const ocrResult = await Tesseract.recognize(croppedBuffer, 'eng', {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              logger.debug(`Expiry OCR progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        });

        const ocrText = ocrResult.data.text;
        logger.info(`Expiry area OCR extracted ${ocrText.length} characters`);
        logger.debug('Expiry OCR Text:', ocrText);

        // Look for expiry dates in OCR text
        const expiryDates = this.extractExpiryFromTargetedOCRText(ocrText);
        if (expiryDates.expiryDateGregorian || expiryDates.expiryDateEthiopian) {
          result.expiryDateGregorian = expiryDates.expiryDateGregorian;
          result.expiryDateEthiopian = expiryDates.expiryDateEthiopian;
          logger.info('Found expiry dates in targeted OCR:', expiryDates);
          return result;
        }
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
  } {
    const result = {
      expiryDateGregorian: '',
      expiryDateEthiopian: ''
    };

    logger.debug('Analyzing targeted OCR text for expiry dates...');

    // Look for "Date of Expiry" or "Expiry" followed by dates
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();
      
      // Check if this line or the next line contains expiry information
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
        
        // If we found expiry dates, break
        if (result.expiryDateGregorian || result.expiryDateEthiopian) {
          break;
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

    // Use OCR to extract expiry dates from images
    const ocrExpiry = await this.extractExpiryFromImages(images);

    // Use OCR to extract FIN and address from back card image (PRIMARY SOURCE)
    const backCardData = await this.extractBackCardData(images, parsed.fcn);

    logger.info(`Parsed: FCN=${parsed.fcn}, FIN=${parsed.fin}`);
    logger.info(`OCR Back Card: FIN=${backCardData.fin}, Phone=${backCardData.phoneNumber}`);
    logger.info(`OCR Back Card Address: region=${backCardData.regionAmharic}/${backCardData.regionEnglish}, zone=${backCardData.zoneAmharic}/${backCardData.zoneEnglish}, woreda=${backCardData.woredaAmharic}/${backCardData.woredaEnglish}`);
    logger.info(`Parsed Amharic: region=${parsed.regionAmharic}, zone=${parsed.zoneAmharic}, woreda=${parsed.woredaAmharic}`);
    logger.info(`OCR Expiry: Gregorian=${ocrExpiry.expiryDateGregorian}, Ethiopian=${ocrExpiry.expiryDateEthiopian}`);

    // Priority: Use OCR data from back card, fallback to text parsing
    const finalRegionAmharic = backCardData.regionAmharic || parsed.regionAmharic;
    const finalRegionEnglish = backCardData.regionEnglish || parsed.regionEnglish;
    const finalZoneAmharic = backCardData.zoneAmharic || parsed.zoneAmharic;
    const finalZoneEnglish = backCardData.zoneEnglish || parsed.zoneEnglish;
    const finalWoredaAmharic = backCardData.woredaAmharic || parsed.woredaAmharic;
    const finalWoredaEnglish = backCardData.woredaEnglish || parsed.woredaEnglish;
    const finalPhoneNumber = backCardData.phoneNumber || parsed.phoneNumber;
    const finalFin = backCardData.fin || parsed.fin;

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
      // Use OCR-extracted expiry dates or fallback to calculated dates
      issueDate: this.calculateIssueDate(parsed.dateOfBirthGregorian),
      issueDateEthiopian: this.calculateIssueDateEthiopian(parsed.dateOfBirthEthiopian),
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
