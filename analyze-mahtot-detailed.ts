/**
 * Detailed analysis of mahtot.pdf to check for any embedded data
 */
import fs from 'fs';
import pdfParse from 'pdf-parse';

async function analyzeMahtotDetailed() {
  console.log('=== Detailed Mahtot PDF Analysis ===\n');

  const pdfPath = './template/mahtot.pdf';
  const pdfBuffer = fs.readFileSync(pdfPath);

  console.log(`File size: ${pdfBuffer.length} bytes`);

  // Parse PDF
  const data = await pdfParse(pdfBuffer);
  console.log(`\nPages: ${data.numpages}`);
  console.log(`Text length: ${data.text.length} characters`);
  
  console.log('\n=== Full PDF Text Content ===');
  console.log(data.text);
  console.log('\n=== End of Text Content ===\n');

  // Check for various image formats
  const imageMarkers = [
    { name: 'JPEG', start: Buffer.from([0xFF, 0xD8, 0xFF]), end: Buffer.from([0xFF, 0xD9]) },
    { name: 'PNG', start: Buffer.from([0x89, 0x50, 0x4E, 0x47]), end: Buffer.from([0x49, 0x45, 0x4E, 0x44]) },
  ];

  for (const marker of imageMarkers) {
    let count = 0;
    let index = 0;
    while (index < pdfBuffer.length) {
      const found = pdfBuffer.indexOf(marker.start, index);
      if (found === -1) break;
      count++;
      console.log(`Found ${marker.name} marker at position ${found}`);
      index = found + marker.start.length;
    }
    console.log(`Total ${marker.name} markers: ${count}\n`);
  }

  // Check PDF info
  console.log('\n=== PDF Info ===');
  console.log(JSON.stringify(data.info, null, 2));
  
  console.log('\n=== PDF Metadata ===');
  console.log(JSON.stringify(data.metadata, null, 2));
}

analyzeMahtotDetailed().catch(console.error);
