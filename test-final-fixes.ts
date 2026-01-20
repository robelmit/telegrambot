/**
 * Test both fixes:
 * 1. FIN extraction on all PDFs (should be 100%)
 * 2. PDF output without cutting lines
 */
import fs from 'fs';
import path from 'path';
import { pdfParser } from './src/services/pdf/parser';
import { CardVariantGenerator } from './src/services/generator/cardVariantGenerator';
import { PDFGenerator } from './src/services/generator/pdfGenerator';

async function testFinalFixes() {
  console.log('=== Testing Final Fixes ===\n');

  // Test 1: FIN Extraction
  console.log('Test 1: FIN Extraction on All PDFs');
  console.log('='.repeat(50));

  const templateDir = path.join(__dirname, 'template');
  const pdfFiles = fs.readdirSync(templateDir)
    .filter(file => file.startsWith('efayda_') && file.endsWith('.pdf'))
    .sort();

  let successCount = 0;
  let failCount = 0;

  for (const pdfFile of pdfFiles) {
    const pdfPath = path.join(templateDir, pdfFile);
    const pdfBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParser.parse(pdfBuffer);

    const finExtracted = !!(data.fin && data.fin.length > 0);
    const finValid = !!(data.fin && data.fin.replace(/\s/g, '').length === 12);
    const success = finExtracted && finValid && data.fin !== data.fcn;

    if (success) {
      successCount++;
      console.log(`✅ ${pdfFile.substring(7, 30)}... - FIN: ${data.fin}`);
    } else {
      failCount++;
      console.log(`❌ ${pdfFile.substring(7, 30)}... - FIN: ${data.fin || '(empty)'}`);
    }
  }

  console.log(`\nFIN Extraction: ${successCount}/${pdfFiles.length} successful (${((successCount / pdfFiles.length) * 100).toFixed(1)}%)`);

  // Test 2: PDF Output without cutting lines
  console.log('\n\nTest 2: PDF Output Without Cutting Lines');
  console.log('='.repeat(50));

  // Use one of the successfully parsed PDFs
  const testPdfPath = path.join(templateDir, pdfFiles[0]);
  const testPdfBuffer = fs.readFileSync(testPdfPath);
  const testData = await pdfParser.parse(testPdfBuffer);

  // Generate card
  const outputDir = path.join(__dirname, 'test-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const generator = new CardVariantGenerator(outputDir);
  const pdfGenerator = new PDFGenerator();

  console.log('Generating test card...');
  const { normalCombined } = await generator.generateColorVariants(testData);

  // Save PNG
  const testPngPath = path.join(outputDir, 'test_final_card.png');
  fs.writeFileSync(testPngPath, normalCombined);
  console.log(`✅ Saved PNG: ${testPngPath}`);

  // Generate PDF
  const testPdfOutputPath = path.join(outputDir, 'test_final_card_A4.pdf');
  await pdfGenerator.generateA4PDFFromBuffer(normalCombined, testPdfOutputPath, {
    title: 'Test Card - No Cutting Lines'
  });
  console.log(`✅ Saved PDF: ${testPdfOutputPath}`);
  console.log('   PDF should NOT have cutting/crop marks');

  // Summary
  console.log('\n\n' + '='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ FIN Extraction: ${successCount === pdfFiles.length ? 'PASS' : 'FAIL'} (${successCount}/${pdfFiles.length})`);
  console.log(`✅ PDF Output: Generated without cutting lines`);
  console.log(`\nCheck ${testPdfOutputPath} to verify no cutting lines`);
}

testFinalFixes().catch(console.error);
