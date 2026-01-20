const fs = require('fs');
const Tesseract = require('tesseract.js');

async function testBackCardOCR() {
  try {
    console.log('=== Testing Back Card OCR for FIN ===\n');
    
    const imagePath = 'test-output/hgigat-back-card.jpg';
    
    console.log('Running Tesseract OCR on back card...');
    const result = await Tesseract.recognize(imagePath, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text') {
          process.stdout.write(`\rProgress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    
    console.log('\n\n--- OCR TEXT ---');
    console.log(result.data.text);
    
    console.log('\n--- ANALYSIS ---');
    
    // Look for FIN patterns
    const text = result.data.text;
    
    // Strategy 1: Look for "FIN" keyword
    const finKeywordPattern = /FIN[:\s]*(\d{4}\s+\d{4}\s+\d{4})/i;
    const finKeywordMatch = text.match(finKeywordPattern);
    console.log('FIN with keyword:', finKeywordMatch ? finKeywordMatch[1] : 'NOT FOUND');
    
    // Strategy 2: Find all 12-digit patterns
    const allTwelveDigitPatterns = text.match(/(\d{4}\s+\d{4}\s+\d{4})(?!\s+\d)/g);
    console.log('All 12-digit patterns:', allTwelveDigitPatterns);
    
    // Strategy 3: Find three consecutive 4-digit groups
    const allDigits = text.match(/\d+/g);
    console.log('\nAll digit groups:', allDigits);
    
    if (allDigits) {
      console.log('\nLooking for three consecutive 4-digit groups...');
      for (let i = 0; i < allDigits.length - 2; i++) {
        if (allDigits[i].length === 4 && allDigits[i+1].length === 4 && allDigits[i+2].length === 4) {
          const fin = `${allDigits[i]} ${allDigits[i+1]} ${allDigits[i+2]}`;
          console.log(`Found at position ${i}: ${fin}`);
        }
      }
    }
    
    console.log('\n--- EXPECTED ---');
    console.log('FCN: 6413 5981 5218 5068 (16 digits)');
    console.log('FIN: Should be different from FCN (12 digits)');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testBackCardOCR();
