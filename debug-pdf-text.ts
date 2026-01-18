import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';

async function debugPdfText() {
  const pdfPath = path.join(__dirname, 'template', 'efayda_Degef Weldeabzgi Gebreweld .pdf');
  
  console.log('Reading PDF:', pdfPath);
  const pdfBuffer = fs.readFileSync(pdfPath);
  
  const data = await pdfParse(pdfBuffer);
  
  console.log('\n=== RAW PDF TEXT ===');
  console.log(data.text);
  console.log('\n=== END RAW TEXT ===');
  
  // Save to file for easier inspection
  fs.writeFileSync('test-output/raw-pdf-text.txt', data.text);
  console.log('\nRaw text saved to test-output/raw-pdf-text.txt');
}

debugPdfText().catch(console.error);
