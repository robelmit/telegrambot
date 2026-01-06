/**
 * Debug PDF image extraction - save all images to inspect them
 */
import fs from 'fs';
import path from 'path';

const pdfBuffer = fs.readFileSync('real/fayda.pdf');

// Create debug folder
const debugDir = 'test-output/debug-images';
if (!fs.existsSync(debugDir)) {
  fs.mkdirSync(debugDir, { recursive: true });
}

// Find all JPEG images
const jpegStart = Buffer.from([0xFF, 0xD8, 0xFF]);
const jpegEnd = Buffer.from([0xFF, 0xD9]);

let jpegCount = 0;
let startIndex = 0;

while (startIndex < pdfBuffer.length) {
  const start = pdfBuffer.indexOf(jpegStart, startIndex);
  if (start === -1) break;
  
  const end = pdfBuffer.indexOf(jpegEnd, start + 3);
  if (end === -1) break;
  
  const imageBuffer = pdfBuffer.slice(start, end + 2);
  if (imageBuffer.length > 500) {
    const filename = path.join(debugDir, `jpeg_${jpegCount}_${imageBuffer.length}bytes.jpg`);
    fs.writeFileSync(filename, imageBuffer);
    console.log(`Saved JPEG ${jpegCount}: ${imageBuffer.length} bytes -> ${filename}`);
    jpegCount++;
  }
  startIndex = end + 2;
}

// Find all PNG images
const pngStart = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
const pngEnd = Buffer.from([0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);

let pngCount = 0;
startIndex = 0;

while (startIndex < pdfBuffer.length) {
  const start = pdfBuffer.indexOf(pngStart, startIndex);
  if (start === -1) break;
  
  const end = pdfBuffer.indexOf(pngEnd, start + 8);
  if (end === -1) break;
  
  const imageBuffer = pdfBuffer.slice(start, end + 8);
  if (imageBuffer.length > 500) {
    const filename = path.join(debugDir, `png_${pngCount}_${imageBuffer.length}bytes.png`);
    fs.writeFileSync(filename, imageBuffer);
    console.log(`Saved PNG ${pngCount}: ${imageBuffer.length} bytes -> ${filename}`);
    pngCount++;
  }
  startIndex = end + 8;
}

console.log(`\nTotal: ${jpegCount} JPEGs, ${pngCount} PNGs`);
console.log(`Check ${debugDir} folder to inspect the images`);
