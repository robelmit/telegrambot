import { readFileSync } from 'fs';
import { join } from 'path';
import pdfParse from 'pdf-parse';

async function checkDates() {
  const pdfPath = join(__dirname, 'template', 'efayda_Abel Tesfaye Gebremedhim.pdf');
  const pdfBuffer = readFileSync(pdfPath);
  const data = await pdfParse(pdfBuffer);
  
  console.log('=== DATES IN PDF TEXT ===\n');
  
  const dates1 = data.text.match(/(\d{2}\/\d{2}\/\d{4})/g) || [];
  const dates2 = data.text.match(/(\d{4}\/\d{2}\/\d{2})/g) || [];
  
  console.log('Gregorian dates (DD/MM/YYYY):');
  dates1.forEach((d, i) => console.log(`  ${i + 1}. ${d}`));
  
  console.log('\nEthiopian dates (YYYY/MM/DD):');
  dates2.forEach((d, i) => console.log(`  ${i + 1}. ${d}`));
  
  console.log('\n=== EXPECTED DATES ===');
  console.log('DOB: 14/08/1989 (Gregorian), 1997/04/22 (Ethiopian)');
  console.log('Issue Date: Should be on front card (image 3)');
  console.log('Expiry Date: Should be on front card (image 3)');
}

checkDates().catch(console.error);
