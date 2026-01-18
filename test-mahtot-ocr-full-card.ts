/**
 * Test OCR on full back card with different language combinations
 */
import fs from 'fs';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';

async function testMahtotOCRFullCard() {
  console.log('=== Testing Full Back Card OCR for Mahtot ===\n');

  const pdfPath = './template/efayda_Mahtot Tsehaye Kurabachew.pdf';
  const pdfBuffer = fs.readFileSync(pdfPath);

  // Extract back card image
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

  if (images.length >= 4) {
    const backCardImage = images[3];
    
    // Preprocess: Upscale + Sharpen + Normalize
    const enhanced = await sharp(backCardImage)
      .resize(1968 * 2, 3150 * 2, { kernel: 'lanczos3' })
      .sharpen({ sigma: 1.5 })
      .normalize()
      .toBuffer();

    fs.writeFileSync('./test-output/mahtot-back-enhanced.jpg', enhanced);
    console.log('Saved enhanced image\n');

    // Test with English only (best for numbers)
    console.log('='.repeat(70));
    console.log('Testing with English OCR');
    console.log('='.repeat(70));
    
    const ocrEng = await Tesseract.recognize(enhanced, 'eng');
    const textEng = ocrEng.data.text;
    
    console.log(`Extracted ${textEng.length} characters\n`);
    
    // Look for phone line
    const linesEng = textEng.split('\n');
    for (let i = 0; i < linesEng.length; i++) {
      const line = linesEng[i];
      if (line.includes('0943671740') || line.toUpperCase().includes('PHONE')) {
        console.log(`Line ${i} (phone area): "${line}"`);
        // Show surrounding lines
        for (let j = Math.max(0, i - 2); j < Math.min(linesEng.length, i + 3); j++) {
          if (j !== i) {
            console.log(`Line ${j}: "${linesEng[j]}"`);
          }
        }
        console.log('');
      }
    }

    // Extract all digit sequences
    const allDigits = textEng.match(/\d+/g) || [];
    console.log(`\nAll digit sequences found (${allDigits.length}):`);
    allDigits.forEach((seq, i) => {
      if (seq.length >= 4) {
        console.log(`  ${i + 1}. "${seq}" (${seq.length} digits)`);
      }
    });

    // Look for 4-digit groups
    const digitGroups = textEng.match(/\d{4}/g) || [];
    console.log(`\n4-digit groups (${digitGroups.length}): ${digitGroups.join(', ')}`);

    // Try to find FIN pattern
    const finPattern = /\d{4}\s+\d{4}\s+\d{4}(?!\s+\d)/;
    const finMatch = textEng.match(finPattern);
    if (finMatch) {
      console.log(`\n✅ Found FIN pattern: ${finMatch[0]}`);
    } else {
      console.log(`\n❌ No complete FIN pattern found`);
      
      // Try to reconstruct from groups
      if (digitGroups.length >= 3) {
        // Filter out phone groups
        const phoneGroups = ['0943', '6717'];
        const nonPhone = digitGroups.filter(g => !phoneGroups.includes(g));
        console.log(`Non-phone groups: ${nonPhone.join(', ')}`);
        
        if (nonPhone.length >= 3) {
          console.log(`Possible FIN: ${nonPhone[0]} ${nonPhone[1]} ${nonPhone[2]}`);
        }
      }
    }

    console.log(`\nExpected FIN: 9258 7316 0852`);

  } else {
    console.log('Not enough images found in PDF');
  }
}

testMahtotOCRFullCard().catch(console.error);
