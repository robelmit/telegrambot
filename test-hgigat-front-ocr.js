const fs = require('fs');
const Tesseract = require('tesseract.js');

async function testFrontCardOCR() {
  try {
    console.log('=== Testing Front Card OCR for Issue Dates ===\n');
    
    const imagePath = 'test-output/hgigat-front-card.jpg';
    
    console.log('Running Tesseract OCR on front card (rotated 90°)...');
    
    // Test with rotation
    const sharp = require('sharp');
    const rotatedBuffer = await sharp(imagePath)
      .rotate(90)
      .toBuffer();
    
    fs.writeFileSync('test-output/hgigat-front-rotated.jpg', rotatedBuffer);
    
    const result = await Tesseract.recognize(rotatedBuffer, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text') {
          process.stdout.write(`\rProgress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    
    console.log('\n\n--- OCR TEXT (ROTATED) ---');
    console.log(result.data.text);
    
    console.log('\n--- ANALYSIS ---');
    
    const text = result.data.text;
    
    // Look for "issue" keyword
    const issueIndex = text.toLowerCase().indexOf('issue');
    if (issueIndex !== -1) {
      console.log('\nFound "issue" keyword at position', issueIndex);
      const context = text.substring(Math.max(0, issueIndex - 50), Math.min(text.length, issueIndex + 200));
      console.log('Context:', context);
    }
    
    // Look for all dates
    console.log('\n--- Looking for dates ---');
    const datePattern1 = /(\d{2}\/\d{2}\/\d{4})/g; // DD/MM/YYYY
    const datePattern2 = /(\d{4}\/\d{2}\/\d{2})/g; // YYYY/MM/DD
    const datePattern3 = /(\d{4}\/[A-Za-z]{3}\/\d{2})/g; // YYYY/Mon/DD
    const datePattern4 = /(\d{2})\s+(\d{2}\/\d{1,2}\/\d{1,2})/g; // Split year
    
    const dates1 = [...text.matchAll(datePattern1)];
    const dates2 = [...text.matchAll(datePattern2)];
    const dates3 = [...text.matchAll(datePattern3)];
    const dates4 = [...text.matchAll(datePattern4)];
    
    console.log('DD/MM/YYYY dates:', dates1.map(m => m[1]));
    console.log('YYYY/MM/DD dates:', dates2.map(m => m[1]));
    console.log('YYYY/Mon/DD dates:', dates3.map(m => m[1]));
    console.log('Split year dates:', dates4.map(m => m[1] + m[2]));
    
    console.log('\n--- EXPECTED ---');
    console.log('Issue Date Ethiopian: Should be YYYY/MM/DD format (e.g., 2018/05/03)');
    console.log('Issue Date Gregorian: Should be YYYY/Mon/DD format (e.g., 2026/Jan/11)');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testFrontCardOCR();
