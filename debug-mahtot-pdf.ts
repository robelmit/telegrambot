/**
 * Debug script to check Mahtot PDF structure
 */
import fs from 'fs';
import pdfParse from 'pdf-parse';

async function debugMahtotPDF() {
  console.log('=== Debugging Mahtot PDF ===\n');

  const pdfPath = './template/mahtot.pdf';
  const pdfBuffer = fs.readFileSync(pdfPath);

  console.log(`File size: ${pdfBuffer.length} bytes`);

  // Parse PDF
  const data = await pdfParse(pdfBuffer);
  console.log(`\nPages: ${data.numpages}`);
  console.log(`Text length: ${data.text.length} characters`);
  console.log('\nFirst 500 characters of text:');
  console.log(data.text.substring(0, 500));

  // Look for JPEG markers
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
    console.log(`\nFound image at position ${start}, size: ${imageBuffer.length} bytes`);
    
    if (imageBuffer.length > 500) {
      images.push(imageBuffer);
      console.log(`  -> Added to images array (index ${images.length - 1})`);
    } else {
      console.log(`  -> Skipped (too small)`);
    }
    
    startIndex = end + 2;
  }

  console.log(`\n\nTotal images found: ${images.length}`);
  
  // Check for PNG markers too
  const pngStart = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
  let pngIndex = 0;
  let pngCount = 0;
  
  while (pngIndex < pdfBuffer.length) {
    const start = pdfBuffer.indexOf(pngStart, pngIndex);
    if (start === -1) break;
    pngCount++;
    console.log(`Found PNG marker at position ${start}`);
    pngIndex = start + 4;
  }
  
  console.log(`\nTotal PNG markers found: ${pngCount}`);
}

debugMahtotPDF().catch(console.error);
