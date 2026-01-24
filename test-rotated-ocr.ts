/**
 * Test OCR on rotated front card (where issue dates should be)
 */
import fs from 'fs';
import { ocrService } from './src/services/pdf/ocrService';

async function testRotatedOCR() {
  const buffer = fs.readFileSync('template/efayda_Eset Tsegay Gebremeskel.pdf');
  
  // Extract images
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

  if (images.length >= 3) {
    const frontCardImage = images[2]; // Image 3 = front card
    
    console.log('='.repeat(80));
    console.log('OCR on ROTATED front card (90° clockwise)');
    console.log('='.repeat(80));
    
    const sharp = require('sharp');
    const rotatedImage = await sharp(frontCardImage)
      .rotate(90)
      .resize({ width: 2000 })
      .normalize()
      .sharpen()
      .toBuffer();
    
    // Save for inspection
    fs.writeFileSync('test-output/front-card-rotated.jpg', rotatedImage);
    console.log('Saved rotated image to: test-output/front-card-rotated.jpg');
    
    const ocrResult = await ocrService.extractText(rotatedImage, {
      preferredMethod: 'tesseract',
      languages: 'eng',
      minConfidence: 0.5
    });
    
    console.log(`\nOCR extracted ${ocrResult.text.length} characters`);
    console.log('Confidence:', ocrResult.confidence);
    console.log('\nFull OCR Text:');
    console.log('---');
    console.log(ocrResult.text);
    console.log('---');
    
    // Look for issue date
    console.log('\n' + '='.repeat(80));
    console.log('Searching for Issue Date');
    console.log('='.repeat(80));
    
    if (ocrResult.text.toLowerCase().includes('issue')) {
      console.log('✅ Found "issue" keyword');
      const issueIndex = ocrResult.text.toLowerCase().indexOf('issue');
      const context = ocrResult.text.substring(Math.max(0, issueIndex - 50), Math.min(ocrResult.text.length, issueIndex + 150));
      console.log('\nContext:');
      console.log(context);
    } else {
      console.log('❌ "issue" keyword not found in OCR text');
    }
    
    // Look for all dates
    const dates = ocrResult.text.match(/\d{4}\/\d{1,2}\/\d{1,2}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}\/[A-Za-z]{3,9}\/\d{1,2}/g) || [];
    console.log('\nAll dates found:');
    dates.forEach((date, idx) => {
      console.log(`  ${idx + 1}. ${date}`);
    });
    
    // Look for date patterns with spaces (OCR errors)
    const spacedDates = ocrResult.text.match(/\d{2}\s+\d{2}\/\d{1,2}\/\d{1,2}|\d\s+\d\s+\d{2}\/\d{1,2}\/\d{1,2}/g) || [];
    if (spacedDates.length > 0) {
      console.log('\nDates with spacing issues:');
      spacedDates.forEach((date, idx) => {
        console.log(`  ${idx + 1}. "${date}"`);
      });
    }
  }
}

testRotatedOCR().catch(console.error);
