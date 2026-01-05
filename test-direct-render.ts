/**
 * Direct render test - bypass CardRenderer to test canvas text rendering
 */
import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';

async function testDirectRender() {
  console.log('Testing direct canvas rendering...\n');

  const CARD_WIDTH = 1012;
  const CARD_HEIGHT = 638;

  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
  const ctx = canvas.getContext('2d');

  // Load template
  const templatePath = path.join(process.cwd(), 'template', 'front_template.png');
  const template = await loadImage(templatePath);
  ctx.drawImage(template, 0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Set text style - same as CardRenderer
  ctx.fillStyle = '#1a1a1a';
  ctx.textBaseline = 'top';

  // Draw test text
  ctx.font = 'bold 22px Arial';
  ctx.fillText('ፀጋ ገብረስላሴ ገብረሂወት', 444, 152);
  console.log('Drew Amharic name at (444, 152)');

  ctx.font = 'bold 18px Arial';
  ctx.fillText('Tsega Gebreslasie Gebrehiwot', 444, 178);
  console.log('Drew English name at (444, 178)');

  ctx.font = 'bold 16px Arial';
  ctx.fillText('21/08/1973 | 1981/Apr/29', 413, 287);
  console.log('Drew DOB at (413, 287)');

  ctx.fillText('ሴት  |  Female', 430, 354);
  console.log('Drew Sex at (430, 354)');

  ctx.fillText('2026/04/01 | 2033/Dec/10', 578, 444);
  console.log('Drew Expiry at (578, 444)');

  ctx.font = 'bold 18px Consolas, monospace';
  ctx.fillText('3092 7187 9089 3152', 380, 520);
  console.log('Drew FAN at (380, 520)');

  // Save
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('test-output/direct_render.png', buffer);
  console.log('\n✓ Saved direct_render.png');

  // Check if text was actually drawn
  const output = await require('sharp')('test-output/direct_render.png').raw().toBuffer({ resolveWithObject: true });
  
  // Check pixel at name position
  const nameIdx = (152 * CARD_WIDTH + 450) * 3;
  console.log(`\nPixel at name position: rgb(${output.data[nameIdx]}, ${output.data[nameIdx+1]}, ${output.data[nameIdx+2]})`);
}

testDirectRender().catch(console.error);
