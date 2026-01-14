/**
 * Test script to render Template 3 cards WITHOUT bleed (like watcher)
 * This helps compare cardRenderer output with watcher output
 */
import { CardRenderer } from './src/services/generator/cardRenderer';
import { EfaydaData } from './src/types';
import fs from 'fs/promises';
import path from 'path';

// Same mock data as watcher
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
  expiryDate: '2026/04/01',
  expiryDateGregorian: '2026/04/01',
  expiryDateEthiopian: '2033/Dec/10',
  issueDate: '2025/Dec/10',
  issueDateEthiopian: '2018/04/01'
};

async function testTemplate3NoBleed() {
  console.log('🧪 Testing Template 3 rendering (no bleed, like watcher)...\n');
  
  const outputDir = 'test-output';
  await fs.mkdir(outputDir, { recursive: true });
  
  const renderer = new CardRenderer();
  
  console.log('📐 Rendering Template 3 front card...');
  const frontBuffer = await renderer.renderFront(mockData, { variant: 'color', template: 'template2' });
  
  console.log('📐 Rendering Template 3 back card...');
  const backBuffer = await renderer.renderBack(mockData, { variant: 'color', template: 'template2' });
  
  // Save individual cards (same format as watcher)
  const frontPath = path.join(outputDir, 'template3_front_no_bleed.png');
  const backPath = path.join(outputDir, 'template3_back_no_bleed.png');
  
  await fs.writeFile(frontPath, frontBuffer);
  console.log(`✅ Saved: ${frontPath}`);
  
  await fs.writeFile(backPath, backBuffer);
  console.log(`✅ Saved: ${backPath}`);
  
  // Also create combined without bleed for comparison
  const sharp = (await import('sharp')).default;
  const gap = 80;
  const padding = 30;
  
  const frontMeta = await sharp(frontBuffer).metadata();
  const width = frontMeta.width || 1024;
  const height = frontMeta.height || 646;
  
  const totalWidth = width * 2 + gap + padding * 2;
  const totalHeight = height + padding * 2;
  
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
      { input: backBuffer, left: padding, top: padding },
      { input: frontBuffer, left: padding + width + gap, top: padding }
    ])
    .png()
    .toBuffer();
  
  const combinedPath = path.join(outputDir, 'template3_combined_no_bleed.png');
  await fs.writeFile(combinedPath, combined);
  console.log(`✅ Saved: ${combinedPath}`);
  
  console.log('\n📏 Card dimensions:');
  console.log(`   Width: ${width}px`);
  console.log(`   Height: ${height}px`);
  
  console.log('\n🎉 Test complete!');
  console.log('   Compare template3_front_no_bleed.png with front3_color.png (watcher)');
  console.log('   They should be identical if cardRenderer matches watcher');
}

testTemplate3NoBleed().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
