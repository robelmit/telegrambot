/**
 * Test to see what OCR is actually reading from the front card
 */
import fs from 'fs';
import { ocrService } from './src/services/pdf/ocrService';

async function testOCR() {
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

  console.log(`Found ${images.length} images`);
  
  if (images.length >= 3) {
    const frontCardImage = images[2]; // Image 3 = front card
    console.log(`\nFront card image size: ${frontCardImage.length} bytes`);
    
    // Save for inspection
    fs.writeFileSync('test-output/front-card-debug.jpg', frontCardImage);
    console.log('Saved to: test-output/front-card-debug.jpg');
    
    // Run OCR on full image
    console.log('\n' + '='.repeat(80));
    console.log('OCR on FULL front card image');
    console.log('='.repeat(80));
    
    const sharp = require('sharp');
    const fullImage = await sharp(frontCardImage)
      .resize({ width: 2000 })
      .normalize()
      .sharpen()
      .toBuffer();
    
    const ocrResult = await ocrService.extractText(fullImage, {
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
  }
}

testOCR().catch(console.error);
