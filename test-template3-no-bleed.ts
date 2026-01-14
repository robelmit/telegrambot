/**
 * Test Template 3 WITHOUT bleed - for comparison
 */
import { CardRenderer } from './src/services/generator/cardRenderer';
import { EfaydaData } from './src/types';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

// Sample data for Template 3
const mockData: EfaydaData = {
  fullNameAmharic: 'ፀጋ ገብረስላሴ ገብረሂወት',
  fullNameEnglish: 'Tsega Gebreslasie Gebrehiwot',
  dateOfBirthEthiopian: '1981/Apr/29',
  dateOfBirthGregorian: '21/08/1973',
  sex: 'Female',
  sexAmharic: 'ሴት',
  phoneNumber: '0913687923',
  nationality: 'Ethiopian',
  region: 'Tigray',
  regionAmharic: 'ትግራይ',
  city: 'Mekelle',
  zoneAmharic: 'መቐለ',
  subcity: 'Hadnet Sub City',
  woredaAmharic: 'ሓድነት ክ/ከተማ',
  fcn: '3092 7187 9089 3152',
  fin: '4189 2798 1057',
  fan: '3092 7187 9089 3152',
  serialNumber: '5479474',
  expiryDate: '2033/Dec/10',
  expiryDateGregorian: '2033/Dec/10',
  expiryDateEthiopian: '2026/04/01',
  issueDate: '2025/Dec/10',
  issueDateEthiopian: '2018/04/01'
};

async function testNoBleed() {
  console.log('🧪 Testing Template 3 WITHOUT bleed (for comparison)...\n');
  
  const outputDir = 'test-output';
  await fs.mkdir(outputDir, { recursive: true });
  
  const renderer = new CardRenderer();
  
  // Render front and back with template2 (Template 3)
  console.log('📐 Rendering cards without bleed...');
  const front = await renderer.renderFront(mockData, { variant: 'color', template: 'template2' });
  const back = await renderer.renderBack(mockData, { variant: 'color', template: 'template2' });
  
  // Save individual cards
  await fs.writeFile(path.join(outputDir, 'template3_front_no_bleed.png'), front);
  await fs.writeFile(path.join(outputDir, 'template3_back_no_bleed.png'), back);
  console.log('✅ Saved individual front and back cards');
  
  // Combine without bleed (original method)
  const width = 1024;
  const height = 646;
  const gap = 80;
  const padding = 30;
  const totalWidth = width * 2 + gap + (padding * 2);
  const totalHeight = height + (padding * 2);
  
  const canvas = await sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();
  
  const combined = await sharp(canvas)
    .composite([
      { input: back, left: padding, top: padding },
      { input: front, left: padding + width + gap, top: padding }
    ])
    .png()
    .toBuffer();
  
  await fs.writeFile(path.join(outputDir, 'template3_combined_no_bleed.png'), combined);
  console.log('✅ Saved: template3_combined_no_bleed.png');
  
  const metadata = await sharp(combined).metadata();
  console.log(`\n📏 Dimensions: ${metadata.width} x ${metadata.height}px (no bleed)`);
  
  console.log('\n🎉 Compare with template3_bleed_normal.png to see the difference');
}

testNoBleed().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
