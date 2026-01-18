import fs from 'fs';
import Tesseract from 'tesseract.js';

async function detailedComparison() {
  console.log('=== Detailed Text Comparison ===\n');
  
  const topHalfPath = 'test-output/result-top-half.jpg';
  const bottomHalfPath = 'test-output/result-bottom-half.jpg';
  
  console.log('Analyzing top half (likely FRONT card)...');
  const topOCR = await Tesseract.recognize(topHalfPath, 'eng+amh', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        process.stdout.write(`\rTop OCR: ${Math.round(m.progress * 100)}%`);
      }
    }
  });
  console.log('\n');
  
  console.log('Analyzing bottom half (likely BACK card)...');
  const bottomOCR = await Tesseract.recognize(bottomHalfPath, 'eng+amh', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        process.stdout.write(`\rBottom OCR: ${Math.round(m.progress * 100)}%`);
      }
    }
  });
  console.log('\n');
  
  const topText = topOCR.data.text;
  const bottomText = bottomOCR.data.text;
  
  console.log('=== TOP HALF (Front Card) ===');
  console.log(topText);
  console.log('\n=== BOTTOM HALF (Back Card) ===');
  console.log(bottomText);
  
  // Save to files
  fs.writeFileSync('test-output/result-front-ocr.txt', topText);
  fs.writeFileSync('test-output/result-back-ocr.txt', bottomText);
  
  console.log('\n=== Extracted Data from Result Image ===\n');
  
  // Extract key fields from FRONT card
  console.log('FRONT CARD:');
  
  // Name
  const amharicNameMatch = topText.match(/ደገፍ[\s\u1200-\u137F]+/);
  if (amharicNameMatch) {
    console.log('  Name (Amharic):', amharicNameMatch[0].trim());
  }
  
  const englishNameMatch = topText.match(/Degef[\sA-Za-z]+/);
  if (englishNameMatch) {
    console.log('  Name (English):', englishNameMatch[0].trim());
  }
  
  // DOB
  const dobPattern = /\d{2}\/\d{2}\/\d{4}/g;
  const dobs = topText.match(dobPattern);
  if (dobs && dobs.length > 0) {
    console.log('  DOB (Gregorian):', dobs[0]);
  }
  
  const ethDobPattern = /\d{4}\/\d{2}\/\d{2}/g;
  const ethDobs = topText.match(ethDobPattern);
  if (ethDobs && ethDobs.length > 0) {
    console.log('  DOB (Ethiopian):', ethDobs[0]);
  }
  
  // Sex
  if (topText.includes('ወንድ') || topText.includes('Male')) {
    console.log('  Sex: Male / ወንድ');
  } else if (topText.includes('ሴት') || topText.includes('Female')) {
    console.log('  Sex: Female / ሴት');
  }
  
  // Expiry
  if (dobs && dobs.length > 1) {
    console.log('  Expiry (Gregorian):', dobs[1]);
  }
  if (ethDobs && ethDobs.length > 1) {
    console.log('  Expiry (Ethiopian):', ethDobs[1]);
  }
  
  // FCN
  const fcnPattern = /6143[\s\d]+/;
  const fcnMatch = topText.match(fcnPattern);
  if (fcnMatch) {
    console.log('  FCN:', fcnMatch[0].replace(/\s+/g, ' ').trim());
  }
  
  console.log('\nBACK CARD:');
  
  // Phone
  const phonePattern = /09\d{8}/;
  const phoneMatch = bottomText.match(phonePattern);
  if (phoneMatch) {
    console.log('  Phone:', phoneMatch[0]);
  }
  
  // Region
  if (bottomText.includes('ትግራይ') || bottomText.includes('Tigray')) {
    console.log('  Region: ትግራይ / Tigray');
  } else if (bottomText.includes('አዲስ') || bottomText.includes('Addis')) {
    console.log('  Region: አዲስ አበባ / Addis Ababa');
  }
  
  // Zone
  if (bottomText.includes('ማዕከላዊ') || bottomText.includes('Central')) {
    console.log('  Zone: ማዕከላዊ ዞን / Central Zone');
  }
  
  // Woreda
  if (bottomText.includes('ቀይሕ') || bottomText.includes('Qeyh')) {
    console.log('  Woreda: ቀይሕ ተኽሊ / Qeyh tekli');
  }
  
  // FIN
  const finPattern = /\d{4}\s+\d{4}\s+\d{4}(?!\s+\d)/;
  const finMatch = bottomText.match(finPattern);
  if (finMatch) {
    console.log('  FIN:', finMatch[0]);
  }
  
  console.log('\n=== Expected Data (from our parser) ===\n');
  console.log('FRONT CARD:');
  console.log('  Name (Amharic): ደገፍ ወለደአብዝጊ ገብረወልድ');
  console.log('  Name (English): Degef Weldeabzgi Gebreweld');
  console.log('  DOB (Gregorian): 10/10/1992');
  console.log('  DOB (Ethiopian): 2000/06/17');
  console.log('  Sex: Male / ወንድ');
  console.log('  Expiry (Gregorian): 2026/05/08');
  console.log('  Expiry (Ethiopian): 2034/01/16');
  console.log('  FCN: 6143 6980 9418 9381');
  
  console.log('\nBACK CARD:');
  console.log('  Phone: 0900193994');
  console.log('  Region: ትግራይ / Tigray');
  console.log('  Zone: ማዕከላዊ ዞን / Central Zone');
  console.log('  Woreda: ቀይሕ ተኽሊ / Qeyh tekli');
  console.log('  FIN: 6980 9418 9381');
  
  console.log('\n=== Comparison Summary ===');
  console.log('\nPlease manually compare the extracted data above.');
  console.log('Check the comparison images in test-output/ folder:');
  console.log('  - comparison-front.jpg (Left: Result | Right: Our Render)');
  console.log('  - comparison-back.jpg (Left: Result | Right: Our Render)');
}

detailedComparison().catch(console.error);
