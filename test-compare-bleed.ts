/**
 * Visual comparison - overlay bleed and no-bleed versions
 */
import sharp from 'sharp';
import fs from 'fs/promises';

async function compare() {
  const bleed = 35;
  const padding = 30;
  
  // Load both images
  const noBleed = await sharp('test-output/template3_combined_no_bleed.png').toBuffer();
  const withBleed = await sharp('test-output/template3_bleed_normal.png').toBuffer();
  
  const noBleedMeta = await sharp(noBleed).metadata();
  const withBleedMeta = await sharp(withBleed).metadata();
  
  console.log('No bleed:', noBleedMeta.width, 'x', noBleedMeta.height);
  console.log('With bleed:', withBleedMeta.width, 'x', withBleedMeta.height);
  console.log('Difference:', withBleedMeta.width! - noBleedMeta.width!, 'x', withBleedMeta.height! - noBleedMeta.height!);
  console.log('Expected difference: 70 x 70 (35px bleed on outer left/right, 35px on top/bottom)');
  
  // The bleed version has:
  // - padding (30px) on all sides
  // - bleed (35px) on outer edges of the combined cards
  // So to get the original card area, we need to crop:
  // left = padding + bleed = 65
  // top = padding + bleed = 65
  // The no-bleed version has padding (30px) on all sides
  // So the card area starts at 30,30
  
  // Extract card area from no-bleed (skip padding)
  const noBleedCardArea = await sharp(noBleed)
    .extract({
      left: padding,
      top: padding,
      width: noBleedMeta.width! - padding * 2,
      height: noBleedMeta.height! - padding * 2
    })
    .toBuffer();
  
  // Extract card area from bleed version (skip padding + bleed)
  const bleedCardArea = await sharp(withBleed)
    .extract({
      left: padding + bleed,
      top: padding + bleed,
      width: noBleedMeta.width! - padding * 2,
      height: noBleedMeta.height! - padding * 2
    })
    .toBuffer();
  
  await fs.writeFile('test-output/no_bleed_card_area.png', noBleedCardArea);
  await fs.writeFile('test-output/bleed_card_area.png', bleedCardArea);
  console.log('\nSaved card areas for comparison');
  
  // Compare the card areas
  const noBleedRaw = await sharp(noBleedCardArea).raw().toBuffer();
  const bleedRaw = await sharp(bleedCardArea).raw().toBuffer();
  
  let diffCount = 0;
  for (let i = 0; i < noBleedRaw.length; i++) {
    if (noBleedRaw[i] !== bleedRaw[i]) {
      diffCount++;
    }
  }
  
  console.log(`\nPixel differences in card area: ${diffCount} out of ${noBleedRaw.length}`);
  if (diffCount === 0) {
    console.log('✅ Perfect match! Bleed is working correctly - content positions are identical.');
  } else {
    const diffPercent = (diffCount / noBleedRaw.length * 100).toFixed(2);
    console.log(`❌ ${diffPercent}% pixels differ - content positions may be shifted`);
  }
}

compare().catch(console.error);
