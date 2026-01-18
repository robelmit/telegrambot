import fs from 'fs';
import { CardRenderer } from './src/services/generator/cardRenderer';
import { EfaydaData } from './src/types';

async function testMahtotRender() {
  console.log('=== Testing Mahtot Card Rendering ===\n');
  
  // Based on the OCR we did earlier from mahtot.png, here's the correct data:
  const data: EfaydaData = {
    fullNameAmharic: 'ማህቶት ፀሃየ ኩራባቸው',
    fullNameEnglish: 'Mahtot Tsehaye Kurabachew',
    dateOfBirthEthiopian: '1998/06/15',
    dateOfBirthGregorian: '08/10/1990',
    sex: 'Male',
    sexAmharic: 'ወንድ',
    nationality: 'Ethiopian',
    phoneNumber: '0943671740',
    region: 'Tigray',
    city: 'Mekelle',
    subcity: 'Weyane Sub City',
    regionAmharic: 'ትግራይ',
    zoneAmharic: 'መቐለ',
    woredaAmharic: 'ወያነ ክ/ከተማ',
    fcn: '5795 4976 0359 1430',
    fin: '4976 0359 1430',
    fan: '5795 4976 0359 1430',
    serialNumber: '58919631',
    issueDate: '2026/01/18',
    issueDateEthiopian: '2018/01/18',
    expiryDate: '2026/05/08',
    expiryDateGregorian: '2026/05/08',
    expiryDateEthiopian: '2034/01/16',
    // No photo available from mahtot.pdf
    photo: undefined,
    qrCode: undefined,
    barcode: undefined
  };
  
  console.log('=== Data to Render ===');
  console.log('Name:', data.fullNameAmharic, '/', data.fullNameEnglish);
  console.log('DOB:', data.dateOfBirthGregorian, '/', data.dateOfBirthEthiopian);
  console.log('Sex:', data.sex, '/', data.sexAmharic);
  console.log('Phone:', data.phoneNumber);
  console.log('Address:', data.regionAmharic, '/', data.zoneAmharic, '/', data.woredaAmharic);
  console.log('FCN:', data.fcn);
  console.log('FIN:', data.fin);
  console.log('Expiry:', data.expiryDateGregorian, '/', data.expiryDateEthiopian);
  
  console.log('\n=== Rendering Cards with Template 3 ===');
  const renderer = new CardRenderer();
  
  // Render front card
  console.log('Rendering front card...');
  const frontRendered = await renderer.renderFront(data, { variant: 'color', template: 'template2' });
  fs.writeFileSync('test-output/mahtot-test-front.png', frontRendered);
  console.log('✓ Front card: test-output/mahtot-test-front.png');
  
  // Render back card
  console.log('Rendering back card...');
  const backRendered = await renderer.renderBack(data, { variant: 'color', template: 'template2' });
  fs.writeFileSync('test-output/mahtot-test-back.png', backRendered);
  console.log('✓ Back card: test-output/mahtot-test-back.png');
  
  // Create side-by-side comparison
  console.log('Creating combined image...');
  const sharp = require('sharp');
  const frontMeta = await sharp(frontRendered).metadata();
  const backMeta = await sharp(backRendered).metadata();
  
  const combined = await sharp({
    create: {
      width: frontMeta.width + backMeta.width,
      height: Math.max(frontMeta.height, backMeta.height),
      channels: 3,
      background: { r: 255, g: 255, b: 255 }
    }
  })
  .composite([
    { input: frontRendered, left: 0, top: 0 },
    { input: backRendered, left: frontMeta.width, top: 0 }
  ])
  .png()
  .toBuffer();
  
  fs.writeFileSync('test-output/mahtot-test-combined.png', combined);
  console.log('✓ Combined: test-output/mahtot-test-combined.png');
  
  console.log('\n=== Verification ===');
  console.log('Check these fields on the rendered cards:');
  console.log('');
  console.log('FRONT CARD:');
  console.log('  ✓ Name (Amharic): ማህቶት ፀሃየ ኩራባቸው');
  console.log('  ✓ Name (English): Mahtot Tsehaye Kurabachew');
  console.log('  ✓ DOB: 08/10/1990 | 1998/06/15');
  console.log('  ✓ Sex: ወንድ | Male');
  console.log('  ✓ Expiry: 2026/05/08 | 2034/01/16');
  console.log('  ✓ FCN: 5795 4976 0359 1430');
  console.log('');
  console.log('BACK CARD:');
  console.log('  ✓ Phone: 0943671740');
  console.log('  ✓ Region: ትግራይ / Tigray');
  console.log('  ✓ Zone: መቐለ / Mekelle');
  console.log('  ✓ Woreda: ወያነ ክ/ከተማ / Weyane Sub City');
  console.log('  ✓ FIN: 4976 0359 1430 ← Should be DIFFERENT from last 12 of FCN!');
  console.log('');
  console.log('=== Done ===');
}

testMahtotRender().catch(console.error);
