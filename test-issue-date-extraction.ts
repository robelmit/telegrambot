/**
 * Test issue date extraction on all eFayda PDFs
 */
import fs from 'fs';
import path from 'path';
import { pdfParser } from './src/services/pdf/parser';

async function testIssueDateExtraction() {
  console.log('=== Testing Issue Date Extraction on All eFayda PDFs ===\n');

  const templateDir = path.join(__dirname, 'template');
  const pdfFiles = fs.readdirSync(templateDir)
    .filter(file => file.startsWith('efayda_') && file.endsWith('.pdf'))
    .sort();

  console.log(`Found ${pdfFiles.length} eFayda PDF files:\n`);

  const results: Array<{
    filename: string;
    success: boolean;
    issueDateGregorian: string;
    issueDateEthiopian: string;
    expiryDateGregorian: string;
    expiryDateEthiopian: string;
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

      const issueDateGregorianExtracted = !!(data.issueDate && data.issueDate.length > 0);
      const issueDateEthiopianExtracted = !!(data.issueDateEthiopian && data.issueDateEthiopian.length > 0);
      const expiryDateGregorianExtracted = !!(data.expiryDate && data.expiryDate.length > 0);
      const expiryDateEthiopianExtracted = !!(data.expiryDateEthiopian && data.expiryDateEthiopian.length > 0);

      console.log('\n📊 Extraction Results:');
      console.log(`   Name: ${data.fullNameEnglish}`);
      console.log(`   Issue Date (Gregorian):  ${data.issueDate || '(empty)'}`);
      console.log(`   Issue Date (Ethiopian):  ${data.issueDateEthiopian || '(empty)'}`);
      console.log(`   Expiry Date (Gregorian): ${data.expiryDate || '(empty)'}`);
      console.log(`   Expiry Date (Ethiopian): ${data.expiryDateEthiopian || '(empty)'}`);

      console.log('\n✅ Validation:');
      console.log(`   Issue Date (Gregorian) extracted:  ${issueDateGregorianExtracted ? '✅ YES' : '❌ NO'}`);
      console.log(`   Issue Date (Ethiopian) extracted:  ${issueDateEthiopianExtracted ? '✅ YES' : '❌ NO'}`);
      console.log(`   Expiry Date (Gregorian) extracted: ${expiryDateGregorianExtracted ? '✅ YES' : '❌ NO'}`);
      console.log(`   Expiry Date (Ethiopian) extracted: ${expiryDateEthiopianExtracted ? '✅ YES' : '❌ NO'}`);

      const success = issueDateGregorianExtracted && issueDateEthiopianExtracted;

      if (success) {
        console.log('\n🎉 SUCCESS: Issue dates extracted correctly!');
      } else {
        console.log('\n⚠️  FAILED: Issue date extraction incomplete');
      }

      results.push({
        filename: pdfFile,
        success,
        issueDateGregorian: data.issueDate || '',
        issueDateEthiopian: data.issueDateEthiopian || '',
        expiryDateGregorian: data.expiryDate || '',
        expiryDateEthiopian: data.expiryDateEthiopian || '',
        name: data.fullNameEnglish || '',
        error: !success ? 'Issue date extraction incomplete' : undefined
      });

    } catch (error) {
      console.error(`\n❌ ERROR processing ${pdfFile}:`, error);
      results.push({
        filename: pdfFile,
        success: false,
        issueDateGregorian: '',
        issueDateEthiopian: '',
        expiryDateGregorian: '',
        expiryDateEthiopian: '',
        name: '',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('SUMMARY: Issue Date Extraction Test Results');
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
    console.log(`   Issue Date (G):  ${result.issueDateGregorian || '(empty)'}`);
    console.log(`   Issue Date (E):  ${result.issueDateEthiopian || '(empty)'}`);
    console.log(`   Expiry Date (G): ${result.expiryDateGregorian || '(empty)'}`);
    console.log(`   Expiry Date (E): ${result.expiryDateEthiopian || '(empty)'}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
  });

  // Failed PDFs
  const failedPDFs = results.filter(r => !r.success);
  if (failedPDFs.length > 0) {
    console.log('\n⚠️  PDFs with issue date extraction issues:');
    failedPDFs.forEach(pdf => {
      console.log(`   - ${pdf.filename}`);
    });
  }

  console.log('\n' + '='.repeat(80));
}

testIssueDateExtraction().catch(console.error);
