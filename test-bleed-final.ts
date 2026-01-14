/**
 * Final bleed test - uses same rendered cards for both versions
 */
import { CardRenderer } from './src/services/generator/cardRenderer';
import { EfaydaData } from './src/types';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

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

async function test() {
  console.log('🧪 Testing bleed with same source cards...\n');
  
  const outputDir = 'test-output';
  await fs.mkdir(outputDir, { recursive: true });
  
  const renderer = new CardRenderer();
  
  // Render cards ONCE
  console.log('📐 Rendering cards...');
  const front = await renderer.renderFront(mockData, { variant: 'color', template: 'template2' });
  const back = await renderer.renderBack(mockData, { variant: 'color', template: 'template2' });
  
  const width = 1024;
  const height = 646;
  const gap = 80;
  const padding = 30;
  const bleed = 35;
  
  // VERSION 1: No bleed
  console.log('\n📦 Creating no-bleed version...');
  const noBleedCanvas = await sharp({
    create: {
      width: width * 2 + gap + padding * 2,
      height: height + padding * 2,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();
  
  const noBleed = await sharp(noBleedCanvas)
    .composite([
      { input: back, left: padding, top: padding },
      { input: front, left: padding + width + gap, top: padding }
    ])
    .toBuffer();
  
  await fs.writeFile(path.join(outputDir, 'final_no_bleed.png'), noBleed);
  
  // VERSION 2: With bleed (same method as cardVariantGenerator)
  console.log('📦 Creating bleed version...');
  
  // First combine cards without padding
  const combinedWidth = width * 2 + gap;
  const combinedHeight = height;
  
  const combinedCanvas = await sharp({
    create: {
      width: combinedWidth,
      height: combinedHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();
  
  const combined = await sharp(combinedCanvas)
    .composite([
      { input: back, left: 0, top: 0 },
      { input: front, left: width + gap, top: 0 }
    ])
    .toBuffer();
  
  // Add bleed to outer edges
  const withBleedOnly = await sharp(combined)
    .extend({
      top: bleed,
      bottom: bleed,
      left: bleed,
      right: bleed,
      extendWith: 'mirror'
    })
    .toBuffer();
  
  // Add padding
  const totalWidth = combinedWidth + bleed * 2 + padding * 2;
  const totalHeight = combinedHeight + bleed * 2 + padding * 2;
  
  const finalCanvas = await sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();
  
  const withBleed = await sharp(finalCanvas)
    .composite([
      { input: withBleedOnly, left: padding, top: padding }
    ])
    .toBuffer();
  
  await fs.writeFile(path.join(outputDir, 'final_with_bleed.png'), withBleed);
  
  // Compare dimensions
  const noBleedMeta = await sharp(noBleed).metadata();
  const withBleedMeta = await sharp(withBleed).metadata();
  
  console.log('\n📏 Dimensions:');
  console.log(`   No bleed: ${noBleedMeta.width} x ${noBleedMeta.height}`);
  console.log(`   With bleed: ${withBleedMeta.width} x ${withBleedMeta.height}`);
  console.log(`   Difference: ${withBleedMeta.width! - noBleedMeta.width!} x ${withBleedMeta.height! - noBleedMeta.height!}`);
  
  // Extract card areas and compare
  const noBleedCardArea = await sharp(noBleed)
    .extract({ left: padding, top: padding, width: combinedWidth, height: combinedHeight })
    .toBuffer();
  
  const bleedCardArea = await sharp(withBleed)
    .extract({ left: padding + bleed, top: padding + bleed, width: combinedWidth, height: combinedHeight })
    .toBuffer();
  
  const noBleedRaw = await sharp(noBleedCardArea).raw().toBuffer();
  const bleedRaw = await sharp(bleedCardArea).raw().toBuffer();
  
  let diffCount = 0;
  for (let i = 0; i < noBleedRaw.length; i++) {
    if (noBleedRaw[i] !== bleedRaw[i]) {
      diffCount++;
    }
  }
  
  console.log(`\n🔍 Pixel comparison (card area only):`);
  console.log(`   Differences: ${diffCount} out of ${noBleedRaw.length}`);
  
  if (diffCount === 0) {
    console.log('\n✅ PERFECT MATCH! Content positions are identical.');
    console.log('   The bleed only adds mirrored edges around the outside.');
  } else {
    console.log(`\n❌ ${(diffCount / noBleedRaw.length * 100).toFixed(2)}% pixels differ`);
  }
  
  console.log('\n🎉 Check test-output/ for:');
  console.log('   - final_no_bleed.png');
  console.log('   - final_with_bleed.png');
}

test().catch(console.error);
