/**
 * Debug FIN extraction on failing PDFs
 * Extract back card image and analyze OCR output
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { ocrService } from './src/services/pdf/ocrService';

async function debugFailingPDF(pdfFilename: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Debugging: ${pdfFilename}`);
  console.log('='.repeat(80));

  const pdfPath = path.join(__dirname, 'template', pdfFilename);
  const pdfBuffer = fs.readFileSync(pdfPath);

  // Extract images
  const jpegStart = Buffer.from([0xFF, 0xD8, 0xFF]);
  const jpegEnd = Buffer.from([0xFF, 0xD9]);

  const images: Buffer[] = [];
  let startIndex = 0;

  while (startIndex < pdfBuffer.length) {
    const start = pdfBuffer.indexOf(jpegStart, startIndex);
    if (start === -1) break;

    const end = pdfBuffer.indexOf(jpegEnd, start + 3);
    if (end === -1) break;

    const imageBuffer = pdfBuffer.slice(start, end + 2);
    if (imageBuffer.length > 500) {
      images.push(imageBuffer);
    }
    startIndex = end + 2;
  }

  console.log(`\nFound ${images.length} images in PDF`);

  if (images.length >= 4) {
    const backCardImage = images[3]; // Image 4 = back card
    console.log(`Back card image size: ${backCardImage.length} bytes`);

    // Save original back card
    const outputDir = path.join(__dirname, 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const baseName = pdfFilename.replace('.pdf', '');
    fs.writeFileSync(path.join(outputDir, `${baseName}_back_original.jpg`), backCardImage);
    console.log(`Saved: ${baseName}_back_original.jpg`);

    // Preprocess image (same as parser)
    const preprocessedImage = await sharp(backCardImage)
      .resize({ width: 2000 })
      .normalize()
      .sharpen()
      .toBuffer();

    fs.writeFileSync(path.join(outputDir, `${baseName}_back_preprocessed.jpg`), preprocessedImage);
    console.log(`Saved: ${baseName}_back_preprocessed.jpg`);

    // Run OCR
    console.log('\nRunning OCR on back card...');
    const ocrResult = await ocrService.extractText(preprocessedImage, {
      preferredMethod: 'tesseract',
      languages: 'eng+amh',
      minConfidence: 0.6
    });

    console.log(`\nOCR Method: ${ocrResult.method}`);
    console.log(`OCR Confidence: ${ocrResult.confidence.toFixed(2)}`);
    console.log(`OCR Text Length: ${ocrResult.text.length} characters`);
    console.log('\n' + '='.repeat(80));
    console.log('FULL OCR TEXT:');
    console.log('='.repeat(80));
    console.log(ocrResult.text);
    console.log('='.repeat(80));

    // Analyze for FIN patterns
    console.log('\n📊 FIN Pattern Analysis:');
    
    // Check for FIN/EIN keyword
    const hasFinKeyword = ocrResult.text.toLowerCase().includes('fin') || 
                          ocrResult.text.includes('FIN') || 
                          ocrResult.text.toLowerCase().includes('ein') || 
                          ocrResult.text.includes('EIN');
    console.log(`   FIN/EIN keyword found: ${hasFinKeyword ? '✅ YES' : '❌ NO'}`);

    // Find all digit groups
    const allDigits = ocrResult.text.match(/\d+/g);
    console.log(`\n   All digit groups found (${allDigits?.length || 0}):`);
    if (allDigits) {
      allDigits.forEach((digits, index) => {
        console.log(`      ${index + 1}. "${digits}" (${digits.length} digits)`);
      });
    }

    // Look for 12-digit patterns
    const twelveDigitPattern = /\b(\d{12})\b/;
    const twelveDigitMatch = ocrResult.text.match(twelveDigitPattern);
    console.log(`\n   12-digit sequence found: ${twelveDigitMatch ? '✅ YES: ' + twelveDigitMatch[1] : '❌ NO'}`);

    // Look for 4+4+4 pattern
    const spacedPattern = /(\d{4})\s+(\d{4})\s+(\d{4})/;
    const spacedMatch = ocrResult.text.match(spacedPattern);
    console.log(`   4+4+4 spaced pattern found: ${spacedMatch ? '✅ YES: ' + spacedMatch[0] : '❌ NO'}`);

    // Look for 4+4+4-5 pattern (OCR error)
    if (allDigits && allDigits.length >= 3) {
      console.log(`\n   Checking for 4+4+4-5 pattern in digit groups:`);
      for (let i = 0; i < allDigits.length - 2; i++) {
        if (allDigits[i].length === 4 && allDigits[i+1].length === 4 && 
            (allDigits[i+2].length === 4 || allDigits[i+2].length === 5)) {
          console.log(`      ✅ Found at position ${i}: ${allDigits[i]} ${allDigits[i+1]} ${allDigits[i+2]}`);
        }
      }
    }

    // Check lines around FIN keyword
    if (hasFinKeyword) {
      const lines = ocrResult.text.split('\n');
      console.log(`\n   Lines containing FIN/EIN:`);
      lines.forEach((line, index) => {
        if (line.toLowerCase().includes('fin') || line.toLowerCase().includes('ein')) {
          console.log(`      Line ${index + 1}: "${line}"`);
          if (index + 1 < lines.length) {
            console.log(`      Next line: "${lines[index + 1]}"`);
          }
        }
      });
    }
  }
}

async function main() {
  const failingPDFs = [
    'efayda_Awet Tikabo Gebrehiwet.pdf',
    'efayda_Mahtot Tsehaye Kurabachew.pdf'
  ];

  for (const pdf of failingPDFs) {
    await debugFailingPDF(pdf);
  }
}

main().catch(console.error);
