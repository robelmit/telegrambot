import sharp from 'sharp';
import fs from 'fs/promises';

async function analyzeTemplate() {
  // Load template and add grid overlay to understand positions
  const template = await sharp('src/assets/front_template.png').metadata();
  console.log('Template dimensions:', template.width, 'x', template.height);
  
  // Create a grid overlay to help position elements
  const width = template.width || 1344;
  const height = template.height || 768;
  
  let gridLines = '';
  
  // Vertical lines every 100px
  for (let x = 0; x <= width; x += 100) {
    gridLines += `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="red" stroke-width="1" opacity="0.3"/>`;
    gridLines += `<text x="${x+2}" y="12" font-size="10" fill="red">${x}</text>`;
  }
  
  // Horizontal lines every 100px
  for (let y = 0; y <= height; y += 100) {
    gridLines += `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="blue" stroke-width="1" opacity="0.3"/>`;
    gridLines += `<text x="2" y="${y+12}" font-size="10" fill="blue">${y}</text>`;
  }
  
  const gridSvg = `<svg width="${width}" height="${height}">${gridLines}</svg>`;
  
  const gridOverlay = await sharp(Buffer.from(gridSvg)).png().toBuffer();
  
  const templateWithGrid = await sharp('src/assets/front_template.png')
    .composite([{ input: gridOverlay, left: 0, top: 0 }])
    .toFile('template_with_grid.png');
  
  console.log('Created template_with_grid.png - check this to see coordinates');
}

analyzeTemplate().catch(console.error);
