/**
 * Test all eFayda PDFs in template folder
 */
import fs from 'fs';
import { PDFParserImpl } from './src/services/pdf/parser';

async function testAllPDFs() {
  console.log('=== Testing All eFayda PDFs ===\n');

  const parser = new PDFParserImpl();
  
  const pdfs = [
    {
      name: 'Degef Weldeabzgi Gebreweld',
      path: './template/efayda_Degef Weldeabzgi Gebreweld .pdf',
      expectedFin: '8719 7604 5103',
      expectedPhone: '0900193994',
    },
    {
      name: 'Mahtot Tsehaye Kurabachew',
      path: './template/efayda_Mahtot Tsehaye Kurabachew.pdf',
      expectedFin: '9258 7316 0852',
      expectedPhone: '0943671740',
    },
    {
      name: 'Mahtot (mahtot.pdf)',
      path: './template/mahtot.pdf',
      expectedFin: '9258 7316 0852', // Same as above
      expectedPhone: '0943671740',
    },
  ];

  const results: any[] = [];

  for (let i = 0; i < pdfs.length; i++) {
    const pdf = pdfs[i];
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📄 Test ${i + 1}/${pdfs.length}: ${pdf.name}`);
    console.log('─'.repeat(70));

    try {
      // Check if file exists
      if (!fs.existsSync(pdf.path)) {
        console.log(`❌ File not found: ${pdf.path}`);
        results.push({
          name: pdf.name,
          status: 'FILE_NOT_FOUND',
          time: 0,
        });
        continue;
      }

      const pdfBuffer = fs.readFileSync(pdf.path);
      console.log(`📦 File size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
      
      console.log(`⏱️  Starting processing...`);
      const startTime = Date.now();
      
      const data = await parser.parse(pdfBuffer);
      
      const totalTime = Date.now() - startTime;
      const timeSeconds = (totalTime / 1000).toFixed(2);
      
      console.log(`\n✅ Processing complete in ${timeSeconds} seconds`);
      
      // Display results
      console.log(`\n📊 Extracted Data:`);
      console.log(`  Name (English): ${data.fullNameEnglish}`);
      console.log(`  Name (Amharic): ${data.fullNameAmharic}`);
      console.log(`  FIN: ${data.fin}`);
      console.log(`  Phone: ${data.phoneNumber}`);
      console.log(`  FCN: ${data.fcn}`);
      console.log(`  Sex: ${data.sex} (${data.sexAmharic})`);
      console.log(`  DOB (Gregorian): ${data.dateOfBirthGregorian}`);
      console.log(`  DOB (Ethiopian): ${data.dateOfBirthEthiopian}`);
      console.log(`  Expiry (Gregorian): ${data.expiryDateGregorian}`);
      console.log(`  Expiry (Ethiopian): ${data.expiryDateEthiopian}`);
      console.log(`  Region: ${data.regionAmharic} / ${data.region}`);
      console.log(`  Zone: ${data.zoneAmharic} / ${data.city}`);
      console.log(`  Woreda: ${data.woredaAmharic} / ${data.subcity}`);
      
      // Verify expected values
      const finCorrect = data.fin === pdf.expectedFin;
      const phoneCorrect = data.phoneNumber === pdf.expectedPhone;
      
      console.log(`\n🔍 Verification:`);
      console.log(`  FIN: ${finCorrect ? '✅ CORRECT' : '❌ WRONG'}`);
      console.log(`    Expected: ${pdf.expectedFin}`);
      console.log(`    Got:      ${data.fin}`);
      console.log(`  Phone: ${phoneCorrect ? '✅ CORRECT' : '❌ WRONG'}`);
      console.log(`    Expected: ${pdf.expectedPhone}`);
      console.log(`    Got:      ${data.phoneNumber}`);
      
      // Performance assessment
      console.log(`\n⚡ Performance:`);
      if (totalTime < 12000) {
        console.log(`  🚀 FAST PATH (${timeSeconds}s < 12s)`);
      } else if (totalTime < 45000) {
        console.log(`  ⏰ RETRY PATH (${timeSeconds}s) - Used scribe.js-ocr for accuracy`);
      } else {
        console.log(`  ⚠️  SLOW (${timeSeconds}s)`);
      }
      
      results.push({
        name: pdf.name,
        status: finCorrect && phoneCorrect ? 'SUCCESS' : 'PARTIAL',
        time: totalTime,
        timeSeconds: timeSeconds,
        finCorrect,
        phoneCorrect,
        fin: data.fin,
        phone: data.phoneNumber,
      });
      
    } catch (error: any) {
      console.error(`\n❌ Error processing ${pdf.name}:`, error.message);
      results.push({
        name: pdf.name,
        status: 'ERROR',
        time: 0,
        error: error.message,
      });
    }
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log(`\n📊 SUMMARY OF ALL TESTS\n`);
  console.log('─'.repeat(70));
  
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.name}`);
    console.log(`   Status: ${result.status}`);
    if (result.status === 'SUCCESS' || result.status === 'PARTIAL') {
      console.log(`   Time: ${result.timeSeconds}s`);
      console.log(`   FIN: ${result.finCorrect ? '✅' : '❌'} ${result.fin}`);
      console.log(`   Phone: ${result.phoneCorrect ? '✅' : '❌'} ${result.phone}`);
    } else if (result.status === 'ERROR') {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  // Statistics
  const successCount = results.filter(r => r.status === 'SUCCESS').length;
  const totalCount = results.length;
  const avgTime = results
    .filter(r => r.time > 0)
    .reduce((sum, r) => sum + r.time, 0) / results.filter(r => r.time > 0).length;
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`\n📈 STATISTICS\n`);
  console.log(`  Total PDFs: ${totalCount}`);
  console.log(`  Successful: ${successCount} (${((successCount/totalCount)*100).toFixed(1)}%)`);
  console.log(`  Average Time: ${(avgTime/1000).toFixed(2)}s`);
  
  const fastCount = results.filter(r => r.time > 0 && r.time < 12000).length;
  const slowCount = results.filter(r => r.time >= 12000).length;
  
  console.log(`\n  Fast Path (<12s): ${fastCount}`);
  console.log(`  Retry Path (≥12s): ${slowCount}`);
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`\n✅ All tests complete!\n`);
}

testAllPDFs();
