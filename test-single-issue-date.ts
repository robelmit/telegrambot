/**
 * Quick test on single PDF for issue date
 */
import fs from 'fs';
import path from 'path';
import { pdfParser } from './src/services/pdf/parser';

async function testSinglePDF() {
  const pdfPath = path.join(__dirname, 'template', 'efayda_Abel Tesfaye Gebremedhim.pdf');
  console.log('Testing: efayda_Abel Tesfaye Gebremedhim.pdf\n');

  const pdfBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParser.parse(pdfBuffer);

  console.log('Results:');
  console.log(`  Name: ${data.fullNameEnglish}`);
  console.log(`  Issue Date (Gregorian):  ${data.issueDate || '(empty)'}`);
  console.log(`  Issue Date (Ethiopian):  ${data.issueDateEthiopian || '(empty)'}`);
  console.log(`  Expiry Date (Gregorian): ${data.expiryDate || '(empty)'}`);
  console.log(`  Expiry Date (Ethiopian): ${data.expiryDateEthiopian || '(empty)'}`);
  console.log(`\nIssue Date extracted: ${data.issueDate && data.issueDateEthiopian ? '✅ YES' : '❌ NO'}`);
}

testSinglePDF().catch(console.error);
