import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

async function testCropArea() {
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
  const sharp = require('sharp');
  
  // Rotate 90 degrees clockwise
  const rotated = await sharp(frontCardImage)
    .rotate(90)
    .resize({ width: 2000 })
    .toBuffer();
  
  // Get dimensions
  const metadata = await sharp(rotated).metadata();
  const width = metadata.width || 2000;
  const height = metadata.height || 1250;
  
  console.log(`Rotated image dimensions: ${width}x${height}`);
  
  // Crop bottom 25% height, keep full width
  const cropHeight = Math.floor(height * 0.25);
  const cropWidth = width; // Keep full width
  const cropTop = height - cropHeight; // Start from bottom
  const cropLeft = 0; // Start from left
  
  console.log(`Crop dimensions: ${cropWidth}x${cropHeight}`);
  console.log(`Crop position: left=${cropLeft}, top=${cropTop}`);
  
  const cropped = await sharp(rotated)
    .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
    .normalize()
    .sharpen()
    .toBuffer();
  
  // Save both images
  writeFileSync('test-output/rotated-full.jpg', rotated);
  writeFileSync('test-output/rotated-cropped.jpg', cropped);
  
  console.log('\n✅ Saved: test-output/rotated-full.jpg');
  console.log('✅ Saved: test-output/rotated-cropped.jpg');
  console.log('\nPlease check the cropped image and tell me if we need to adjust the crop area!');
}

testCropArea().catch(console.error);
