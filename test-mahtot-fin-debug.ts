/**
 * Debug Mahtot FIN extraction to see what digit groups are found
 */
import fs from 'fs';
import Tesseract from 'tesseract.js';

async function testMahtotFINDebug() {
  console.log('=== Mahtot FIN Debug ===\n');

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
    
    console.log('Running OCR on back card...\n');
    const ocrResult = await Tesseract.recognize(backCardImage, 'eng+amh');
    const ocrText = ocrResult.data.text;

    console.log('=== OCR Text ===');
    console.log(ocrText);
    console.log('=== End OCR Text ===\n');

    // Extract phone
    const phonePattern = /(09\d{8})/;
    const phoneMatch = ocrText.match(phonePattern);
    const phone = phoneMatch ? phoneMatch[1] : '';
    console.log(`Phone found: ${phone}\n`);

    // Find all 4-digit groups
    const digitGroups = ocrText.match(/\d{4}/g) || [];
    console.log(`All 4-digit groups found: ${digitGroups.length}`);
    digitGroups.forEach((group, i) => {
      console.log(`  ${i + 1}. ${group}`);
    });

    // Filter out phone number groups
    if (phone) {
      const phoneDigits = phone.match(/\d{4}/g) || [];
      console.log(`\nPhone digit groups: ${phoneDigits.join(', ')}`);
      
      const nonPhoneGroups = digitGroups.filter(group => !phoneDigits.includes(group));
      console.log(`\nNon-phone 4-digit groups: ${nonPhoneGroups.length}`);
      nonPhoneGroups.forEach((group, i) => {
        console.log(`  ${i + 1}. ${group}`);
      });

      if (nonPhoneGroups.length >= 3) {
        const reconstructedFIN = `${nonPhoneGroups[0]} ${nonPhoneGroups[1]} ${nonPhoneGroups[2]}`;
        console.log(`\n✅ Reconstructed FIN: ${reconstructedFIN}`);
        console.log(`Expected FIN: 9258 7316 0852`);
        console.log(`Match: ${reconstructedFIN === '9258 7316 0852' ? 'YES ✓' : 'NO ✗'}`);
      } else {
        console.log(`\n❌ Not enough non-phone 4-digit groups (need 3, found ${nonPhoneGroups.length})`);
      }
    }

    // Also try finding lines near phone
    console.log('\n=== Lines near phone number ===');
    const lines = ocrText.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(phone)) {
        console.log(`\nPhone found at line ${i}:`);
        const startLine = Math.max(0, i - 2);
        const endLine = Math.min(lines.length, i + 3);
        for (let j = startLine; j < endLine; j++) {
          console.log(`  Line ${j}: "${lines[j]}"`);
        }
        break;
      }
    }
  }
}

testMahtotFINDebug().catch(console.error);
