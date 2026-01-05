/**
 * Create overlay comparison to visualize position differences
 */
import sharp from 'sharp';

async function createOverlay() {
  console.log('Creating overlay comparisons...\n');

  // Create front overlay (50% blend)
  await sharp('template/front.JPG')
    .composite([{
      input: 'test-output/front_color.png',
      blend: 'difference'
    }])
    .toFile('test-output/front_diff.png');
  console.log('✓ Created front_diff.png (difference mode)');

  // Create back overlay
  await sharp('template/back.JPG')
    .composite([{
      input: 'test-output/back_color.png',
      blend: 'difference'
    }])
    .toFile('test-output/back_diff.png');
  console.log('✓ Created back_diff.png (difference mode)');

  // Create stacked comparison (reference on top, output on bottom)
  await sharp({
    create: {
      width: 1012,
      height: 638 * 2 + 10,
      channels: 3,
      background: { r: 50, g: 50, b: 50 }
    }
  })
  .composite([
    { input: 'template/front.JPG', left: 0, top: 0 },
    { input: 'test-output/front_color.png', left: 0, top: 638 + 10 }
  ])
  .jpeg()
  .toFile('test-output/front_stacked.jpg');
  console.log('✓ Created front_stacked.jpg (reference top, output bottom)');

  await sharp({
    create: {
      width: 1012,
      height: 638 * 2 + 10,
      channels: 3,
      background: { r: 50, g: 50, b: 50 }
    }
  })
  .composite([
    { input: 'template/back.JPG', left: 0, top: 0 },
    { input: 'test-output/back_color.png', left: 0, top: 638 + 10 }
  ])
  .jpeg()
  .toFile('test-output/back_stacked.jpg');
  console.log('✓ Created back_stacked.jpg (reference top, output bottom)');

  console.log('\nDone! Check test-output folder for comparison images.');
}

createOverlay().catch(console.error);
