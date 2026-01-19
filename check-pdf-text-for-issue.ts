import { readFileSync } from 'fs';
import { join } from 'path';
import pdfParse from 'pdf-parse';

async function checkPdfText() {
  const pdfPath = join(__dirname, 'template', 'efayda_Abel Tesfaye Gebremedhim.pdf');
  const pdfBuffer = readFileSync(pdfPath);
  
  const data = await pdfParse(pdfBuffer);
  const text = data.text;
  
  console.log('=== FULL PDF TEXT ===\n');
  console.log(text);
  console.log('\n=== END PDF TEXT ===\n');
  
  // Look for issue-related keywords
  console.log('Lines containing "issue" or "Issue":');
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (line.toLowerCase().includes('issue')) {
      console.log(`  Line ${i}: ${line}`);
    }
  });
  
  // Look for all dates
  const dates1 = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/g) || [];
  const dates2 = text.match(/(\d{4}\/\d{1,2}\/\d{1,2})/g) || [];
  const dates3 = text.match(/(\d{4}\/[A-Za-z]{3}\/\d{1,2})/g) || [];
  
  console.log('\nAll dates found in PDF text:');
  console.log('Gregorian (DD/MM/YYYY):', dates1);
  console.log('Ethiopian (YYYY/MM/DD):', dates2);
  console.log('Ethiopian (YYYY/Mon/DD):', dates3);
  
  console.log('\n=== EXPECTED ===');
  console.log('Issue Date: 2018/05/03 or 2026/Jan/11');
  console.log('Expiry Date: 2026/05/01 or 2034/Jan/09');
}

checkPdfText().catch(console.error);
