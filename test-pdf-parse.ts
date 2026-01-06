/**
 * Test PDF parsing from real/fayda.pdf
 */
import fs from 'fs';
import pdfParse from 'pdf-parse';

async function testPdfParse() {
  const pdfBuffer = fs.readFileSync('real/fayda.pdf');
  
  console.log('Parsing PDF...\n');
  
  const data = await pdfParse(pdfBuffer);
  
  console.log('=== PDF Text Content ===\n');
  console.log(data.text);
  console.log('\n=== End of Text ===\n');
  
  console.log('Number of pages:', data.numpages);
  console.log('PDF version:', data.version);
}

testPdfParse().catch(console.error);
