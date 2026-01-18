import fs from 'fs';
import path from 'path';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';

async function analyzeMahtotResult() {
  const resultPath = path.join(__dirname, 'template', 'mahtot.png');
  
  console.log('=== Analyzing Mahtot Result Image ===');
  console.log('File:', resultPath);
  
  // Get image metadata
  const metadata = await sharp(resultPath).metadata();
  console.log('\nImage Info:');
  console.log('- Dimensions:', `${metadata.width}x${metadata.height}`);
  console.log('- Format:', metadata.format);
  
  const aspectRatio = metadata.width! / metadata.height!;
  console.log('- Aspect Ratio:', aspectRatio.toFixed(2));
  
  if (aspectRatio > 1.5) {
    console.log('- Card Side: Likely FRONT or BACK (landscape)');
  } else if (aspectRatio < 0.8) {
    console.log('- Card Side: Likely BOTH cards stacked (portrait)');
  }
  
  // Run OCR
  console.log('\n=== Running OCR ===');
  const ocrResult = await Tesseract.recognize(resultPath, 'eng+amh', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        process.stdout.write(`\rOCR Progress: ${Math.round(m.progress * 100)}%`);
      }
    }
  });
  
  console.log('\n\n=== OCR Text ===');
  console.log(ocrResult.data.text);
  console.log('\n=== End OCR Text ===');
  
  // Save OCR text
  fs.writeFileSync('test-output/mahtot-result-ocr.txt', ocrResult.data.text);
  console.log('\nOCR text saved to test-output/mahtot-result-ocr.txt');
  
  const text = ocrResult.data.text;
  
  console.log('\n=== Extracted Information ===');
  
  // Look for name
  const amharicNameMatch = text.match(/ማህቶት[\s\u1200-\u137F]+/);
  if (amharicNameMatch) {
    console.log('Name (Amharic):', amharicNameMatch[0]);
  }
  
  // Look for woreda
  if (text.includes('ቐ') || text.includes('ወያነ') || text.includes('Kedamay') || text.includes('Weyane')) {
    console.log('Woreda: Found Kedamay Weyane');
    
    // Extract the full woreda text
    const woredaAmharicMatch = text.match(/ቐ[\/\u1200-\u137F\s]+ክ[\/\u1200-\u137F]+/);
    if (woredaAmharicMatch) {
      console.log('Woreda (Amharic):', woredaAmharicMatch[0]);
    }
    
    const woredaEnglishMatch = text.match(/Kedamay[\sA-Za-z]+/);
    if (woredaEnglishMatch) {
      console.log('Woreda (English):', woredaEnglishMatch[0]);
    }
  }
  
  // Look for FIN
  const finPattern = /\d{4}\s+\d{4}\s+\d{4}(?!\s+\d)/;
  const finMatch = text.match(finPattern);
  if (finMatch) {
    console.log('FIN:', finMatch[0]);
  }
  
  // Look for FCN (16 digits)
  const fcnPattern = /\d{4}\s+\d{4}\s+\d{4}\s+\d{4}/;
  const fcnMatch = text.match(fcnPattern);
  if (fcnMatch) {
    console.log('FCN:', fcnMatch[0]);
  }
  
  // Look for phone
  const phonePattern = /09\d{8}/;
  const phoneMatch = text.match(phonePattern);
  if (phoneMatch) {
    console.log('Phone:', phoneMatch[0]);
  }
  
  // Look for region
  if (text.includes('ትግራይ') || text.includes('Tigray')) {
    console.log('Region: ትግራይ / Tigray');
  }
  
  // Look for zone
  if (text.includes('መቐለ') || text.includes('Mekelle')) {
    console.log('Zone: መቐለ / Mekelle');
  }
  
  // Split image if it's portrait (both cards)
  if (aspectRatio < 0.8) {
    console.log('\n=== Splitting Image ===');
    const halfHeight = Math.floor(metadata.height! / 2);
    
    const topHalf = await sharp(resultPath)
      .extract({ left: 0, top: 0, width: metadata.width!, height: halfHeight })
      .toBuffer();
    fs.writeFileSync('test-output/mahtot-front.png', topHalf);
    console.log('Front card saved to test-output/mahtot-front.png');
    
    const bottomHalf = await sharp(resultPath)
      .extract({ left: 0, top: halfHeight, width: metadata.width!, height: halfHeight })
      .toBuffer();
    fs.writeFileSync('test-output/mahtot-back.png', bottomHalf);
    console.log('Back card saved to test-output/mahtot-back.png');
  }
}

analyzeMahtotResult().catch(console.error);
