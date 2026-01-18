/**
 * Test script to verify back card OCR extraction
 * Tests FIN and address extraction from Image 4 (back card)
 */
import fs from 'fs';
import path from 'path';
import { pdfParser } from './src/services/pdf/parser';

async function testBackCardOCR() {
  console.log('=== Testing Back Card OCR Extraction ===\n');

  // Test files
  const testFiles = [
    {
      name: 'Degef Weldeabzgi Gebreweld',
      path: './template/efayda_Degef Weldeabzgi Gebreweld .pdf'
    },
    {
      name: 'Mahtot Tsehaye Kurabachew',
      path: './template/efayda_Mahtot Tsehaye Kurabachew.pdf'
    }
  ];

  for (const testFile of testFiles) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${testFile.name}`);
    console.log('='.repeat(60));

    try {
      const pdfBuffer = fs.readFileSync(testFile.path);
      const data = await pdfParser.parse(pdfBuffer);

      console.log('\n📋 Extracted Data:');
      console.log('─'.repeat(60));
      
      console.log('\n👤 Name:');
      console.log(`  Amharic: ${data.fullNameAmharic}`);
      console.log(`  English: ${data.fullNameEnglish}`);
      
      console.log('\n📞 Contact:');
      console.log(`  Phone: ${data.phoneNumber}`);
      
      console.log('\n📍 Address:');
      console.log(`  Region: ${data.regionAmharic} / ${data.region}`);
      console.log(`  Zone:   ${data.zoneAmharic} / ${data.city}`);
      console.log(`  Woreda: ${data.woredaAmharic} / ${data.subcity}`);
      
      console.log('\n🔢 ID Numbers:');
      console.log(`  FCN: ${data.fcn}`);
      console.log(`  FIN: ${data.fin}`);
      console.log(`  FAN: ${data.fan}`);
      
      console.log('\n📅 Dates:');
      console.log(`  DOB (Ethiopian): ${data.dateOfBirthEthiopian}`);
      console.log(`  DOB (Gregorian): ${data.dateOfBirthGregorian}`);
      console.log(`  Expiry (Ethiopian): ${data.expiryDateEthiopian}`);
      console.log(`  Expiry (Gregorian): ${data.expiryDateGregorian}`);
      
      console.log('\n👥 Other:');
      console.log(`  Sex: ${data.sexAmharic} / ${data.sex}`);
      console.log(`  Nationality: ${data.nationality}`);

      // Validation checks
      console.log('\n✅ Validation:');
      const checks = [
        { name: 'FIN extracted', pass: data.fin && data.fin.length > 0 },
        { name: 'FIN is 12 digits', pass: data.fin && data.fin.replace(/\s/g, '').length === 12 },
        { name: 'FIN differs from FCN', pass: data.fin !== data.fcn },
        { name: 'Phone extracted', pass: data.phoneNumber && data.phoneNumber.length > 0 },
        { name: 'Region extracted', pass: data.regionAmharic && data.region },
        { name: 'Zone extracted', pass: data.zoneAmharic && data.city },
        { name: 'Woreda extracted', pass: data.woredaAmharic && data.subcity },
        { name: 'Name extracted', pass: data.fullNameAmharic && data.fullNameEnglish }
      ];

      checks.forEach(check => {
        console.log(`  ${check.pass ? '✓' : '✗'} ${check.name}`);
      });

      const allPassed = checks.every(c => c.pass);
      console.log(`\n${allPassed ? '✅ All checks passed!' : '⚠️  Some checks failed'}`);

    } catch (error) {
      console.error(`\n❌ Error processing ${testFile.name}:`, error);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Testing complete!');
  console.log('='.repeat(60));
}

// Run the test
testBackCardOCR().catch(console.error);
