import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import Tesseract from 'tesseract.js';

async function analyzeResultImage() {
  const resultPath = path.join(__dirname, 'template', 'result.jpg');
  
  console.log('=== Analyzing Result Image ===');
  console.log('File:', resultPath);
  
  // Get image metadata
  const metadata = await sharp(resultPath).metadata();
  console.log('\nImage Info:');
  console.log('- Dimensions:', `${metadata.width}x${metadata.height}`);
  console.log('- Format:', metadata.format);
  console.log('- Size:', fs.statSync(resultPath).size, 'bytes');
  
  // Check if it's front or back card based on dimensions
  const aspectRatio = metadata.width! / metadata.height!;
  console.log('- Aspect Ratio:', aspectRatio.toFixed(2));
  
  if (aspectRatio > 1.5) {
    console.log('- Card Side: Likely FRONT or BACK (landscape)');
  } else {
    console.log('- Card Side: Unknown orientation');
  }
  
  // Extract text using OCR to see what data is on the card
  console.log('\n=== Running OCR on Result Image ===');
  console.log('This may take a moment...\n');
  
  const ocrResult = await Tesseract.recognize(resultPath, 'eng+amh', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        process.stdout.write(`\rOCR Progress: ${Math.round(m.progress * 100)}%`);
      }
    }
  });
  
  console.log('\n\n=== OCR Text from Result Image ===');
  console.log(ocrResult.data.text);
  console.log('\n=== End OCR Text ===');
  
  // Save OCR text to file
  fs.writeFileSync('test-output/result-ocr.txt', ocrResult.data.text);
  console.log('\nOCR text saved to test-output/result-ocr.txt');
  
  // Try to extract key information
  const text = ocrResult.data.text;
  
  console.log('\n=== Extracted Information ===');
  
  // Look for name
  const nameMatch = text.match(/ደገፍ[\s\u1200-\u137F]+/);
  if (nameMatch) {
    console.log('Name (Amharic):', nameMatch[0]);
  }
  
  const englishNameMatch = text.match(/Degef[\sA-Za-z]+/);
  if (englishNameMatch) {
    console.log('Name (English):', englishNameMatch[0]);
  }
  
  // Look for address
  if (text.includes('ትግራይ') || text.includes('Tigray')) {
    console.log('Region: Found Tigray');
  }
  
  if (text.includes('ማዕከላዊ') || text.includes('Central')) {
    console.log('Zone: Found Central Zone');
  }
  
  if (text.includes('ቀይሕ') || text.includes('Qeyh')) {
    console.log('Woreda: Found Qeyh tekli');
  }
  
  // Look for dates
  const datePattern = /\d{4}\/\d{2}\/\d{2}|\d{2}\/\d{2}\/\d{4}/g;
  const dates = text.match(datePattern);
  if (dates) {
    console.log('Dates found:', dates);
  }
  
  // Look for FCN
  const fcnPattern = /6143[\s\d]+/;
  const fcnMatch = text.match(fcnPattern);
  if (fcnMatch) {
    console.log('FCN:', fcnMatch[0]);
  }
}

analyzeResultImage().catch(console.error);
