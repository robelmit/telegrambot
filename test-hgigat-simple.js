const fs = require('fs');
const pdfParse = require('pdf-parse');

async function testHgigatPDF() {
  try {
    console.log('=== Testing Hgigat Aregawi Hagos PDF ===\n');
    
    const pdfPath = 'template/efayda_Hgigat Aregawi Hagos.pdf';
    const buffer = fs.readFileSync(pdfPath);
    
    // Extract text from PDF
    const data = await pdfParse(buffer);
    const text = data.text;
    
    console.log('--- RAW PDF TEXT (first 2000 chars) ---');
    console.log(text.substring(0, 2000));
    console.log('\n--- ANALYSIS ---\n');
    
    // Extract FCN
    const fcnPattern = /(\d{4}\s+\d{4}\s+\d{4}\s+\d{4})/;
    const fcnMatch = text.match(fcnPattern);
    console.log('FCN (16 digits):', fcnMatch ? fcnMatch[1] : 'NOT FOUND');
    
    // Look for FIN patterns
    console.log('\n--- Looking for FIN patterns ---');
    const allTwelveDigitPatterns = text.match(/(\d{4}\s+\d{4}\s+\d{4})(?!\s+\d)/g);
    console.log('All 12-digit patterns found:', allTwelveDigitPatterns);
    
    // Look for FIN keyword
    const finKeywordPattern = /FIN[:\s]*(\d{4}\s+\d{4}\s+\d{4})/i;
    const finKeywordMatch = text.match(finKeywordPattern);
    console.log('FIN with keyword:', finKeywordMatch ? finKeywordMatch[1] : 'NOT FOUND');
    
    // Extract all dates
    console.log('\n--- Looking for dates ---');
    const datePattern1 = /(\d{2}\/\d{2}\/\d{4})/g; // DD/MM/YYYY
    const datePattern2 = /(\d{4}\/\d{2}\/\d{2})/g; // YYYY/MM/DD
    const datePattern3 = /(\d{4}\/[A-Za-z]{3}\/\d{2})/g; // YYYY/Mon/DD
    
    const dates1 = [...text.matchAll(datePattern1)];
    const dates2 = [...text.matchAll(datePattern2)];
    const dates3 = [...text.matchAll(datePattern3)];
    
    console.log('DD/MM/YYYY dates:', dates1.map(m => m[1]));
    console.log('YYYY/MM/DD dates:', dates2.map(m => m[1]));
    console.log('YYYY/Mon/DD dates:', dates3.map(m => m[1]));
    
    // Look for issue date context
    console.log('\n--- Looking for Issue Date context ---');
    const issueIndex = text.toLowerCase().indexOf('issue');
    if (issueIndex !== -1) {
      const contextBefore = text.substring(Math.max(0, issueIndex - 50), issueIndex);
      const contextAfter = text.substring(issueIndex, Math.min(text.length, issueIndex + 200));
      console.log('Context around "issue":');
      console.log(contextBefore + '<<<ISSUE>>>' + contextAfter);
    }
    
    // Extract images
    console.log('\n--- Extracting images ---');
    const jpegStart = Buffer.from([0xFF, 0xD8, 0xFF]);
    const jpegEnd = Buffer.from([0xFF, 0xD9]);
    
    const images = [];
    let startIndex = 0;
    
    while (startIndex < buffer.length) {
      const start = buffer.indexOf(jpegStart, startIndex);
      if (start === -1) break;
      
      const end = buffer.indexOf(jpegEnd, start + 3);
      if (end === -1) break;
      
      const imageBuffer = buffer.slice(start, end + 2);
      if (imageBuffer.length > 500) {
        images.push(imageBuffer);
      }
      startIndex = end + 2;
    }
    
    console.log(`\nFound ${images.length} images in PDF`);
    images.forEach((img, i) => {
      console.log(`Image ${i+1}: ${img.length} bytes`);
    });
    
    // Save image 4 (back card) for inspection
    if (!fs.existsSync('test-output')) {
      fs.mkdirSync('test-output');
    }
    
    if (images.length >= 4) {
      fs.writeFileSync('test-output/hgigat-back-card.jpg', images[3]);
      console.log('\n✓ Saved back card image (image 4) to test-output/hgigat-back-card.jpg');
    }
    
    if (images.length >= 3) {
      fs.writeFileSync('test-output/hgigat-front-card.jpg', images[2]);
      console.log('✓ Saved front card image (image 3) to test-output/hgigat-front-card.jpg');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testHgigatPDF();
