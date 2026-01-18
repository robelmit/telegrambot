/**
 * Extract and OCR just the phone/FIN line from Mahtot back card
 */
import fs from 'fs';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';

async function testMahtotOCRPhoneLine() {
  console.log('=== Extracting Phone/FIN Line from Mahtot ===\n');

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
    const metadata = await sharp(backCardImage).metadata();
    
    // Crop to phone/FIN line area (approximately 25-30% from top)
    const cropTop = Math.floor(metadata.height! * 0.25);
    const cropHeight = Math.floor(metadata.height! * 0.08); // Just the phone line
    
    const phoneLine = await sharp(backCardImage)
      .extract({
        left: 0,
        top: cropTop,
        width: metadata.width!,
        height: cropHeight
      })
      .resize(metadata.width! * 3, cropHeight * 3, { kernel: 'lanczos3' }) // 3x upscale
      .sharpen({ sigma: 2 })
      .normalize()
      .toBuffer();

    fs.writeFileSync('./test-output/mahtot-phone-line.jpg', phoneLine);
    console.log('Saved phone line image\n');

    // Try multiple OCR configurations
    const configs = [
      { name: 'English', lang: 'eng' },
      { name: 'English (digits mode)', lang: 'eng', config: { tessedit_char_whitelist: '0123456789 |' } }
    ];

    for (const cfg of configs) {
      console.log('='.repeat(70));
      console.log(`Testing: ${cfg.name}`);
      console.log('='.repeat(70));

      const ocrResult = await Tesseract.recognize(phoneLine, cfg.lang, cfg.config || {});
      const text = ocrResult.data.text;

      console.log(`OCR Text: "${text.trim()}"`);
      console.log(`Length: ${text.length} characters\n`);

      // Extract all numbers
      const numbers = text.match(/\d+/g) || [];
      console.log(`Numbers found: ${numbers.join(', ')}\n`);

      // Look for 4-digit groups
      const groups = text.match(/\d{4}/g) || [];
      console.log(`4-digit groups: ${groups.join(', ')}\n`);

      // Try to identify FIN (should be 3 groups of 4 digits, not the phone)
      if (groups.length >= 3) {
        // Phone is 10 digits, FIN is 12 digits (3x4)
        // Filter out phone groups
        const phoneGroups = ['0943', '6717'];
        const nonPhone = groups.filter(g => !phoneGroups.includes(g));
        
        if (nonPhone.length >= 3) {
          const possibleFIN = `${nonPhone[0]} ${nonPhone[1]} ${nonPhone[2]}`;
          console.log(`Possible FIN: ${possibleFIN}`);
          console.log(`Expected FIN: 9258 7316 0852`);
          console.log(`Match: ${possibleFIN === '9258 7316 0852' ? '✅ YES!' : '❌ No'}\n`);
        }
      }
    }

  } else {
    console.log('Not enough images found in PDF');
  }
}

testMahtotOCRPhoneLine().catch(console.error);
