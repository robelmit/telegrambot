import { readFileSync } from 'fs';
import { join } from 'path';
import { ocrService } from './src/services/pdf/ocrService';

async function debugFINOCR() {
  const pdfPath = join(__dirname, 'template', 'efayda_Abel Tesfaye Gebremedhim.pdf');
  const pdfBuffer = readFileSync(pdfPath);
  
  // Extract image 4 (back card)
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

  const backCardImage = images[3]; // Image 4 (index 3)
  console.log(`Using image 4 (back card): ${backCardImage.length} bytes\n`);

  // Preprocess
  const sharp = require('sharp');
  const preprocessedImage = await sharp(backCardImage)
    .resize({ width: 2000 })
    .normalize()
    .sharpen()
    .toBuffer();

  console.log('Running OCR on back card...\n');
  const ocrResult = await ocrService.extractText(preprocessedImage, {
    preferredMethod: 'tesseract',
    languages: 'eng+amh',
    minConfidence: 0.6
  });

  console.log('=== OCR RESULT ===');
  console.log(`Method: ${ocrResult.method}`);
  console.log(`Confidence: ${ocrResult.confidence.toFixed(2)}`);
  console.log(`Processing time: ${ocrResult.processingTime}ms`);
  console.log(`\n=== FULL OCR TEXT ===\n`);
  console.log(ocrResult.text);
  console.log('\n=== END OCR TEXT ===\n');

  // Extract all digit groups
  const allDigits = ocrResult.text.match(/\d+/g) || [];
  console.log('All digit groups found:');
  allDigits.forEach((d, i) => {
    console.log(`  ${i + 1}. "${d}" (${d.length} digits)`);
  });

  // Look for 4-digit groups
  const fourDigitGroups = allDigits.filter(d => d.length === 4);
  console.log(`\n4-digit groups (${fourDigitGroups.length}):`);
  fourDigitGroups.forEach((d, i) => {
    console.log(`  ${i + 1}. ${d}`);
  });

  // Check if 4726 is present
  if (ocrResult.text.includes('4726')) {
    console.log('\n✅ Found "4726" in OCR text!');
  } else {
    console.log('\n❌ "4726" NOT found in OCR text');
    console.log('Checking for similar patterns...');
    if (ocrResult.text.includes('472')) console.log('  - Found "472"');
    if (ocrResult.text.includes('4726')) console.log('  - Found "4726"');
    if (ocrResult.text.includes('726')) console.log('  - Found "726"');
  }

  // Expected FIN
  console.log('\n=== EXPECTED FIN ===');
  console.log('4726 3910 3548');
}

debugFINOCR().catch(console.error);
