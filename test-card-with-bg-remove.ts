/**
 * Test card rendering with background removal
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { createCanvas, loadImage, registerFont } from 'canvas';

const OUTPUT_DIR = 'test-output';
const TEMPLATE_DIR = 'src/assets';

// Register fonts
try {
  registerFont('src/assets/fonts/ebrima.ttf', { family: 'Ebrima' });
  registerFont('src/assets/fonts/ARIAL.TTF', { family: 'Arial' });
  console.log('Fonts registered');
} catch (e) {
  console.log('Font registration skipped');
}

// Extract first image from PDF
async function extractFirstImageFromPdf(pdfPath: string): Promise<Buffer | null> {
  const buffer = fs.readFileSync(pdfPath);
  const jpegStart = Buffer.from([0xFF, 0xD8, 0xFF]);
  const jpegEnd = Buffer.from([0xFF, 0xD9]);
  
  const start = buffer.indexOf(jpegStart, 0);
  if (start === -1) return null;
  
  const end = buffer.indexOf(jpegEnd, start + 3);
  if (end === -1) return null;
  
  return buffer.slice(start, end + 2);
}

// Remove white background using flood fill AND convert to grayscale
async function removeWhiteBackground(photoBuffer: Buffer, threshold: number = 240): Promise<Buffer> {
  const { data, info } = await sharp(photoBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const width = info.width;
  const height = info.height;
  const pixels = Buffer.from(data);
  
  const visited = new Set<number>();
  const queue: number[] = [];
  
  const isWhite = (idx: number) => {
    const r = pixels[idx];
    const g = pixels[idx + 1];
    const b = pixels[idx + 2];
    return r >= threshold && g >= threshold && b >= threshold;
  };
  
  const getIdx = (x: number, y: number) => (y * width + x) * 4;
  
  // Add edge pixels
  for (let x = 0; x < width; x++) {
    queue.push(getIdx(x, 0));
    queue.push(getIdx(x, height - 1));
  }
  for (let y = 0; y < height; y++) {
    queue.push(getIdx(0, y));
    queue.push(getIdx(width - 1, y));
  }
  
  let count = 0;
  while (queue.length > 0) {
    const idx = queue.shift()!;
    if (visited.has(idx)) continue;
    visited.add(idx);
    if (!isWhite(idx)) continue;
    
    pixels[idx + 3] = 0;
    count++;
    
    const pixelNum = idx / 4;
    const x = pixelNum % width;
    const y = Math.floor(pixelNum / width);
    
    if (x > 0) queue.push(getIdx(x - 1, y));
    if (x < width - 1) queue.push(getIdx(x + 1, y));
    if (y > 0) queue.push(getIdx(x, y - 1));
    if (y < height - 1) queue.push(getIdx(x, y + 1));
  }
  
  console.log(`Made ${count} pixels transparent`);
  
  // Convert to grayscale while preserving alpha
  for (let i = 0; i < width * height * 4; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    pixels[i] = gray;
    pixels[i + 1] = gray;
    pixels[i + 2] = gray;
    // Alpha preserved
  }
  
  console.log('Converted to grayscale');
  
  return sharp(pixels, {
    raw: { width, height, channels: 4 }
  }).png().toBuffer();
}

// Convert to grayscale
function convertToGrayscale(ctx: any, x: number, y: number, width: number, height: number) {
  const imageData = ctx.getImageData(x, y, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  ctx.putImageData(imageData, x, y);
}

async function main() {
  console.log('Testing card rendering with background removal...\n');
  
  // Extract photo
  const photoBuffer = await extractFirstImageFromPdf('fayda.pdf');
  if (!photoBuffer) {
    console.error('Could not extract photo');
    return;
  }
  console.log(`Photo extracted: ${photoBuffer.length} bytes`);
  
  // Remove background
  const photoWithTransparentBg = await removeWhiteBackground(photoBuffer);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'photo_transparent.png'), photoWithTransparentBg);
  console.log('Saved: photo_transparent.png');
  
  // Load template
  const template = await loadImage(path.join(TEMPLATE_DIR, 'front_template.png'));
  console.log(`Template: ${template.width}x${template.height}`);
  
  // Create canvas
  const canvas = createCanvas(template.width, template.height);
  const ctx = canvas.getContext('2d');
  
  // Draw template
  ctx.drawImage(template, 0, 0);
  
  // Load transparent photo (already grayscale)
  const photo = await loadImage(photoWithTransparentBg);
  console.log(`Photo with transparency: ${photo.width}x${photo.height}`);
  
  // Draw photo at position (main photo area) - NO grayscale conversion needed
  const mainPhotoX = 67;
  const mainPhotoY = 178;
  const mainPhotoW = 315;
  const mainPhotoH = 400;
  
  ctx.drawImage(photo, mainPhotoX, mainPhotoY, mainPhotoW, mainPhotoH);
  // NO convertToGrayscale - already done in sharp
  
  // Draw small photo - NO grayscale conversion needed
  const smallPhotoX = 828;
  const smallPhotoY = 458;
  const smallPhotoW = 120;
  const smallPhotoH = 128;
  
  ctx.drawImage(photo, smallPhotoX, smallPhotoY, smallPhotoW, smallPhotoH);
  // NO convertToGrayscale - already done in sharp
  
  // Save result
  const outputPath = path.join(OUTPUT_DIR, 'card_with_transparent_photo.png');
  fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
  console.log(`\nSaved: ${outputPath}`);
  
  // Also create version WITHOUT background removal for comparison
  const canvas2 = createCanvas(template.width, template.height);
  const ctx2 = canvas2.getContext('2d');
  ctx2.drawImage(template, 0, 0);
  
  const photoOriginal = await loadImage(photoBuffer);
  ctx2.drawImage(photoOriginal, mainPhotoX, mainPhotoY, mainPhotoW, mainPhotoH);
  convertToGrayscale(ctx2, mainPhotoX, mainPhotoY, mainPhotoW, mainPhotoH);
  ctx2.drawImage(photoOriginal, smallPhotoX, smallPhotoY, smallPhotoW, smallPhotoH);
  convertToGrayscale(ctx2, smallPhotoX, smallPhotoY, smallPhotoW, smallPhotoH);
  
  const outputPath2 = path.join(OUTPUT_DIR, 'card_without_transparent_photo.png');
  fs.writeFileSync(outputPath2, canvas2.toBuffer('image/png'));
  console.log(`Saved: ${outputPath2}`);
  
  console.log('\nDone! Compare the two card images to see the difference.');
}

main().catch(console.error);
