/**
 * Test eFayda PDF Processing with Optimized OCR
 * Usage: Place your eFayda PDF in the template folder and update the filename below
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { pdfParser } from './src/services/pdf/parser';

async function testEfaydaPDF() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 Testing eFayda PDF Processing with Optimized OCR');
  console.log('='.repeat(70) + '\n');

  // UPDATE THIS with your PDF filename
  const pdfFileName = 'efayda_Abel Tesfaye Gebremedhim.pdf'; // Change this to your actual PDF filename
  
  const pdfPath = join(__dirname, 'template', pdfFileName);

  try {
    console.log(`📁 Loading PDF: ${pdfFileName}`);
    const pdfBuffer = readFileSync(pdfPath);
    console.log(`✅ PDF loaded: ${(pdfBuffer.length / 1024).toFixed(2)} KB\n`);

    console.log('⏱️  Starting OCR processing...');
    console.log('   (Using optimized PaddleOCR - should take ~5-7 seconds)\n');

    const startTime = Date.now();
    const result = await pdfParser.parse(pdfBuffer);
    const totalTime = Date.now() - startTime;

    console.log('='.repeat(70));
    console.log('✅ PDF Processing Complete!');
    console.log('='.repeat(70) + '\n');

    // Performance metrics
    console.log('⏱️  PERFORMANCE METRICS:');
    console.log(`   Total Processing Time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
    
    if (totalTime < 5000) {
      console.log('   Status: ⚡ EXCELLENT! (Using optimized OCR)');
    } else if (totalTime < 10000) {
      console.log('   Status: ✅ GOOD! (Normal speed)');
    } else {
      console.log('   Status: ⚠️  SLOW! (Consider optimization)');
    }
    console.log('');

    // Extracted data
    console.log('📊 EXTRACTED DATA:');
    console.log('─'.repeat(70));
    
    console.log('\n👤 Personal Information:');
    console.log(`   Name (English):  ${result.fullNameEnglish || '❌ Not found'}`);
    console.log(`   Name (Amharic):  ${result.fullNameAmharic || '❌ Not found'}`);
    console.log(`   Sex:             ${result.sex} (${result.sexAmharic})`);
    console.log(`   DOB (Gregorian): ${result.dateOfBirthGregorian || '❌ Not found'}`);
    console.log(`   DOB (Ethiopian): ${result.dateOfBirthEthiopian || '❌ Not found'}`);
    
    console.log('\n📱 Contact & Location:');
    console.log(`   Phone Number:    ${result.phoneNumber || '❌ Not found'}`);
    console.log(`   Region:          ${result.regionAmharic || '❌'} / ${result.region || '❌ Not found'}`);
    console.log(`   Zone/City:       ${result.zoneAmharic || '❌'} / ${result.city || '❌ Not found'}`);
    console.log(`   Woreda/Subcity:  ${result.woredaAmharic || '❌'} / ${result.subcity || '❌ Not found'}`);
    
    console.log('\n🆔 ID Numbers:');
    console.log(`   FIN (12 digits): ${result.fin || '❌ Not found'}`);
    console.log(`   FCN/FAN:         ${result.fcn || '❌ Not found'}`);
    console.log(`   Serial Number:   ${result.serialNumber}`);
    
    console.log('\n📅 Dates:');
    console.log(`   Issue Date:      ${result.issueDate} (Gregorian)`);
    console.log(`   Issue Date:      ${result.issueDateEthiopian} (Ethiopian)`);
    console.log(`   Expiry Date:     ${result.expiryDateGregorian} (Gregorian)`);
    console.log(`   Expiry Date:     ${result.expiryDateEthiopian} (Ethiopian)`);
    
    console.log('\n🖼️  Images:');
    console.log(`   Photo:           ${result.photo ? '✅ Extracted' : '❌ Not found'}`);
    console.log(`   QR Code:         ${result.qrCode ? '✅ Extracted' : '❌ Not found'}`);
    console.log(`   Barcode:         ${result.barcode ? '✅ Extracted' : '❌ Not found'}`);

    console.log('\n' + '='.repeat(70));

    // Validation checks
    console.log('\n🔍 VALIDATION CHECKS:');
    console.log('─'.repeat(70));
    
    const checks = [
      { name: 'Name (English)', value: result.fullNameEnglish, critical: true },
      { name: 'Name (Amharic)', value: result.fullNameAmharic, critical: true },
      { name: 'FIN', value: result.fin, critical: true },
      { name: 'Phone Number', value: result.phoneNumber, critical: true },
      { name: 'Region', value: result.region, critical: true },
      { name: 'Zone/City', value: result.city, critical: true },
      { name: 'Woreda/Subcity', value: result.subcity, critical: false },
      { name: 'Photo', value: result.photo, critical: true },
      { name: 'QR Code', value: result.qrCode, critical: true },
    ];

    let passed = 0;
    let failed = 0;
    let warnings = 0;

    checks.forEach(check => {
      if (check.value) {
        console.log(`   ✅ ${check.name.padEnd(20)} - OK`);
        passed++;
      } else if (check.critical) {
        console.log(`   ❌ ${check.name.padEnd(20)} - MISSING (Critical)`);
        failed++;
      } else {
        console.log(`   ⚠️  ${check.name.padEnd(20)} - MISSING (Optional)`);
        warnings++;
      }
    });

    console.log('\n' + '─'.repeat(70));
    console.log(`   Summary: ${passed} passed, ${failed} failed, ${warnings} warnings`);
    
    if (failed === 0) {
      console.log('   Result: ✅ ALL CRITICAL CHECKS PASSED!');
    } else {
      console.log(`   Result: ❌ ${failed} CRITICAL CHECKS FAILED!`);
    }

    console.log('\n' + '='.repeat(70));

    // Address extraction check
    if (result.subcity) {
      console.log('\n✅ ADDRESS EXTRACTION: Working correctly!');
      console.log(`   Full Address: ${result.woredaAmharic}, ${result.zoneAmharic}, ${result.regionAmharic}`);
    } else {
      console.log('\n⚠️  ADDRESS EXTRACTION: Woreda/Subcity not found');
      console.log('   This might be due to PDF formatting variations');
    }

    console.log('\n💡 TIPS:');
    if (totalTime > 10000) {
      console.log('   - Processing is slow. Consider enabling Google Vision API');
      console.log('   - See docs/OCR_OPTIMIZATION.md for setup instructions');
    } else {
      console.log('   - Processing speed is good!');
      console.log('   - For even faster processing, enable Google Vision API');
    }
    
    if (failed > 0) {
      console.log('   - Some critical data is missing');
      console.log('   - Check PDF quality and format');
      console.log('   - Review logs for detailed error messages');
    }

    console.log('\n' + '='.repeat(70) + '\n');

  } catch (error: any) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ TEST FAILED!');
    console.error('='.repeat(70) + '\n');
    console.error('Error:', error.message);
    console.error('\n💡 TROUBLESHOOTING:');
    
    if (error.code === 'ENOENT') {
      console.error('   1. Make sure the PDF file exists in the template/ folder');
      console.error(`   2. Check the filename: ${pdfFileName}`);
      console.error('   3. Update the pdfFileName variable in this script');
    } else {
      console.error('   1. Make sure all dependencies are installed: npm install');
      console.error('   2. Build the project: npm run build');
      console.error('   3. Check if the PDF is a valid eFayda PDF');
      console.error('   4. Review the full error stack trace above');
    }
    
    console.error('\n' + '='.repeat(70) + '\n');
    process.exit(1);
  }
}

// Run test
console.log('\n🔧 eFayda PDF Test Script');
console.log('📝 Make sure to update the pdfFileName variable with your actual PDF filename\n');

testEfaydaPDF().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
