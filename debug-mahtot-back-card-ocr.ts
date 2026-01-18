/**
 * Debug Mahtot back card OCR to see why FIN extraction failed
 */
import fs from 'fs';
import pdfParse from 'pdf-parse';
import Tesseract from 'tesseract.js';

async function debugMahtotBackCardOCR() {
  console.log('=== Debugging Mahtot Back Card OCR ===\n');

  const pdfPath = './template/efayda_Mahtot Tsehaye Kurabachew.pdf';
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

  console.log(`Found ${images.length} images in PDF\n`);

  if (images.length >= 4) {
    const backCardImage = images[3]; // Image 4
    console.log(`Back card image size: ${backCardImage.length} bytes\n`);

    // Save back card image for inspection
    fs.writeFileSync('./test-output/mahtot-back-card-debug.jpg', backCardImage);
    console.log('Saved back card image to: test-output/mahtot-back-card-debug.jpg\n');

    console.log('Running OCR on back card...\n');
    const ocrResult = await Tesseract.recognize(backCardImage, 'eng+amh');

    const ocrText = ocrResult.data.text;
    console.log('=== FULL OCR TEXT ===');
    console.log(ocrText);
    console.log('=== END OCR TEXT ===\n');

    console.log(`Total characters extracted: ${ocrText.length}\n`);

    // Look for FIN patterns
    console.log('=== Searching for FIN patterns ===\n');

    // Pattern 1: XXXX XXXX XXXX (with spaces)
    const finPattern1 = /\d{4}\s+\d{4}\s+\d{4}(?!\s+\d)/g;
    const matches1 = [...ocrText.matchAll(finPattern1)];
    console.log(`Pattern 1 (XXXX XXXX XXXX): Found ${matches1.length} matches`);
    matches1.forEach((match, i) => {
      console.log(`  Match ${i + 1}: "${match[0]}"`);
    });

    // Pattern 2: XXXXXXXXXXXX (no spaces)
    const finPattern2 = /\d{12}(?!\d)/g;
    const matches2 = [...ocrText.matchAll(finPattern2)];
    console.log(`\nPattern 2 (XXXXXXXXXXXX): Found ${matches2.length} matches`);
    matches2.forEach((match, i) => {
      console.log(`  Match ${i + 1}: "${match[0]}"`);
    });

    // Pattern 3: Any 12-digit sequence
    const finPattern3 = /\d{4}[\s-]?\d{4}[\s-]?\d{4}/g;
    const matches3 = [...ocrText.matchAll(finPattern3)];
    console.log(`\nPattern 3 (flexible): Found ${matches3.length} matches`);
    matches3.forEach((match, i) => {
      console.log(`  Match ${i + 1}: "${match[0]}"`);
    });

    // Look for "FIN" keyword
    console.log('\n=== Searching for "FIN" keyword ===\n');
    const lines = ocrText.split('\n');
    lines.forEach((line, i) => {
      if (line.toUpperCase().includes('FIN')) {
        console.log(`Line ${i}: "${line}"`);
        // Show next 3 lines
        for (let j = 1; j <= 3 && i + j < lines.length; j++) {
          console.log(`Line ${i + j}: "${lines[i + j]}"`);
        }
        console.log('');
      }
    });

    // Look for phone number
    console.log('=== Searching for phone number ===\n');
    const phonePattern = /(09\d{8})/g;
    const phoneMatches = [...ocrText.matchAll(phonePattern)];
    console.log(`Found ${phoneMatches.length} phone numbers:`);
    phoneMatches.forEach((match, i) => {
      console.log(`  Phone ${i + 1}: "${match[0]}"`);
    });
  } else {
    console.log('Not enough images found in PDF');
  }
}

debugMahtotBackCardOCR().catch(console.error);
