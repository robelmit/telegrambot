/**
 * Debug test - render with visible markers
 */
import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';

async function testRenderDebug() {
  console.log('Creating debug render...\n');

  const CARD_WIDTH = 1012;
  const CARD_HEIGHT = 638;

  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
  const ctx = canvas.getContext('2d');

  // Load template
  const templatePath = path.join(process.cwd(), 'template', 'front_template.png');
  console.log('Template path:', templatePath);
  console.log('Template exists:', fs.existsSync(templatePath));

  if (fs.existsSync(templatePath)) {
    const template = await loadImage(templatePath);
    ctx.drawImage(template, 0, 0, CARD_WIDTH, CARD_HEIGHT);
    console.log('Template loaded and drawn');
  }

  // Draw test text at various positions
  ctx.fillStyle = '#ff0000'; // Red for visibility
  ctx.font = 'bold 24px Arial';
  ctx.textBaseline = 'top';

  // Draw markers at key positions
  const positions = [
    { x: 444, y: 152, label: 'Name Amharic' },
    { x: 444, y: 178, label: 'Name English' },
    { x: 413, y: 287, label: 'DOB' },
    { x: 430, y: 354, label: 'Sex' },
    { x: 578, y: 444, label: 'Expiry' },
    { x: 380, y: 520, label: 'FAN' },
  ];

  for (const pos of positions) {
    // Draw a red dot
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw text
    ctx.fillText(pos.label, pos.x + 10, pos.y);
    console.log(`Drew ${pos.label} at (${pos.x}, ${pos.y})`);
  }

  // Save
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('test-output/debug_positions.png', buffer);
  console.log('\n✓ Saved debug_positions.png');
}

testRenderDebug().catch(console.error);
