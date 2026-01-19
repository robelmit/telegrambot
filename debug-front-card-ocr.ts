import { readFileSync } from 'fs';
import { join } from 'path';
import { ocrService } from './src/services/pdf/ocrService';

async function debugFrontCardOCR() {
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

  // Crop bottom 40% where dates are
  const sharp = require('sharp');
  const metadata = await sharp(frontCardImage).metadata();
  const cropHeight = Math.floor(metadata.height * 0.4);
  const cropTop = Math.floor(metadata.height * 0.6);
  
  const croppedBuffer = await sharp(frontCardImage)
    .extract({
      left: 0,
      top: cropTop,
      width: metadata.width,
      height: cropHeight
    })
    .toBuffer();

  console.log('Running OCR on front card (bottom 40%)...\n');
  const ocrResult = await ocrService.extractText(croppedBuffer, {
    preferredMethod: 'tesseract',
    languages: 'eng',
    minConfidence: 0.6
  });

  console.log('=== OCR RESULT ===');
  console.log(`\n=== FULL OCR TEXT ===\n`);
  console.log(ocrResult.text);
  console.log('\n=== END OCR TEXT ===\n');

  // Look for issue keyword
  if (ocrResult.text.toLowerCase().includes('issue')) {
    console.log('✅ Found "issue" keyword');
  } else {
    console.log('❌ "issue" keyword NOT found');
  }

  // Look for all dates
  const dates1 = ocrResult.text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/g) || [];
  const dates2 = ocrResult.text.match(/(\d{4}\/\d{1,2}\/\d{1,2})/g) || [];
  
  console.log('\nGregorian dates found:', dates1);
  console.log('Ethiopian dates found:', dates2);
}

debugFrontCardOCR().catch(console.error);
