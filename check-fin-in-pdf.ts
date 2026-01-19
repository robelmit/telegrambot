import { readFileSync } from 'fs';
import { join } from 'path';
import pdfParse from 'pdf-parse';

async function checkFIN() {
  const pdfPath = join(__dirname, 'template', 'efayda_Abel Tesfaye Gebremedhim.pdf');
  const pdfBuffer = readFileSync(pdfPath);
  const data = await pdfParse(pdfBuffer);
  
  console.log('=== SEARCHING FOR FIN IN PDF TEXT ===\n');
  
  // Look for 12-digit patterns
  const pattern12 = /(\d{4}\s+\d{4}\s+\d{4})/g;
  const matches = [...data.text.matchAll(pattern12)];
  
  console.log(`Found ${matches.length} 12-digit sequences:\n`);
  matches.forEach((match, i) => {
    console.log(`${i + 1}. ${match[1]}`);
  });
  
  // Look for 16-digit patterns (FCN)
  const pattern16 = /(\d{4}\s+\d{4}\s+\d{4}\s+\d{4})/g;
  const matches16 = [...data.text.matchAll(pattern16)];
  
  console.log(`\nFound ${matches16.length} 16-digit sequences (FCN):\n`);
  matches16.forEach((match, i) => {
    console.log(`${i + 1}. ${match[1]}`);
  });
  
  // Search for "4726" specifically
  if (data.text.includes('4726')) {
    console.log('\n✅ Found "4726" in PDF text!');
    const index = data.text.indexOf('4726');
    const context = data.text.substring(Math.max(0, index - 50), Math.min(data.text.length, index + 100));
    console.log('Context:', context);
  } else {
    console.log('\n❌ "4726" NOT found in PDF text');
  }
}

checkFIN().catch(console.error);
