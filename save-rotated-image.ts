import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

async function saveRotatedImage() {
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
  console.log(`Front card image: ${frontCardImage.length} bytes\n`);

  const sharp = require('sharp');
  
  // Save original front card
  writeFileSync('test-output/front-card-original.jpg', frontCardImage);
  console.log('✅ Saved: test-output/front-card-original.jpg');
  
  // Rotate 90 degrees clockwise and save
  const rotatedImage = await sharp(frontCardImage)
    .rotate(90)
    .resize({ width: 2000 })
    .normalize()
    .sharpen()
    .toBuffer();
  
  writeFileSync('test-output/front-card-rotated-90.jpg', rotatedImage);
  console.log('✅ Saved: test-output/front-card-rotated-90.jpg');
  
  // Also save with grid overlay for reference
  const metadata = await sharp(rotatedImage).metadata();
  console.log(`\nRotated image dimensions: ${metadata.width}x${metadata.height}`);
  console.log('\nYou can now view the rotated image and tell me how to crop it!');
}

saveRotatedImage().catch(console.error);
