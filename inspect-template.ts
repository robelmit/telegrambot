/**
 * Inspect what's actually in the template images
 */

import { createCanvas, loadImage } from 'canvas';
import fs from 'fs/promises';

async function inspect() {
  const template = await loadImage('template/front_template.png');
  const canvas = createCanvas(template.width, template.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(template, 0, 0);
  const data = ctx.getImageData(0, 0, template.width, template.height);

  console.log('=== FRONT TEMPLATE CONTENT ===\n');
  
  // Check each area for dark pixels
  const checkArea = (name: string, x1: number, y1: number, x2: number, y2: number) => {
    let darkCount = 0;
    let firstDark = { x: -1, y: -1 };
    
    for (let y = y1; y < y2; y++) {
      for (let x = x1; x < x2; x++) {
        const i = (y * template.width + x) * 4;
        const brightness = (data.data[i] + data.data[i+1] + data.data[i+2]) / 3;
        if (brightness < 100) {
          darkCount++;
          if (firstDark.x === -1) {
            firstDark = { x, y };
          }
        }
      }
    }
    
    const status = darkCount > 50 ? 'HAS CONTENT' : 'EMPTY';
    console.log(`${name}: ${status} (${darkCount} dark pixels)`);
    if (darkCount > 50) {
      console.log(`  First dark at: (${firstDark.x}, ${firstDark.y})`);
    }
  };

  // Check all areas
  checkArea('Header area (title)', 200, 30, 700, 100);
  checkArea('Name label area', 270, 120, 450, 150);
  checkArea('Name Amharic value', 270, 150, 720, 190);
  checkArea('Name English value', 270, 190, 720, 235);
  checkArea('DOB label area', 270, 235, 500, 265);
  checkArea('DOB value area', 270, 265, 620, 310);
  checkArea('Sex label area', 270, 320, 400, 350);
  checkArea('Sex value area', 270, 350, 500, 410);
  checkArea('Expiry label area', 270, 410, 550, 440);
  checkArea('Expiry value area', 270, 440, 620, 490);
  checkArea('FAN label area', 260, 520, 330, 560);
  checkArea('FAN value area', 330, 530, 760, 575);
  checkArea('Barcode area', 330, 565, 820, 610);
  checkArea('Photo area', 50, 125, 250, 370);
  checkArea('Small photo area', 845, 455, 965, 600);
  
  // Create a visualization showing what's in the template
  // Mark dark pixels in red
  for (let i = 0; i < data.data.length; i += 4) {
    const brightness = (data.data[i] + data.data[i+1] + data.data[i+2]) / 3;
    if (brightness < 100) {
      data.data[i] = 255;     // Red
      data.data[i+1] = 0;     // Green
      data.data[i+2] = 0;     // Blue
    }
  }
  
  ctx.putImageData(data, 0, 0);
  await fs.writeFile('test-output/template_content_highlighted.png', canvas.toBuffer('image/png'));
  console.log('\nSaved: test-output/template_content_highlighted.png (dark pixels in red)');
}

inspect().catch(console.error);
