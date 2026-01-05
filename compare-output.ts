/**
 * Compare rendered output with reference images
 */
import sharp from 'sharp';
import fs from 'fs/promises';

async function compareImages() {
  console.log('Comparing rendered output with reference images...\n');

  // Load images
  const frontRef = await sharp('template/front.JPG').raw().toBuffer({ resolveWithObject: true });
  const frontOut = await sharp('test-output/front_color.png').raw().toBuffer({ resolveWithObject: true });
  const backRef = await sharp('template/back.JPG').raw().toBuffer({ resolveWithObject: true });
  const backOut = await sharp('test-output/back_color.png').raw().toBuffer({ resolveWithObject: true });

  console.log('Front Reference:', frontRef.info.width, 'x', frontRef.info.height);
  console.log('Front Output:', frontOut.info.width, 'x', frontOut.info.height);
  console.log('Back Reference:', backRef.info.width, 'x', backRef.info.height);
  console.log('Back Output:', backOut.info.width, 'x', backOut.info.height);

  // Create side-by-side comparison images
  const frontComparison = await sharp({
    create: {
      width: 2024 + 20,
      height: 638,
      channels: 3,
      background: { r: 128, g: 128, b: 128 }
    }
  })
  .composite([
    { input: 'template/front.JPG', left: 0, top: 0 },
    { input: 'test-output/front_color.png', left: 1012 + 20, top: 0 }
  ])
  .jpeg()
  .toFile('test-output/comparison_front.jpg');

  const backComparison = await sharp({
    create: {
      width: 2024 + 20,
      height: 638,
      channels: 3,
      background: { r: 128, g: 128, b: 128 }
    }
  })
  .composite([
    { input: 'template/back.JPG', left: 0, top: 0 },
    { input: 'test-output/back_color.png', left: 1012 + 20, top: 0 }
  ])
  .jpeg()
  .toFile('test-output/comparison_back.jpg');

  console.log('\n✓ Created comparison_front.jpg (reference | output)');
  console.log('✓ Created comparison_back.jpg (reference | output)');
}

compareImages().catch(console.error);
