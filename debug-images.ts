import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

async function debugImages() {
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

  console.log(`Found ${images.length} images in PDF\n`);

  // Save each image
  images.forEach((img, index) => {
    const filename = `test-output/image_${index + 1}_${img.length}bytes.jpg`;
    writeFileSync(filename, img);
    console.log(`Image ${index + 1} (index ${index}): ${img.length} bytes -> ${filename}`);
  });
  
  console.log('\n✅ All images saved to test-output/');
  console.log('\nImage mapping:');
  console.log('- Image 1 (index 0) = Photo');
  console.log('- Image 2 (index 1) = QR Code');
  console.log('- Image 3 (index 2) = Front card (expiry date)');
  console.log('- Image 4 (index 3) = Back card (FIN: 4726 3910 3548)');
}

debugImages().catch(console.error);
