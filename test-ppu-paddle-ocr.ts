/**
 * Test ppu-paddle-ocr for Mahtot FIN extraction
 */
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';

async function testPPUPaddleOCR() {
  console.log('=== Testing ppu-paddle-ocr for Mahtot FIN Extraction ===\n');

  try {
    // Import ppu-paddle-ocr
    const { PaddleOcrService } = await import('ppu-paddle-ocr');
    
    console.log('✅ ppu-paddle-ocr imported successfully\n');

    // Read Mahtot PDF
    const pdfPath = './template/efayda_Mahtot Tsehaye Kurabachew.pdf';
    const pdfBuffer = fs.readFileSync(pdfPath);
    
    // Extract images from PDF
    const jpegStart = Buffer.from([0xFF, 0xD8, 0xFF]);
    const jpegEnd = Buffer.from([0xFF, 0xD9]);
    const images: Buffer[] = [];
    let startIndex = 0;

    while (startIndex < pdfBuffer.length) {
      const start = pdfBuffer.indexOf(jpegStart, startIndex);
      if (start === -1) break;

      const end = pdfBuffer.indexOf(jpegEnd, start + 3);
      if (end === -1) break;

      const imageBuffer = pdfBuffer.slice(start, end + 2);
      if (imageBuffer.length > 500) {
        images.push(imageBuffer);
      }
      startIndex = end + 2;
    }

    console.log(`Found ${images.length} images in PDF`);
    
    if (images.length < 4) {
      console.error('❌ Not enough images found in PDF');
      return;
    }

    // Image 4 (index 3) is the back card with FIN
    const backCardImage = images[3];
    console.log(`Back card image size: ${backCardImage.length} bytes\n`);

    // Save back card image for inspection
    fs.writeFileSync('./test-output/mahtot-back-card.jpg', backCardImage);
    console.log('✅ Saved back card image to test-output/mahtot-back-card.jpg\n');

    // Initialize PaddleOCR Service
    console.log('Initializing PaddleOCR Service...');
    const service = new PaddleOcrService({
      debugging: {
        debug: false,
        verbose: true,
      },
    });
    
    await service.initialize();
    console.log('✅ PaddleOCR Service initialized\n');

    // Perform OCR on back card
    console.log('Running OCR on back card image...');
    const startTime = Date.now();
    const result = await service.recognize(backCardImage);
    const endTime = Date.now();
    
    console.log(`✅ OCR completed in ${endTime - startTime}ms\n`);

    // Display OCR results
    console.log('=== OCR Results ===');
    console.log('Full result:', JSON.stringify(result, null, 2));
    console.log('\n');

    // Extract text from results
    let ocrText = '';
    if (result && result.text) {
      ocrText = result.text;
    } else if (typeof result === 'string') {
      ocrText = result;
    } else if (Array.isArray(result)) {
      ocrText = result.map((item: any) => {
        if (typeof item === 'string') return item;
        if (item.text) return item.text;
        if (item.words) return item.words;
        return '';
      }).join(' ');
    }

    console.log('Extracted text:', ocrText);
    console.log('\n');

    // Look for FIN pattern (12 digits: XXXX XXXX XXXX)
    const finPattern = /(\d{4}\s*\d{4}\s*\d{4})/g;
    const finMatches = ocrText.match(finPattern);
    
    console.log('=== FIN Extraction ===');
    if (finMatches && finMatches.length > 0) {
      console.log('✅ Found potential FIN(s):');
      finMatches.forEach((fin, index) => {
        console.log(`  ${index + 1}. ${fin}`);
      });
      console.log('\n');
      console.log('Expected FIN: 9258 7316 0852');
      console.log('Match found:', finMatches.some(fin => fin.replace(/\s/g, '') === '925873160852') ? '✅ YES' : '❌ NO');
    } else {
      console.log('❌ No FIN pattern found');
      console.log('Trying to extract all digit groups...');
      const allDigits = ocrText.match(/\d+/g);
      if (allDigits) {
        console.log('All digit groups found:', allDigits);
      }
    }

    // Clean up
    await service.destroy();
    console.log('\n✅ Service destroyed');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testPPUPaddleOCR();
