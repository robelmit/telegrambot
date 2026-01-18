import fs from 'fs';
import path from 'path';

async function extractMahtotImages() {
  const pdfPath = path.join(__dirname, 'template', 'mahtot.pdf');
  const pdfBuffer = fs.readFileSync(pdfPath);
  
  console.log('=== Extracting Images from Mahtot PDF ===');
  console.log('PDF size:', pdfBuffer.length, 'bytes');
  
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
      console.log(`Found image ${images.length}: ${imageBuffer.length} bytes`);
    }
    startIndex = end + 2;
  }
  
  console.log(`\nTotal images found: ${images.length}`);
  
  // Save all images
  for (let i = 0; i < images.length; i++) {
    const filename = `test-output/mahtot-pdf-image-${i + 1}.jpg`;
    fs.writeFileSync(filename, images[i]);
    console.log(`Saved: ${filename}`);
  }
  
  // If we found images, analyze the last one (back card data)
  if (images.length > 0) {
    console.log('\n=== Analyzing Last Image (Back Card Data) ===');
    const lastImage = images[images.length - 1];
    
    // Run OCR on the last image
    const Tesseract = require('tesseract.js');
    const ocrResult = await Tesseract.recognize(lastImage, 'eng+amh', {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          process.stdout.write(`\rOCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    
    console.log('\n\nOCR Text from Last Image:');
    console.log(ocrResult.data.text);
    
    fs.writeFileSync('test-output/mahtot-last-image-ocr.txt', ocrResult.data.text);
    console.log('\nOCR text saved to test-output/mahtot-last-image-ocr.txt');
    
    const text = ocrResult.data.text;
    
    // Extract FIN
    const finPattern = /\d{4}\s+\d{4}\s+\d{4}(?!\s+\d)/;
    const finMatch = text.match(finPattern);
    if (finMatch) {
      console.log('\nExtracted FIN:', finMatch[0]);
    }
    
    // Extract woreda
    if (text.includes('ወያነ') || text.includes('Weyane')) {
      console.log('Found Woreda: Weyane');
      
      const woredaAmharicMatch = text.match(/[\u1200-\u137F]+\s*ክ\/ከተማ/);
      if (woredaAmharicMatch) {
        console.log('Woreda (Amharic):', woredaAmharicMatch[0]);
      }
      
      const woredaEnglishMatch = text.match(/[A-Za-z]+\s+Sub\s+City/i);
      if (woredaEnglishMatch) {
        console.log('Woreda (English):', woredaEnglishMatch[0]);
      }
    }
  }
}

extractMahtotImages().catch(console.error);
