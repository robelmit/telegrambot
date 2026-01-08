/**
 * Test script to iterate on white background removal
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const OUTPUT_DIR = 'test-output';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Extract first image from PDF for testing
async function extractFirstImageFromPdf(pdfPath: string): Promise<Buffer | null> {
  const buffer = fs.readFileSync(pdfPath);
  
  // Find JPEG images
  const jpegStart = Buffer.from([0xFF, 0xD8, 0xFF]);
  const jpegEnd = Buffer.from([0xFF, 0xD9]);
  
  let startIndex = 0;
  const start = buffer.indexOf(jpegStart, startIndex);
  if (start === -1) return null;
  
  const end = buffer.indexOf(jpegEnd, start + 3);
  if (end === -1) return null;
  
  return buffer.slice(start, end + 2);
}

// Method 1: Simple threshold-based white removal with sharp
async function removeWhiteBgMethod1(photoBuffer: Buffer, threshold: number = 245): Promise<Buffer> {
  console.log('Method 1: Sharp raw pixel manipulation...');
  
  const image = sharp(photoBuffer);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  
  console.log(`Image: ${info.width}x${info.height}, channels: ${info.channels}`);
  
  // Create new buffer with alpha channel
  const pixels = new Uint8Array(info.width * info.height * 4);
  
  let transparentCount = 0;
  for (let i = 0; i < info.width * info.height; i++) {
    const srcIdx = i * info.channels;
    const dstIdx = i * 4;
    
    const r = data[srcIdx];
    const g = data[srcIdx + 1];
    const b = data[srcIdx + 2];
    
    pixels[dstIdx] = r;
    pixels[dstIdx + 1] = g;
    pixels[dstIdx + 2] = b;
    
    // Check if pixel is close to pure white
    if (r >= threshold && g >= threshold && b >= threshold) {
      pixels[dstIdx + 3] = 0; // Transparent
      transparentCount++;
    } else {
      pixels[dstIdx + 3] = 255; // Opaque
    }
  }
  
  console.log(`Made ${transparentCount} pixels transparent out of ${info.width * info.height}`);
  
  const result = await sharp(Buffer.from(pixels), {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  }).png().toBuffer();
  
  return result;
}

// Method 2: Using sharp's built-in functions
async function removeWhiteBgMethod2(photoBuffer: Buffer): Promise<Buffer> {
  console.log('Method 2: Sharp flatten with white detection...');
  
  // First, get the image as PNG with alpha
  const pngBuffer = await sharp(photoBuffer)
    .ensureAlpha()
    .png()
    .toBuffer();
  
  // Now manipulate the alpha channel
  const { data, info } = await sharp(pngBuffer)
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  console.log(`PNG Image: ${info.width}x${info.height}, channels: ${info.channels}`);
  
  // Modify alpha for white pixels
  const newData = Buffer.from(data);
  let transparentCount = 0;
  
  for (let i = 0; i < info.width * info.height; i++) {
    const idx = i * 4;
    const r = newData[idx];
    const g = newData[idx + 1];
    const b = newData[idx + 2];
    
    // White threshold
    if (r >= 245 && g >= 245 && b >= 245) {
      newData[idx + 3] = 0; // Make transparent
      transparentCount++;
    }
  }
  
  console.log(`Made ${transparentCount} pixels transparent`);
  
  const result = await sharp(newData, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  }).png().toBuffer();
  
  return result;
}

// Method 3: Edge-based approach - only remove white from edges
async function removeWhiteBgMethod3(photoBuffer: Buffer, threshold: number = 240): Promise<Buffer> {
  console.log('Method 3: Flood fill from corners...');
  
  const { data, info } = await sharp(photoBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const width = info.width;
  const height = info.height;
  const pixels = Buffer.from(data);
  
  // Create visited array
  const visited = new Set<number>();
  const queue: number[] = [];
  
  // Helper to check if pixel is white-ish
  const isWhite = (idx: number) => {
    const r = pixels[idx];
    const g = pixels[idx + 1];
    const b = pixels[idx + 2];
    return r >= threshold && g >= threshold && b >= threshold;
  };
  
  // Helper to get pixel index
  const getIdx = (x: number, y: number) => (y * width + x) * 4;
  
  // Add edge pixels to queue
  for (let x = 0; x < width; x++) {
    queue.push(getIdx(x, 0));
    queue.push(getIdx(x, height - 1));
  }
  for (let y = 0; y < height; y++) {
    queue.push(getIdx(0, y));
    queue.push(getIdx(width - 1, y));
  }
  
  let transparentCount = 0;
  
  // Flood fill from edges
  while (queue.length > 0) {
    const idx = queue.shift()!;
    
    if (visited.has(idx)) continue;
    visited.add(idx);
    
    if (!isWhite(idx)) continue;
    
    // Make transparent
    pixels[idx + 3] = 0;
    transparentCount++;
    
    // Get x, y from index
    const pixelNum = idx / 4;
    const x = pixelNum % width;
    const y = Math.floor(pixelNum / width);
    
    // Add neighbors
    if (x > 0) queue.push(getIdx(x - 1, y));
    if (x < width - 1) queue.push(getIdx(x + 1, y));
    if (y > 0) queue.push(getIdx(x, y - 1));
    if (y < height - 1) queue.push(getIdx(x, y + 1));
  }
  
  console.log(`Made ${transparentCount} pixels transparent (flood fill)`);
  
  const result = await sharp(pixels, {
    raw: {
      width: width,
      height: height,
      channels: 4
    }
  }).png().toBuffer();
  
  return result;
}

async function main() {
  console.log('Testing white background removal methods...\n');
  
  // Extract image from PDF
  const pdfPath = 'fayda.pdf';
  if (!fs.existsSync(pdfPath)) {
    console.error('fayda.pdf not found!');
    return;
  }
  
  const photoBuffer = await extractFirstImageFromPdf(pdfPath);
  if (!photoBuffer) {
    console.error('Could not extract image from PDF');
    return;
  }
  
  console.log(`Extracted photo: ${photoBuffer.length} bytes\n`);
  
  // Save original
  fs.writeFileSync(path.join(OUTPUT_DIR, 'original_photo.jpg'), photoBuffer);
  console.log('Saved: original_photo.jpg\n');
  
  // Test Method 1
  try {
    const result1 = await removeWhiteBgMethod1(photoBuffer, 245);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'method1_threshold245.png'), result1);
    console.log('Saved: method1_threshold245.png\n');
    
    const result1b = await removeWhiteBgMethod1(photoBuffer, 250);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'method1_threshold250.png'), result1b);
    console.log('Saved: method1_threshold250.png\n');
    
    const result1c = await removeWhiteBgMethod1(photoBuffer, 240);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'method1_threshold240.png'), result1c);
    console.log('Saved: method1_threshold240.png\n');
  } catch (e) {
    console.error('Method 1 failed:', e);
  }
  
  // Test Method 2
  try {
    const result2 = await removeWhiteBgMethod2(photoBuffer);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'method2_ensureAlpha.png'), result2);
    console.log('Saved: method2_ensureAlpha.png\n');
  } catch (e) {
    console.error('Method 2 failed:', e);
  }
  
  // Test Method 3
  try {
    const result3 = await removeWhiteBgMethod3(photoBuffer, 240);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'method3_floodfill.png'), result3);
    console.log('Saved: method3_floodfill.png\n');
  } catch (e) {
    console.error('Method 3 failed:', e);
  }
  
  console.log('Done! Check test-output folder for results.');
}

main().catch(console.error);
