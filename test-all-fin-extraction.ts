/**
 * Test FIN extraction on all efayda PDFs in template folder
 * Identifies which PDFs have FIN extraction issues
 */
import fs from 'fs';
import path from 'path';
import { pdfParser } from './src/services/pdf/parser';

async function testAllPDFs() {
  console.log('=== Testing FIN Extraction on All eFayda PDFs ===\n');

  const templateDir = path.join(__dirname, 'template');
  const pdfFiles = fs.readdirSync(templateDir)
    .filter(file => file.startsWith('efayda_') && file.endsWith('.pdf'))
    .sort();

  console.log(`Found ${pdfFiles.length} eFayda PDF files:\n`);

  const results: Array<{
    filename: string;
    success: boolean;
    fin: string;
    fcn: string;
    name: string;
    error?: string;
  }> = [];

  for (const pdfFile of pdfFiles) {
    const pdfPath = path.join(templateDir, pdfFile);
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Testing: ${pdfFile}`);
    console.log('='.repeat(80));

    try {
      const pdfBuffer = fs.readFileSync(pdfPath);
      const data = await pdfParser.parse(pdfBuffer);

      const finExtracted = !!(data.fin && data.fin.length > 0);
      const finValid = !!(data.fin && data.fin.replace(/\s/g, '').length === 12);

      console.log('\n📊 Extraction Results:');
      console.log(`   Name: ${data.fullNameEnglish}`);
      console.log(`   FCN:  ${data.fcn || '(empty)'}`);
      console.log(`   FIN:  ${data.fin || '(empty)'}`);
      console.log(`   Phone: ${data.phoneNumber || '(empty)'}`);

      console.log('\n✅ Validation:');
      console.log(`   FIN extracted: ${finExtracted ? '✅ YES' : '❌ NO'}`);
      console.log(`   FIN is 12 digits: ${finValid ? '✅ YES' : '❌ NO'}`);
      console.log(`   FIN differs from FCN: ${data.fin !== data.fcn ? '✅ YES' : '❌ NO'}`);

      const success: boolean = finExtracted && finValid && data.fin !== data.fcn;

      if (success) {
        console.log('\n🎉 SUCCESS: FIN extracted correctly!');
      } else {
        console.log('\n⚠️  FAILED: FIN extraction issue detected');
      }

      results.push({
        filename: pdfFile,
        success,
        fin: data.fin || '',
        fcn: data.fcn || '',
        name: data.fullNameEnglish || '',
        error: !success ? 'FIN extraction failed or invalid' : undefined
      });

    } catch (error) {
      console.error(`\n❌ ERROR processing ${pdfFile}:`, error);
      results.push({
        filename: pdfFile,
        success: false,
        fin: '',
        fcn: '',
        name: '',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('SUMMARY: FIN Extraction Test Results');
  console.log('='.repeat(80));

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`\nTotal PDFs tested: ${results.length}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`Success rate: ${((successCount / results.length) * 100).toFixed(1)}%`);

  console.log('\n📋 Detailed Results:\n');
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${result.filename}`);
    console.log(`   Name: ${result.name || '(not extracted)'}`);
    console.log(`   FIN:  ${result.fin || '(empty)'}`);
    console.log(`   FCN:  ${result.fcn || '(empty)'}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
  });

  // Failed PDFs
  const failedPDFs = results.filter(r => !r.success);
  if (failedPDFs.length > 0) {
    console.log('\n⚠️  PDFs with FIN extraction issues:');
    failedPDFs.forEach(pdf => {
      console.log(`   - ${pdf.filename}`);
    });
  }

  console.log('\n' + '='.repeat(80));
}

testAllPDFs().catch(console.error);
