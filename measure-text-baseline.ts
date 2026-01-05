/**
 * Measure exact text baseline positions in reference images
 */

import { createCanvas, loadImage } from 'canvas';

async function measureBaselines() {
  const ref = await loadImage('template/front.JPG');
  const canvas = createCanvas(ref.width, ref.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(ref, 0, 0);
  const data = ctx.getImageData(0, 0, ref.width, ref.height);

  console.log('=== FRONT CARD - TEXT BASELINE POSITIONS ===\n');

  // For each text area, find the TOP of the text (first row with dark pixels)
  // and the BOTTOM (last row with dark pixels)
  
  const measureText = (name: string, x1: number, y1: number, x2: number, y2: number) => {
    let firstY = -1, lastY = -1;
    let firstX = -1;
    
    for (let y = y1; y < y2; y++) {
      for (let x = x1; x < x2; x++) {
        const i = (y * ref.width + x) * 4;
        const brightness = (data.data[i] + data.data[i+1] + data.data[i+2]) / 3;
        if (brightness < 70) {
          if (firstY === -1) {
            firstY = y;
            firstX = x;
          }
          lastY = y;
        }
      }
    }
    
    if (firstY !== -1) {
      console.log(`${name}:`);
      console.log(`  Top of text: y=${firstY} (first dark at x=${firstX})`);
      console.log(`  Bottom of text: y=${lastY}`);
      console.log(`  Height: ${lastY - firstY + 1}px`);
      console.log(`  For textBaseline='top', use y=${firstY}`);
    }
  };

  // Measure each text field
  measureText('Name Amharic', 280, 150, 720, 195);
  measureText('Name English', 280, 190, 720, 235);
  measureText('DOB value', 280, 265, 620, 315);
  measureText('Sex value', 280, 355, 520, 415);
  measureText('Expiry value', 280, 445, 620, 495);
  measureText('FAN value', 320, 530, 760, 575);
  
  console.log('\n=== BACK CARD - TEXT BASELINE POSITIONS ===\n');
  
  const refBack = await loadImage('template/back.JPG');
  ctx.drawImage(refBack, 0, 0);
  const backData = ctx.getImageData(0, 0, refBack.width, refBack.height);
  
  const measureTextBack = (name: string, x1: number, y1: number, x2: number, y2: number) => {
    let firstY = -1, lastY = -1;
    
    for (let y = y1; y < y2; y++) {
      for (let x = x1; x < x2; x++) {
        const i = (y * refBack.width + x) * 4;
        const brightness = (backData.data[i] + backData.data[i+1] + backData.data[i+2]) / 3;
        if (brightness < 70) {
          if (firstY === -1) {
            firstY = y;
          }
          lastY = y;
        }
      }
    }
    
    if (firstY !== -1) {
      console.log(`${name}:`);
      console.log(`  Top: y=${firstY}, Bottom: y=${lastY}, Height: ${lastY - firstY + 1}px`);
    }
  };

  measureTextBack('Phone value', 25, 40, 220, 85);
  measureTextBack('ET', 180, 125, 240, 170);
  measureTextBack('Region Amharic', 25, 195, 180, 235);
  measureTextBack('Region English', 25, 228, 130, 270);
  measureTextBack('City Amharic', 25, 255, 130, 295);
  measureTextBack('City English', 25, 285, 130, 325);
  measureTextBack('Subcity Amharic', 25, 315, 180, 360);
  measureTextBack('Subcity English', 25, 350, 180, 395);
  measureTextBack('FIN value', 100, 425, 280, 460);
  
  // SN is red
  console.log('\nSN (red text):');
  for (let y = 465; y < 505; y++) {
    for (let x = 815; x < 960; x++) {
      const i = (y * refBack.width + x) * 4;
      const r = backData.data[i];
      const g = backData.data[i+1];
      const b = backData.data[i+2];
      if (r > 150 && g < 80 && b < 80) {
        console.log(`  First red pixel at: (${x}, ${y})`);
        return;
      }
    }
  }
}

measureBaselines().catch(console.error);
