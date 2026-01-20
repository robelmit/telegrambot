const fs = require('fs');
const path = require('path');

// Use compiled production code from server folder
const { pdfParser } = require('./server/services/pdf/parser');
const { CardRenderer } = require('./server/services/generator/cardRenderer');
const { PDFGenerator } = require('./server/services/generator/pdfGenerator');
const sharp = require('sharp');

async function generateHgigatCard() {
  try {
    console.log('=== Generating Hgigat Aregawi Hagos ID Card (Production Code) ===\n');
    
    // Step 1: Parse PDF
    console.log('Step 1: Parsing PDF...');
    const pdfPath = 'template/efayda_Hgigat Aregawi Hagos.pdf';
    const buffer = fs.readFileSync(pdfPath);
    const data = await pdfParser.parse(buffer);
    
    console.log('\n--- Extracted Data ---');
    console.log('Name (Amharic):', data.fullNameAmharic);
    console.log('Name (English):', data.fullNameEnglish);
    console.log('DOB (Gregorian):', data.dateOfBirthGregorian);
    console.log('DOB (Ethiopian):', data.dateOfBirthEthiopian);
    console.log('Sex:', data.sex, '/', data.sexAmharic);
    console.log('Phone:', data.phoneNumber);
    console.log('Region:', data.regionAmharic, '/', data.region);
    console.log('Zone:', data.zoneAmharic, '/', data.city);
    console.log('Woreda:', data.woredaAmharic, '/', data.subcity);
    console.log('FCN:', data.fcn);
    console.log('FIN:', data.fin || 'EMPTY', data.fin ? '✓' : '✗ NOT EXTRACTED');
    console.log('Issue Date (Gregorian):', data.issueDate);
    console.log('Issue Date (Ethiopian):', data.issueDateEthiopian);
    console.log('Expiry Date (Gregorian):', data.expiryDateGregorian);
    console.log('Expiry Date (Ethiopian):', data.expiryDateEthiopian);
    
    // Step 2: Render cards
    console.log('\nStep 2: Rendering cards...');
    const renderer = new CardRenderer();
    
    const frontBuffer = await renderer.renderFront(data, { variant: 'color', template: 'template2' });
    const backBuffer = await renderer.renderBack(data, { variant: 'color', template: 'template2' });
    
    console.log('✓ Front card rendered');
    console.log('✓ Back card rendered');
    
    // Step 3: Combine cards side by side with bleed
    console.log('\nStep 3: Combining cards...');
    
    const CARD_WIDTH = 1024;
    const CARD_HEIGHT = 646;
    const BLEED = 35; // 35px bleed on all sides
    const GAP = 80; // 80px gap between cards
    const PADDING = 30; // 30px padding around
    
    const cardWithBleed = CARD_WIDTH + (BLEED * 2);
    const totalWidth = (cardWithBleed * 2) + GAP + (PADDING * 2);
    const totalHeight = CARD_HEIGHT + (BLEED * 2) + (PADDING * 2);
    
    // Create canvas with white background
    const combined = await sharp({
      create: {
        width: totalWidth,
        height: totalHeight,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .composite([
      {
        input: backBuffer,
        top: PADDING,
        left: PADDING
      },
      {
        input: frontBuffer,
        top: PADDING,
        left: PADDING + cardWithBleed + GAP
      }
    ])
    .png()
    .toBuffer();
    
    // Save combined image
    const outputPath = 'test-output/hgigat-production.png';
    fs.writeFileSync(outputPath, combined);
    console.log(`✓ Combined card saved: ${outputPath}`);
    
    // Step 4: Generate PDF
    console.log('\nStep 4: Generating PDF...');
    const pdfGen = new PDFGenerator();
    const outputPdfPath = 'test-output/hgigat-production.pdf';
    await pdfGen.generateA4PDFFromBuffer(combined, outputPdfPath, {
      title: 'Hgigat Aregawi Hagos - Ethiopian National ID Card'
    });
    console.log(`✓ PDF saved: ${outputPdfPath}`);
    
    console.log('\n=== GENERATION COMPLETE ===');
    console.log('\nFiles created:');
    console.log('- test-output/hgigat-production.png (card image)');
    console.log('- test-output/hgigat-production.pdf (printable PDF)');
    
    console.log('\n=== VERIFICATION ===');
    console.log('Check these values:');
    console.log('1. FIN should be from OCR (12 digits), NOT last 12 of FCN');
    console.log('   Expected: 4314 6981 6217 (or similar from OCR)');
    console.log('   Actual:', data.fin || 'EMPTY');
    console.log('   Status:', data.fin && data.fin !== '5981 5218 5068' ? '✓ CORRECT' : '✗ WRONG');
    
    console.log('\n2. Issue dates should be from OCR');
    console.log('   Ethiopian:', data.issueDateEthiopian);
    console.log('   Gregorian:', data.issueDate);
    
    // Save extracted data to JSON for inspection
    const dataPath = 'test-output/hgigat-data.json';
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    console.log(`\n✓ Extracted data saved: ${dataPath}`);
    
  } catch (error) {
    console.error('Error:', error);
    console.error(error.stack);
  }
}

generateHgigatCard();
