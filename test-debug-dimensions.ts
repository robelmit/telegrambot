/**
 * Debug dimensions at each step
 */
import sharp from 'sharp';
import { getCardDimensions } from './src/services/generator/cardRenderer';

async function debug() {
  const { width, height } = getCardDimensions('template2');
  const gap = 80;
  const padding = 30;
  const bleed = 35;
  
  console.log('Card dimensions:', width, 'x', height);
  console.log('Gap:', gap);
  console.log('Padding:', padding);
  console.log('Bleed:', bleed);
  
  const cardWithBleedWidth = width + bleed * 2;
  const cardWithBleedHeight = height + bleed * 2;
  
  console.log('\nCard with bleed:', cardWithBleedWidth, 'x', cardWithBleedHeight);
  
  const totalWidth = cardWithBleedWidth * 2 + gap + (padding * 2);
  const totalHeight = cardWithBleedHeight + (padding * 2);
  
  console.log('Expected total:', totalWidth, 'x', totalHeight);
  
  // Check actual bleed image
  const withBleed = await sharp('test-output/template3_bleed_normal.png').metadata();
  console.log('\nActual output:', withBleed.width, 'x', withBleed.height);
  
  // Check individual card after extend
  const front = await sharp('test-output/template3_front_no_bleed.png').toBuffer();
  const frontMeta = await sharp(front).metadata();
  console.log('\nFront card (no bleed):', frontMeta.width, 'x', frontMeta.height);
  
  const frontExtended = await sharp(front)
    .extend({
      top: bleed,
      bottom: bleed,
      left: bleed,
      right: bleed,
      extendWith: 'mirror'
    })
    .toBuffer();
  
  const frontExtMeta = await sharp(frontExtended).metadata();
  console.log('Front card (with bleed):', frontExtMeta.width, 'x', frontExtMeta.height);
}

debug().catch(console.error);
