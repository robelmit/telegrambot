import fs from 'fs';
import path from 'path';
import Tesseract from 'tesseract.js';

async function analyzePdfImages() {
  const pdfPath = path.join(__dirname, 'template', 'efayda_Degef Weldeabzgi Gebreweld .pdf');
  const pdfBuffer = fs.readFileSync(pdfPath);
  
  console.log('=== Extracting Images from PDF ===');
  
  // Find JPEG images
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
  
  console.log(`Found ${images.length} images in PDF\n`);
  
  // Save all images
  for (let i = 0; i < images.length; i++) {
    const filename = `test-output/pdf-image-${i + 1}.jpg`;
    fs.writeFileSync(filename, images[i]);
    console.log(`Image ${i + 1}: ${images[i].length} bytes → ${filename}`);
  }
  
  // Analyze the last image (image 4 - back card)
  if (images.length >= 4) {
    console.log('\n=== Analyzing Image 4 (Back Card) for FIN ===');
    const backCardImage = images[3]; // Index 3 = Image 4
    
    console.log('Running OCR on back card image...');
    const ocrResult = await Tesseract.recognize(backCardImage, 'eng+amh', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          process.stdout.write(`\rOCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    
    console.log('\n\n=== OCR Text from Back Card (Image 4) ===');
    console.log(ocrResult.data.text);
    console.log('\n=== End OCR Text ===');
    
    // Save OCR text
    fs.writeFileSync('test-output/back-card-ocr.txt', ocrResult.data.text);
    console.log('\nOCR text saved to test-output/back-card-ocr.txt');
    
    const text = ocrResult.data.text;
    
    console.log('\n=== Extracting FIN from Back Card ===');
    
    // Look for FIN pattern (12 digits)
    const finPattern = /\d{4}\s+\d{4}\s+\d{4}(?!\s+\d)/;
    const finMatch = text.match(finPattern);
    if (finMatch) {
      console.log('FIN found:', finMatch[0]);
    } else {
      console.log('FIN not found with standard pattern, trying alternatives...');
      
      // Try without spaces
      const finNoSpacePattern = /\d{12}(?!\d)/;
      const finNoSpaceMatch = text.match(finNoSpacePattern);
      if (finNoSpaceMatch) {
        const digits = finNoSpaceMatch[0];
        const formatted = `${digits.substring(0,4)} ${digits.substring(4,8)} ${digits.substring(8,12)}`;
        console.log('FIN found (no spaces):', formatted);
      }
    }
    
    // Look for FCN pattern (16 digits)
    const fcnPattern = /\d{4}\s+\d{4}\s+\d{4}\s+\d{4}/;
    const fcnMatch = text.match(fcnPattern);
    if (fcnMatch) {
      console.log('FCN found:', fcnMatch[0]);
    }
    
    // Look for phone
    const phonePattern = /09\d{8}/;
    const phoneMatch = text.match(phonePattern);
    if (phoneMatch) {
      console.log('Phone found:', phoneMatch[0]);
    }
    
    // Look for region
    if (text.includes('ትግራይ') || text.includes('Tigray')) {
      console.log('Region: ትግራይ / Tigray');
    }
    
    // Look for woreda
    if (text.includes('ቀይሕ') || text.includes('Qeyh')) {
      console.log('Woreda: ቀይሕ ተኽሊ / Qeyh tekli');
    }
  }
  
  // Also check image 3 (front card with expiry)
  if (images.length >= 3) {
    console.log('\n=== Analyzing Image 3 (Front Card) ===');
    const frontCardImage = images[2]; // Index 2 = Image 3
    
    console.log('Running OCR on front card image...');
    const ocrResult = await Tesseract.recognize(frontCardImage, 'eng+amh', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          process.stdout.write(`\rOCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    
    console.log('\n\n=== OCR Text from Front Card (Image 3) ===');
    const text = ocrResult.data.text;
    console.log(text.substring(0, 500) + '...');
    
    // Look for FCN on front card
    const fcnPattern = /\d{4}\s+\d{4}\s+\d{4}\s+\d{4}/;
    const fcnMatch = text.match(fcnPattern);
    if (fcnMatch) {
      console.log('\nFCN found on front card:', fcnMatch[0]);
    }
  }
}

analyzePdfImages().catch(console.error);
