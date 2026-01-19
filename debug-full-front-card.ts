import { readFileSync } from 'fs';
import { join } from 'path';
import { ocrService } from './src/services/pdf/ocrService';

async function debugFullFrontCard() {
  const pdfPath = join(__dirname, 'template', 'efayda_Abel Tesfaye Gebremedhim.pdf');
  const pdfBuffer = readFileSync(pdfPath);
  
  // Extract image 3 (front card)
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

  const frontCardImage = images[2]; // Image 3 (index 2)
  console.log(`Using image 3 (front card): ${frontCardImage.length} bytes\n`);

  const sharp = require('sharp');

  // Test 1: Normal orientation (for expiry date)
  console.log('=== TEST 1: NORMAL ORIENTATION (for expiry date) ===\n');
  const preprocessedImage = await sharp(frontCardImage)
    .resize({ width: 2000 })
    .normalize()
    .sharpen()
    .toBuffer();

  console.log('Running Tesseract OCR on normal orientation...\n');
  const ocrResult = await ocrService.extractText(preprocessedImage, {
    preferredMethod: 'tesseract',
    languages: 'eng',
    minConfidence: 0.5
  });

  console.log('OCR Text (first 500 chars):\n');
  console.log(ocrResult.text.substring(0, 500));
  
  const dates1 = ocrResult.text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/g) || [];
  const dates2 = ocrResult.text.match(/(\d{4}\/\d{1,2}\/\d{1,2})/g) || [];
  const dates3 = ocrResult.text.match(/(\d{4}\/[A-Za-z]{3}\/\d{1,2})/g) || [];
  
  console.log('\nDates found (normal):');
  console.log('Gregorian (DD/MM/YYYY):', dates1);
  console.log('Ethiopian (YYYY/MM/DD):', dates2);
  console.log('Ethiopian (YYYY/Mon/DD):', dates3);

  // Test 2: Rotated 90 degrees clockwise (for issue date)
  console.log('\n\n=== TEST 2: ROTATED 90° CLOCKWISE (for issue date) ===\n');
  const rotatedImage = await sharp(frontCardImage)
    .rotate(90) // Rotate 90 degrees clockwise
    .resize({ width: 2000 })
    .normalize()
    .sharpen()
    .toBuffer();

  console.log('Running Tesseract OCR on rotated image...\n');
  const rotatedOcrResult = await ocrService.extractText(rotatedImage, {
    preferredMethod: 'tesseract',
    languages: 'eng',
    minConfidence: 0.5
  });

  console.log('OCR Text (first 500 chars):\n');
  console.log(rotatedOcrResult.text.substring(0, 500));

  // Look for issue keyword
  const lines = rotatedOcrResult.text.split('\n');
  console.log('\nLines containing "issue" or "Issue":');
  lines.forEach((line, i) => {
    if (line.toLowerCase().includes('issue')) {
      console.log(`  Line ${i}: ${line}`);
    }
  });

  const rotatedDates1 = rotatedOcrResult.text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/g) || [];
  const rotatedDates2 = rotatedOcrResult.text.match(/(\d{4}\/\d{1,2}\/\d{1,2})/g) || [];
  const rotatedDates3 = rotatedOcrResult.text.match(/(\d{4}\/[A-Za-z]{3}\/\d{1,2})/g) || [];
  
  console.log('\nDates found (rotated):');
  console.log('Gregorian (DD/MM/YYYY):', rotatedDates1);
  console.log('Ethiopian (YYYY/MM/DD):', rotatedDates2);
  console.log('Ethiopian (YYYY/Mon/DD):', rotatedDates3);
  
  console.log('\n=== EXPECTED ===');
  console.log('Issue Date: 2018/05/03 or 2026/Jan/11');
  console.log('Expiry Date: 2026/05/01 or 2034/Jan/09');
}

debugFullFrontCard().catch(console.error);
