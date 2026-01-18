/**
 * Quick test of Mahtot PDF with scribe.js-ocr integration
 */
import fs from 'fs';
import { PDFParserImpl } from './src/services/pdf/parser';

async function testMahtotQuick() {
  console.log('=== Quick Mahtot Test with scribe.js-ocr ===\n');

  const parser = new PDFParserImpl();

  try {
    const mahtotPath = './template/efayda_Mahtot Tsehaye Kurabachew.pdf';
    const mahtotBuffer = fs.readFileSync(mahtotPath);
    
    console.log('Parsing Mahtot PDF...\n');
    const mahtotData = await parser.parse(mahtotBuffer);
    
    console.log('✅ Results:');
    console.log(`  FIN: ${mahtotData.fin}`);
    console.log(`  Phone: ${mahtotData.phoneNumber}`);
    console.log(`  Name: ${mahtotData.fullNameEnglish}`);
    
    // Verify
    const expected = {
      fin: '9258 7316 0852',
      phone: '0943671740',
    };
    
    console.log('\n📊 Verification:');
    console.log(`  FIN: ${mahtotData.fin === expected.fin ? '✅ CORRECT' : '❌ WRONG'}`);
    console.log(`    Expected: ${expected.fin}`);
    console.log(`    Got:      ${mahtotData.fin}`);
    console.log(`  Phone: ${mahtotData.phoneNumber === expected.phone ? '✅ CORRECT' : '❌ WRONG'}`);
    
    if (mahtotData.fin === expected.fin) {
      console.log('\n🎉 SUCCESS! Mahtot FIN correctly extracted!');
    } else {
      console.log('\n⚠️  FIN still incorrect');
    }
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testMahtotQuick();
