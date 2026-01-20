const fs = require('fs');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');

async function testFINExtraction() {
  try {
    console.log('=== Testing FIN Extraction from Back Card ===\n');
    
    const imagePath = 'test-output/hgigat-back-card.jpg';
    
    if (!fs.existsSync(imagePath)) {
      console.error('Back card image not found! Run test-hgigat-simple.js first.');
      return;
    }
    
    // Preprocess image same as production code
    console.log('Step 1: Preprocessing image...');
    const preprocessedImage = await sharp(imagePath)
      .resize({ width: 2000 })
      .normalize()
      .sharpen()
      .toBuffer();
    
    console.log('✓ Image preprocessed (2000px width, normalized, sharpened)');
    
    // Save preprocessed image for inspection
    fs.writeFileSync('test-output/hgigat-back-preprocessed.jpg', preprocessedImage);
    console.log('✓ Saved preprocessed image: test-output/hgigat-back-preprocessed.jpg');
    
    // Run OCR
    console.log('\nStep 2: Running Tesseract OCR...');
    const result = await Tesseract.recognize(preprocessedImage, 'eng+amh', {
      logger: m => {
        if (m.status === 'recognizing text') {
          process.stdout.write(`\rProgress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    
    console.log('\n\n--- OCR RESULT ---');
    console.log('Confidence:', result.data.confidence);
    console.log('Text length:', result.data.text.length, 'characters');
    console.log('\n--- FULL OCR TEXT ---');
    console.log(result.data.text);
    
    const ocrText = result.data.text;
    
    // Test all FIN extraction strategies
    console.log('\n--- TESTING FIN EXTRACTION STRATEGIES ---\n');
    
    let finExtracted = false;
    let fin = '';
    
    // Strategy 1: FIN keyword with spaces
    console.log('Strategy 1: Looking for "FIN" keyword with spaces...');
    if (ocrText.toLowerCase().includes('fin') || ocrText.includes('FIN')) {
      console.log('  ✓ Found FIN keyword');
      const finKeywordIndex = ocrText.search(/fin/i);
      const afterFin = ocrText.substring(Math.max(0, finKeywordIndex - 20), Math.min(ocrText.length, finKeywordIndex + 100));
      console.log('  Context:', afterFin.substring(0, 80));
      
      const finPattern1 = /FIN\s*(\d{4})\s+(\d{4})\s+(\d{4})/i;
      const finMatch1 = afterFin.match(finPattern1);
      
      if (finMatch1) {
        fin = `${finMatch1[1]} ${finMatch1[2]} ${finMatch1[3]}`;
        console.log('  ✓ FOUND:', fin);
        finExtracted = true;
      } else {
        console.log('  ✗ Pattern not matched');
      }
    } else {
      console.log('  ✗ FIN keyword not found');
    }
    
    // Strategy 2: FIN keyword without spaces
    if (!finExtracted) {
      console.log('\nStrategy 2: Looking for "FIN" keyword without spaces...');
      if (ocrText.toLowerCase().includes('fin') || ocrText.includes('FIN')) {
        const finKeywordIndex = ocrText.search(/fin/i);
        const afterFin = ocrText.substring(Math.max(0, finKeywordIndex - 20), Math.min(ocrText.length, finKeywordIndex + 100));
        
        const finPattern2 = /FIN\s*(\d{12})/i;
        const finMatch2 = afterFin.match(finPattern2);
        
        if (finMatch2) {
          const digits = finMatch2[1];
          fin = `${digits.substring(0,4)} ${digits.substring(4,8)} ${digits.substring(8,12)}`;
          console.log('  ✓ FOUND:', fin);
          finExtracted = true;
        } else {
          console.log('  ✗ Pattern not matched');
        }
      }
    }
    
    // Strategy 3: Three consecutive 4-digit groups
    if (!finExtracted) {
      console.log('\nStrategy 3: Looking for three consecutive 4-digit groups...');
      const allDigits = ocrText.match(/\d+/g);
      console.log('  All digit groups:', allDigits);
      
      if (allDigits) {
        for (let i = 0; i < allDigits.length - 2; i++) {
          if (allDigits[i].length === 4 && allDigits[i+1].length === 4 && allDigits[i+2].length === 4) {
            fin = `${allDigits[i]} ${allDigits[i+1]} ${allDigits[i+2]}`;
            console.log(`  ✓ FOUND at position ${i}:`, fin);
            finExtracted = true;
            break;
          }
        }
        if (!finExtracted) {
          console.log('  ✗ No three consecutive 4-digit groups found');
        }
      }
    }
    
    // Strategy 4: Any 12-digit sequence
    if (!finExtracted) {
      console.log('\nStrategy 4: Looking for any 12-digit sequence...');
      const twelveDigitPattern = /\b(\d{12})\b/;
      const twelveDigitMatch = ocrText.match(twelveDigitPattern);
      
      if (twelveDigitMatch) {
        const digits = twelveDigitMatch[1];
        fin = `${digits.substring(0,4)} ${digits.substring(4,8)} ${digits.substring(8,12)}`;
        console.log('  ✓ FOUND:', fin);
        finExtracted = true;
      } else {
        console.log('  ✗ No 12-digit sequence found');
      }
    }
    
    console.log('\n=== FINAL RESULT ===');
    console.log('FIN Extracted:', finExtracted ? 'YES' : 'NO');
    console.log('FIN Value:', fin || 'EMPTY');
    console.log('Expected:', '4314 6981 6217 (or similar)');
    console.log('Status:', finExtracted ? '✓ SUCCESS' : '✗ FAILED');
    
    if (!finExtracted) {
      console.log('\n⚠️ DIAGNOSIS:');
      console.log('OCR failed to extract FIN. Possible reasons:');
      console.log('1. OCR text quality is poor');
      console.log('2. FIN is not visible in the image');
      console.log('3. Image preprocessing needs adjustment');
      console.log('4. OCR language/settings need tuning');
      console.log('\nCheck the OCR text above and preprocessed image.');
    }
    
  } catch (error) {
    console.error('Error:', error);
    console.error(error.stack);
  }
}

testFINExtraction();
