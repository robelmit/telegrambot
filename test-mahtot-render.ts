/**
 * Test rendering with Mahtot data to verify FIN and address extraction
 */
import fs from 'fs';
import { pdfParser } from './src/services/pdf/parser';
import { CardRenderer } from './src/services/generator/cardRenderer';

async function testMahtotRender() {
  console.log('=== Testing Mahtot Card Rendering ===\n');

  const pdfPath = './template/efayda_Mahtot Tsehaye Kurabachew.pdf';
  const pdfBuffer = fs.readFileSync(pdfPath);

  console.log('Parsing PDF...');
  const data = await pdfParser.parse(pdfBuffer);

  console.log('\n📋 Extracted Data for Rendering:');
  console.log('─'.repeat(60));
  console.log(`Name: ${data.fullNameAmharic} / ${data.fullNameEnglish}`);
  console.log(`Phone: ${data.phoneNumber}`);
  console.log(`Address: ${data.regionAmharic} / ${data.zoneAmharic} / ${data.woredaAmharic}`);
  console.log(`FCN: ${data.fcn}`);
  console.log(`FIN: ${data.fin}`);
  console.log(`Expiry: ${data.expiryDateEthiopian} (Ethiopian) / ${data.expiryDateGregorian} (Gregorian)`);

  console.log('\n🎨 Rendering card with Template 3...');
  const renderer = new CardRenderer();
  
  const frontCard = await renderer.renderFront(data, { template: 'template2', variant: 'color' });
  const backCard = await renderer.renderBack(data, { template: 'template2', variant: 'color' });

  console.log(`\n✅ Card rendered successfully!`);
  console.log(`Front card: ${frontCard.length} bytes`);
  console.log(`Back card: ${backCard.length} bytes`);

  // Save output
  fs.writeFileSync('./test-output/mahtot-test-front.png', frontCard);
  fs.writeFileSync('./test-output/mahtot-test-back.png', backCard);

  console.log('\n💾 Saved to:');
  console.log('  - test-output/mahtot-test-front.png');
  console.log('  - test-output/mahtot-test-back.png');

  console.log('\n✅ Test complete! Please verify:');
  console.log('  1. FIN on back card should be: 4976 0359 1430');
  console.log('  2. Address should be: ትግራይ / መቐለ / ቐ/ወያነ ክ/ከተማ');
  console.log('  3. Phone should be: 0943671740');
  console.log('  4. Woreda with special characters (ቐ, /) renders correctly');
}

testMahtotRender().catch(console.error);
