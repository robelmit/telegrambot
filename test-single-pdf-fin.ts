/**
 * Quick test on single failing PDF
 */
import fs from 'fs';
import path from 'path';
import { pdfParser } from './src/services/pdf/parser';

async function testSinglePDF() {
  const pdfPath = path.join(__dirname, 'template', 'efayda_Awet Tikabo Gebrehiwet.pdf');
  console.log('Testing: efayda_Awet Tikabo Gebrehiwet.pdf\n');

  const pdfBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParser.parse(pdfBuffer);

  console.log('Results:');
  console.log(`  Name: ${data.fullNameEnglish}`);
  console.log(`  FCN:  ${data.fcn}`);
  console.log(`  FIN:  ${data.fin || '(empty)'}`);
  console.log(`  Phone: ${data.phoneNumber}`);
  console.log(`\nFIN extracted: ${data.fin ? '✅ YES' : '❌ NO'}`);
}

testSinglePDF().catch(console.error);
