import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import Tesseract from 'tesseract.js';

async function compareResults() {
  console.log('=== Analyzing Result Images from Template Folder ===\n');
  
  const templateDir = path.join(__dirname, 'template');
  const resultImages = [
    'photo_2026-01-18_10-48-23.jpg',
    'photo_2026-01-18_10-48-33.jpg',
    'photo_2026-01-18_10-48-37.jpg',
    'photo_2026-01-18_10-48-40.jpg',
    'photo_2026-01-18_10-48-44.jpg'
  ];
  
  for (const imgFile of resultImages) {
    const imgPath = path.join(templateDir, imgFile);
    if (!fs.existsSync(imgPath)) continue;
    
    console.log(`\n--- ${imgFile} ---`);
    
    // Get image metadata
    const metadata = await sharp(imgPath).metadata();
    console.log(`Dimensions: ${metadata.width}x${metadata.height}`);
    console.log(`Format: ${metadata.format}`);
    
    // Perform OCR to extract text from the image
    console.log('Extracting text via OCR...');
    const { data: { text } } = await Tesseract.recognize(imgPath, 'eng+amh', {
      logger: m => {
        if (m.status === 'recognizing text') {
          process.stdout.write(`\rOCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    
    console.log('\n\nExtracted Text:');
    console.log('---');
    console.log(text);
    console.log('---');
    
    // Look for key fields
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    console.log('\nKey Fields Detected:');
    
    // Look for name
    const namePattern = /(?:ደገፍ|Degef|ወለደአብዝጊ|Weldeabzgi|ገብረወልድ|Gebreweld)/i;
    const nameLines = lines.filter(l => namePattern.test(l));
    if (nameLines.length > 0) {
      console.log('Name lines:', nameLines);
    }
    
    // Look for address
    const addressPattern = /(?:ትግራይ|Tigray|ማዕከላዊ|Central|ዞን|Zone|ቀይሕ|ተኽሊ|Qeyh|tekl)/i;
    const addressLines = lines.filter(l => addressPattern.test(l));
    if (addressLines.length > 0) {
      console.log('Address lines:', addressLines);
    }
    
    // Look for dates
    const datePattern = /\d{2,4}[\/\-]\d{1,2}[\/\-]\d{2,4}/;
    const dateLines = lines.filter(l => datePattern.test(l));
    if (dateLines.length > 0) {
      console.log('Date lines:', dateLines);
    }
    
    // Look for FCN/FIN
    const fcnPattern = /6143|6980|9418|9381/;
    const fcnLines = lines.filter(l => fcnPattern.test(l));
    if (fcnLines.length > 0) {
      console.log('FCN/FIN lines:', fcnLines);
    }
  }
  
  console.log('\n\n=== Comparison with Our Rendered Cards ===\n');
  
  const ourFront = path.join(__dirname, 'test-output', 'rendered-front.png');
  const ourBack = path.join(__dirname, 'test-output', 'rendered-back.png');
  
  if (fs.existsSync(ourFront)) {
    const metadata = await sharp(ourFront).metadata();
    console.log(`Our Front Card: ${metadata.width}x${metadata.height}`);
  }
  
  if (fs.existsSync(ourBack)) {
    const metadata = await sharp(ourBack).metadata();
    console.log(`Our Back Card: ${metadata.width}x${metadata.height}`);
  }
  
  console.log('\nPlease visually compare:');
  console.log('- template/*.jpg (result images)');
  console.log('- test-output/rendered-front.png (our front card)');
  console.log('- test-output/rendered-back.png (our back card)');
}

compareResults().catch(console.error);
