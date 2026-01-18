/**
 * Quick test - Degef should be FAST (5-10 seconds)
 */
import fs from 'fs';
import { PDFParserImpl } from './src/services/pdf/parser';

async function testDegefFast() {
  console.log('=== Testing Degef (Should be FAST) ===\n');

  const parser = new PDFParserImpl();

  try {
    const degefPath = './template/efayda_Degef Weldeabzgi Gebreweld .pdf';
    const degefBuffer = fs.readFileSync(degefPath);
    
    console.log('Starting...');
    const startTime = Date.now();
    const degefData = await parser.parse(degefBuffer);
    const totalTime = Date.now() - startTime;
    
    console.log(`\n⏱️  Total Time: ${(totalTime / 1000).toFixed(2)} seconds`);
    console.log(`\n✅ Results:`);
    console.log(`  FIN: ${degefData.fin}`);
    console.log(`  Phone: ${degefData.phoneNumber}`);
    
    if (totalTime < 12000) {
      console.log(`\n🚀 SUCCESS! Fast path used (${(totalTime / 1000).toFixed(2)}s < 12s)`);
    } else {
      console.log(`\n⚠️  Slow (${(totalTime / 1000).toFixed(2)}s)`);
    }
    
  } catch (error: any) {
    console.error('❌ Failed:', error.message);
  }
}

testDegefFast();
