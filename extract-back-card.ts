/**
 * Extract and save the back card image from PDF for inspection
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

async function extractBackCard() {
  const pdfPath = join(__dirname, 'template', 'efayda_Abel Tesfaye Gebremedhim.pdf');
  const pdfBuffer = readFileSync(pdfPath);

  // Find JPEG images
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

  console.log(`Found ${images.length} images in PDF`);

  if (images.length >= 4) {
    const backCardImage = images[3]; // 4th image (index 3)
    const outputPath = join(__dirname, 'test-output', 'back-card-image.jpg');
    writeFileSync(outputPath, backCardImage);
    console.log(`✅ Back card image saved to: ${outputPath}`);
    console.log(`   Size: ${(backCardImage.length / 1024).toFixed(2)} KB`);
    
    // Check image dimensions using sharp
    const sharp = require('sharp');
    const metadata = await sharp(backCardImage).metadata();
    console.log(`   Dimensions: ${metadata.width}x${metadata.height}`);
    console.log(`   Format: ${metadata.format}`);
  } else {
    console.log('❌ Back card image not found (need at least 4 images)');
  }
}

extractBackCard().catch(console.error);
