import fs from 'fs';
import path from 'path';
import { pdfParser } from './src/services/pdf/parser';
import { CardRenderer } from './src/services/generator/cardRenderer';

async function testRenderCard() {
  const pdfPath = path.join(__dirname, 'template', 'efayda_Degef Weldeabzgi Gebreweld .pdf');
  
  console.log('Reading PDF:', pdfPath);
  const pdfBuffer = fs.readFileSync(pdfPath);
  
  console.log('\n=== Parsing PDF ===');
  const data = await pdfParser.parse(pdfBuffer);
  
  console.log('\n=== Extracted Data Summary ===');
  console.log('Name:', data.fullNameAmharic, '/', data.fullNameEnglish);
  console.log('Address:', data.regionAmharic, '/', data.zoneAmharic, '/', data.woredaAmharic);
  console.log('Expiry:', data.expiryDateEthiopian, '/', data.expiryDateGregorian);
  
  console.log('\n=== Rendering Cards ===');
  const renderer = new CardRenderer();
  
  // Render front card
  const frontBuffer = await renderer.renderFront(data, { variant: 'color' });
  fs.writeFileSync('test-output/rendered-front.png', frontBuffer);
  console.log('Front card saved to test-output/rendered-front.png');
  
  // Render back card
  const backBuffer = await renderer.renderBack(data, { variant: 'color' });
  fs.writeFileSync('test-output/rendered-back.png', backBuffer);
  console.log('Back card saved to test-output/rendered-back.png');
  
  console.log('\n=== Done ===');
  console.log('Check the rendered cards in test-output/ folder');
}

testRenderCard().catch(console.error);
