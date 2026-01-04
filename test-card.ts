import { CardRenderer } from './src/services/generator/cardRenderer';
import { pdfParser } from './src/services/pdf/parser';
import fs from 'fs/promises';

async function testCardRendering() {
  console.log('📄 Reading fayda.pdf...');
  
  // Read the PDF file
  const pdfBuffer = await fs.readFile('fayda.pdf');
  
  // Extract text to see what's in the PDF
  const text = await pdfParser.extractText(pdfBuffer);
  console.log('\n📝 Extracted text from PDF:');
  console.log('─'.repeat(50));
  console.log(text);
  console.log('─'.repeat(50));
  
  // Parse the PDF to extract structured data
  console.log('\n🔍 Parsing eFayda data...');
  const efaydaData = await pdfParser.parse(pdfBuffer);
  
  console.log('\n📋 Extracted Data:');
  console.log(JSON.stringify(efaydaData, null, 2));
  
  // Render the ID card
  const renderer = new CardRenderer();
  
  console.log('\n🎨 Rendering front card (color)...');
  const colorFront = await renderer.renderFront(efaydaData, { variant: 'color' });
  await fs.writeFile('test_front_color.png', colorFront);
  console.log('✅ Saved: test_front_color.png');

  console.log('🎨 Rendering front card (grayscale)...');
  const grayscaleFront = await renderer.renderFront(efaydaData, { variant: 'grayscale' });
  await fs.writeFile('test_front_grayscale.png', grayscaleFront);
  console.log('✅ Saved: test_front_grayscale.png');

  console.log('🎨 Rendering back card (color)...');
  const colorBack = await renderer.renderBack(efaydaData, { variant: 'color' });
  await fs.writeFile('test_back_color.png', colorBack);
  console.log('✅ Saved: test_back_color.png');

  console.log('\n🎉 Test complete! Check the generated PNG files.');
}

testCardRendering().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
