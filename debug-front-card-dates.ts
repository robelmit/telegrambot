/**
 * Debug front card date extraction
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

async function debugFrontCard() {
  const pdfPath = join(__dirname, 'template', 'efayda_Abel Tesfaye Gebremedhim.pdf');
  const pdfBuffer = readFileSync(pdfPath);

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

  console.log(`Found ${images.length} images`);

  if (images.length >= 3) {
    const frontCardImage = images[2]; // Image 3
    console.log(`Front card image size: ${frontCardImage.length} bytes`);

    // Save the front card image
    writeFileSync('test-output/front-card-debug.jpg', frontCardImage);
    console.log('Saved front card image to test-output/front-card-debug.jpg');

    // Try Sharp extraction
    const sharp = require('sharp');
    const metadata = await sharp(frontCardImage).metadata();
    console.log(`Image dimensions: ${metadata.width}x${metadata.height}`);
    console.log(`Format: ${metadata.format}`);
    console.log(`Channels: ${metadata.channels}`);
    console.log(`Space: ${metadata.space}`);

    // Try extracting right edge
    const rightEdgeWidth = Math.floor(metadata.width * 0.15);
    const rightEdgeLeft = Math.floor(metadata.width - rightEdgeWidth);
    
    console.log(`\nAttempting to extract right edge:`);
    console.log(`  left: ${rightEdgeLeft}`);
    console.log(`  top: 0`);
    console.log(`  width: ${rightEdgeWidth}`);
    console.log(`  height: ${metadata.height}`);

    try {
      const rightEdge = await sharp(frontCardImage)
        .extract({
          left: rightEdgeLeft,
          top: 0,
          width: rightEdgeWidth,
          height: metadata.height
        })
        .toBuffer();
      
      writeFileSync('test-output/right-edge.jpg', rightEdge);
      console.log('✅ Right edge extracted successfully!');
      
      // Now rotate it
      const rotated = await sharp(rightEdge)
        .rotate(-90)
        .toBuffer();
      
      writeFileSync('test-output/right-edge-rotated.jpg', rotated);
      console.log('✅ Right edge rotated successfully!');
      
    } catch (error: any) {
      console.error('❌ Extraction failed:', error.message);
      console.error('Full error:', error);
    }

    // Try extracting bottom portion
    const cropHeight = Math.floor(metadata.height * 0.4);
    const cropTop = Math.floor(metadata.height * 0.6);
    
    console.log(`\nAttempting to extract bottom portion:`);
    console.log(`  left: 0`);
    console.log(`  top: ${cropTop}`);
    console.log(`  width: ${metadata.width}`);
    console.log(`  height: ${cropHeight}`);

    try {
      const bottom = await sharp(frontCardImage)
        .extract({
          left: 0,
          top: cropTop,
          width: metadata.width,
          height: cropHeight
        })
        .toBuffer();
      
      writeFileSync('test-output/bottom-portion.jpg', bottom);
      console.log('✅ Bottom portion extracted successfully!');
      
    } catch (error: any) {
      console.error('❌ Extraction failed:', error.message);
      console.error('Full error:', error);
    }
  }
}

debugFrontCard().catch(console.error);
