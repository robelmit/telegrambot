/**
 * Test scribe.js-ocr integration with PDFParserImpl
 * Tests both Degef and Mahtot PDFs
 */
import fs from 'fs';
import { PDFParserImpl } from './src/services/pdf/parser';

async function testScribeIntegration() {
  console.log('=== Testing scribe.js-ocr Integration ===\n');

  const parser = new PDFParserImpl();

  // Test 1: Degef PDF (known to work with Tesseract)
  console.log('📄 Test 1: Degef PDF');
  console.log('─'.repeat(60));
  try {
    const degefPath = './template/efayda_Degef Weldeabzgi Gebreweld .pdf';
    const degefBuffer = fs.readFileSync(degefPath);
    
    console.log('Parsing Degef PDF...');
    const degefData = await parser.parse(degefBuffer);
    
    console.log('\n✅ Degef Results:');
    console.log(`  Name (English): ${degefData.fullNameEnglish}`);
    console.log(`  Name (Amharic): ${degefData.fullNameAmharic}`);
    console.log(`  Phone: ${degefData.phoneNumber}`);
    console.log(`  FIN: ${degefData.fin}`);
    console.log(`  FCN: ${degefData.fcn}`);
    console.log(`  Region: ${degefData.regionAmharic} / ${degefData.region}`);
    console.log(`  Zone: ${degefData.zoneAmharic} / ${degefData.city}`);
    console.log(`  Woreda: ${degefData.woredaAmharic} / ${degefData.subcity}`);
    console.log(`  DOB (Gregorian): ${degefData.dateOfBirthGregorian}`);
    console.log(`  DOB (Ethiopian): ${degefData.dateOfBirthEthiopian}`);
    console.log(`  Expiry (Gregorian): ${degefData.expiryDateGregorian}`);
    console.log(`  Expiry (Ethiopian): ${degefData.expiryDateEthiopian}`);
    console.log(`  Sex: ${degefData.sex} (${degefData.sexAmharic})`);
    
    // Verify expected values
    console.log('\n📊 Degef Verification:');
    const degefExpected = {
      fin: '8719 7604 5103',
      phone: '0943671740',
    };
    
    console.log(`  FIN Match: ${degefData.fin === degefExpected.fin ? '✅' : '❌'} (Expected: ${degefExpected.fin}, Got: ${degefData.fin})`);
    console.log(`  Phone Match: ${degefData.phoneNumber === degefExpected.phone ? '✅' : '❌'} (Expected: ${degefExpected.phone}, Got: ${degefData.phoneNumber})`);
    
  } catch (error: any) {
    console.error('❌ Degef test failed:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 2: Mahtot PDF (previously failing with Tesseract)
  console.log('📄 Test 2: Mahtot PDF');
  console.log('─'.repeat(60));
  try {
    const mahtotPath = './template/efayda_Mahtot Tsehaye Kurabachew.pdf';
    const mahtotBuffer = fs.readFileSync(mahtotPath);
    
    console.log('Parsing Mahtot PDF...');
    const mahtotData = await parser.parse(mahtotBuffer);
    
    console.log('\n✅ Mahtot Results:');
    console.log(`  Name (English): ${mahtotData.fullNameEnglish}`);
    console.log(`  Name (Amharic): ${mahtotData.fullNameAmharic}`);
    console.log(`  Phone: ${mahtotData.phoneNumber}`);
    console.log(`  FIN: ${mahtotData.fin}`);
    console.log(`  FCN: ${mahtotData.fcn}`);
    console.log(`  Region: ${mahtotData.regionAmharic} / ${mahtotData.region}`);
    console.log(`  Zone: ${mahtotData.zoneAmharic} / ${mahtotData.city}`);
    console.log(`  Woreda: ${mahtotData.woredaAmharic} / ${mahtotData.subcity}`);
    console.log(`  DOB (Gregorian): ${mahtotData.dateOfBirthGregorian}`);
    console.log(`  DOB (Ethiopian): ${mahtotData.dateOfBirthEthiopian}`);
    console.log(`  Expiry (Gregorian): ${mahtotData.expiryDateGregorian}`);
    console.log(`  Expiry (Ethiopian): ${mahtotData.expiryDateEthiopian}`);
    console.log(`  Sex: ${mahtotData.sex} (${mahtotData.sexAmharic})`);
    
    // Verify expected values
    console.log('\n📊 Mahtot Verification:');
    const mahtotExpected = {
      fin: '9258 7316 0852',
      phone: '0943671740',
      name: 'Mahtot Tsehaye Kurabachew',
    };
    
    console.log(`  FIN Match: ${mahtotData.fin === mahtotExpected.fin ? '✅' : '❌'} (Expected: ${mahtotExpected.fin}, Got: ${mahtotData.fin})`);
    console.log(`  Phone Match: ${mahtotData.phoneNumber === mahtotExpected.phone ? '✅' : '❌'} (Expected: ${mahtotExpected.phone}, Got: ${mahtotData.phoneNumber})`);
    console.log(`  Name Match: ${mahtotData.fullNameEnglish === mahtotExpected.name ? '✅' : '❌'} (Expected: ${mahtotExpected.name}, Got: ${mahtotData.fullNameEnglish})`);
    
    // Check if FIN is correct (the main issue we're solving)
    if (mahtotData.fin === mahtotExpected.fin) {
      console.log('\n🎉 SUCCESS! Mahtot FIN correctly extracted with scribe.js-ocr!');
    } else {
      console.log('\n⚠️  WARNING: Mahtot FIN still incorrect');
    }
    
  } catch (error: any) {
    console.error('❌ Mahtot test failed:', error.message);
    console.error('Stack:', error.stack);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Integration test complete!');
}

testScribeIntegration();
