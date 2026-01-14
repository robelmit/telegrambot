/**
 * Debug test to understand how sharp.extend works
 */
import sharp from 'sharp';
import fs from 'fs/promises';

async function testExtend() {
  // Create a simple 100x100 red square
  const original = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 }
    }
  }).png().toBuffer();
  
  await fs.writeFile('test-output/extend_original.png', original);
  console.log('Original: 100x100 red square');
  
  // Extend with 20px bleed
  const extended = await sharp(original)
    .extend({
      top: 20,
      bottom: 20,
      left: 20,
      right: 20,
      extendWith: 'mirror'
    })
    .toBuffer();
  
  await fs.writeFile('test-output/extend_with_bleed.png', extended);
  
  const meta = await sharp(extended).metadata();
  console.log(`Extended: ${meta.width}x${meta.height} (should be 140x140)`);
  console.log('Check test-output/extend_with_bleed.png - red square should be centered');
}

testExtend().catch(console.error);
