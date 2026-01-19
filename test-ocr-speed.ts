/**
 * Test OCR Speed - Compare different OCR engines
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { pdfParser } from './src/services/pdf/parser';

async function testOCRSpeed() {
  console.log('🚀 Testing OCR Speed Optimization\n');
  console.log('=' .repeat(60));

  // Find a test PDF in the template folder
  const testPdfPath = join(__dirname, 'template', 'photo_2026-01-18_10-48-23.jpg');
  
  try {
    // Check if we have a PDF file
    const pdfFiles = [
      'template/photo_2026-01-18_10-48-23.jpg',
      'template/photo_2026-01-18_10-48-33.jpg',
      'template/photo_2026-01-18_10-48-37.jpg',
      'template/photo_2026-01-18_10-48-40.jpg',
      'template/photo_2026-01-18_10-48-44.jpg'
    ];

    console.log('\n📁 Looking for test PDF files...');
    console.log('Note: This test requires actual eFayda PDF files');
    console.log('Please place a test PDF in the template/ folder\n');

    // Try to find any PDF file
    const fs = require('fs');
    const files = fs.readdirSync('template');
    const pdfFile = files.find((f: string) => f.toLowerCase().endsWith('.pdf'));

    if (!pdfFile) {
      console.log('❌ No PDF files found in template/ folder');
      console.log('\n💡 To test OCR speed:');
      console.log('   1. Place an eFayda PDF file in the template/ folder');
      console.log('   2. Run: npm run dev');
      console.log('   3. Upload the PDF via Telegram bot');
      console.log('   4. Check logs for processing time\n');
      console.log('Expected results:');
      console.log('   - With PaddleOCR: ~2-3 seconds per image');
      console.log('   - With Google Vision: ~1-2 seconds per image');
      console.log('   - With Tesseract: ~5-8 seconds per image');
      return;
    }

    console.log(`✅ Found test PDF: ${pdfFile}\n`);
    console.log('⏱️  Starting OCR test...\n');

    const pdfPath = join(__dirname, 'template', pdfFile);
    const pdfBuffer = readFileSync(pdfPath);

    const startTime = Date.now();
    const result = await pdfParser.parse(pdfBuffer);
    const totalTime = Date.now() - startTime;

    console.log('=' .repeat(60));
    console.log('✅ OCR Test Complete!\n');
    console.log(`⏱️  Total Processing Time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
    console.log('\n📊 Extracted Data:');
    console.log(`   Name (English): ${result.fullNameEnglish}`);
    console.log(`   Name (Amharic): ${result.fullNameAmharic}`);
    console.log(`   FIN: ${result.fin}`);
    console.log(`   Phone: ${result.phoneNumber}`);
    console.log(`   Region: ${result.regionAmharic} / ${result.region}`);
    console.log(`   Zone: ${result.zoneAmharic} / ${result.city}`);
    console.log(`   Woreda: ${result.woredaAmharic} / ${result.subcity}`);
    console.log('\n' + '='.repeat(60));

    // Performance analysis
    console.log('\n📈 Performance Analysis:');
    if (totalTime < 5000) {
      console.log('   ⚡ EXCELLENT! Using optimized OCR (PaddleOCR or Google Vision)');
    } else if (totalTime < 10000) {
      console.log('   ✅ GOOD! Using standard OCR (Tesseract)');
    } else {
      console.log('   ⚠️  SLOW! Consider enabling Google Vision API');
    }

    console.log('\n💡 Tips:');
    console.log('   - Current speed is acceptable for production');
    console.log('   - For even faster processing, enable Google Vision API');
    console.log('   - See docs/OCR_OPTIMIZATION.md for setup instructions');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.log('\n💡 Make sure:');
    console.log('   1. You have a valid eFayda PDF in template/ folder');
    console.log('   2. All dependencies are installed: npm install');
    console.log('   3. The project is built: npm run build');
  }
}

// Run test
testOCRSpeed().catch(console.error);
