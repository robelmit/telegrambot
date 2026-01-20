/**
 * Final test for issue date extraction on all PDFs
 * Tests the improved extraction with PDF text + OCR + calculated fallback
 */
import fs from 'fs';
import path from 'path';
import { pdfParser } from './src/services/pdf/parser';

async function testIssueDates() {
  console.log('=== Testing Issue Date Extraction (Improved) ===\n');

  const templateDir = path.join(__dirname, 'template');
  const pdfFiles = fs.readdirSync(templateDir)
    .filter(file => file.startsWith('efayda_') && file.endsWith('.pdf'))
    .sort();

  console.log(`Testing ${pdfFiles.length} eFayda PDFs\n`);

  let successCount = 0;
  let failCount = 0;

  for (const pdfFile of pdfFiles) {
    const pdfPath = path.join(templateDir, pdfFile);
    const pdfBuffer = fs.readFileSync(pdfPath);
    
    console.log(`Testing: ${pdfFile.substring(7, 35)}...`);
    
    try {
      const data = await pdfParser.parse(pdfBuffer);

      const hasIssueGregorian = !!(data.issueDate && data.issueDate.length > 0);
      const hasIssueEthiopian = !!(data.issueDateEthiopian && data.issueDateEthiopian.length > 0);
      const success = hasIssueGregorian && hasIssueEthiopian;

      if (success) {
        successCount++;
        console.log(`  ✅ Issue (G): ${data.issueDate}, Issue (E): ${data.issueDateEthiopian}`);
      } else {
        failCount++;
        console.log(`  ❌ Issue (G): ${data.issueDate || '(empty)'}, Issue (E): ${data.issueDateEthiopian || '(empty)'}`);
      }
    } catch (error) {
      failCount++;
      console.log(`  ❌ ERROR: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Results: ${successCount}/${pdfFiles.length} successful (${((successCount / pdfFiles.length) * 100).toFixed(1)}%)`);
  console.log('='.repeat(60));

  if (successCount === pdfFiles.length) {
    console.log('\n🎉 SUCCESS! All PDFs extract issue dates correctly!');
  } else {
    console.log(`\n⚠️  ${failCount} PDF(s) failed issue date extraction`);
  }
}

testIssueDates().catch(console.error);
