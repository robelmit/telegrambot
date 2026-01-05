/**
 * Auto-calibrate text positions by comparing rendered vs reference
 * and finding the exact offset needed
 */

import { createCanvas, loadImage, ImageData } from 'canvas';

interface TextRegion {
  name: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  currentX: number;
  currentY: number;
}

async function findTextBounds(imageData: ImageData, width: number, x1: number, y1: number, x2: number, y2: number) {
  let minX = x2, minY = y2, maxX = x1, maxY = y1;
  let found = false;
  
  for (let y = y1; y < y2; y++) {
    for (let x = x1; x < x2; x++) {
      const i = (y * width + x) * 4;
      const brightness = (imageData.data[i] + imageData.data[i+1] + imageData.data[i+2]) / 3;
      if (brightness < 80) {
        found = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  
  return found ? { minX, minY, maxX, maxY } : null;
}

async function calibrate() {
  // Load reference and rendered
  const refFront = await loadImage('template/front.JPG');
  const rendered = await loadImage('test-output/front_color.png');
  
  const canvas = createCanvas(refFront.width, refFront.height);
  const ctx = canvas.getContext('2d');
  
  ctx.drawImage(refFront, 0, 0);
  const refData = ctx.getImageData(0, 0, refFront.width, refFront.height);
  
  ctx.drawImage(rendered, 0, 0);
  const renderedData = ctx.getImageData(0, 0, refFront.width, refFront.height);

  console.log('=== AUTO-CALIBRATION FRONT CARD ===\n');

  // Define regions and current settings
  const frontRegions: TextRegion[] = [
    { name: 'Name Amharic', x1: 270, y1: 145, x2: 720, y2: 200, currentX: 280, currentY: 153 },
    { name: 'Name English', x1: 270, y1: 180, x2: 720, y2: 240, currentX: 269, currentY: 181 },
    { name: 'DOB', x1: 265, y1: 250, x2: 620, y2: 320, currentX: 269, currentY: 255 },
    { name: 'Sex', x1: 265, y1: 340, x2: 520, y2: 420, currentX: 268, currentY: 347 },
    { name: 'Expiry', x1: 265, y1: 430, x2: 620, y2: 500, currentX: 269, currentY: 435 },
    { name: 'FAN', x1: 305, y1: 525, x2: 760, y2: 580, currentX: 310, currentY: 530 },
  ];

  let allGood = true;
  const corrections: string[] = [];

  for (const region of frontRegions) {
    const refBounds = await findTextBounds(refData, refFront.width, region.x1, region.y1, region.x2, region.y2);
    const renderedBounds = await findTextBounds(renderedData, refFront.width, region.x1, region.y1, region.x2, region.y2);
    
    if (refBounds && renderedBounds) {
      const xDiff = refBounds.minX - renderedBounds.minX;
      const yDiff = refBounds.minY - renderedBounds.minY;
      
      if (Math.abs(xDiff) > 3 || Math.abs(yDiff) > 3) {
        allGood = false;
        const newX = region.currentX + xDiff;
        const newY = region.currentY + yDiff;
        console.log(`${region.name}: NEEDS ADJUSTMENT`);
        console.log(`  Reference starts at: (${refBounds.minX}, ${refBounds.minY})`);
        console.log(`  Rendered starts at: (${renderedBounds.minX}, ${renderedBounds.minY})`);
        console.log(`  Offset needed: x=${xDiff}, y=${yDiff}`);
        console.log(`  Current: (${region.currentX}, ${region.currentY}) -> New: (${newX}, ${newY})`);
        corrections.push(`${region.name}: X=${newX}, Y=${newY}`);
      } else {
        console.log(`${region.name}: OK (diff: x=${xDiff}, y=${yDiff})`);
      }
    } else {
      console.log(`${region.name}: Could not find text bounds`);
    }
  }

  // Back card
  console.log('\n=== AUTO-CALIBRATION BACK CARD ===\n');
  
  const refBack = await loadImage('template/back.JPG');
  const renderedBack = await loadImage('test-output/back_color.png');
  
  ctx.drawImage(refBack, 0, 0);
  const refBackData = ctx.getImageData(0, 0, refBack.width, refBack.height);
  
  ctx.drawImage(renderedBack, 0, 0);
  const renderedBackData = ctx.getImageData(0, 0, refBack.width, refBack.height);

  const backRegions: TextRegion[] = [
    { name: 'Phone', x1: 20, y1: 35, x2: 220, y2: 90, currentX: 25, currentY: 42 },
    { name: 'ET', x1: 175, y1: 120, x2: 250, y2: 170, currentX: 182, currentY: 127 },
    { name: 'Region Amharic', x1: 20, y1: 190, x2: 200, y2: 240, currentX: 25, currentY: 195 },
    { name: 'Region English', x1: 20, y1: 235, x2: 150, y2: 275, currentX: 25, currentY: 241 },
    { name: 'City Amharic', x1: 20, y1: 250, x2: 150, y2: 300, currentX: 25, currentY: 255 },
    { name: 'City English', x1: 20, y1: 280, x2: 150, y2: 330, currentX: 25, currentY: 285 },
    { name: 'Subcity Amharic', x1: 20, y1: 310, x2: 200, y2: 365, currentX: 25, currentY: 315 },
    { name: 'Subcity English', x1: 20, y1: 345, x2: 200, y2: 400, currentX: 25, currentY: 352 },
    { name: 'FIN', x1: 95, y1: 420, x2: 280, y2: 460, currentX: 100, currentY: 425 },
  ];

  for (const region of backRegions) {
    const refBounds = await findTextBounds(refBackData, refBack.width, region.x1, region.y1, region.x2, region.y2);
    const renderedBounds = await findTextBounds(renderedBackData, refBack.width, region.x1, region.y1, region.x2, region.y2);
    
    if (refBounds && renderedBounds) {
      const xDiff = refBounds.minX - renderedBounds.minX;
      const yDiff = refBounds.minY - renderedBounds.minY;
      
      if (Math.abs(xDiff) > 3 || Math.abs(yDiff) > 3) {
        allGood = false;
        const newX = region.currentX + xDiff;
        const newY = region.currentY + yDiff;
        console.log(`${region.name}: NEEDS ADJUSTMENT`);
        console.log(`  Offset needed: x=${xDiff}, y=${yDiff}`);
        console.log(`  Current: (${region.currentX}, ${region.currentY}) -> New: (${newX}, ${newY})`);
        corrections.push(`${region.name}: X=${newX}, Y=${newY}`);
      } else {
        console.log(`${region.name}: OK (diff: x=${xDiff}, y=${yDiff})`);
      }
    } else {
      console.log(`${region.name}: Could not find text bounds`);
    }
  }

  console.log('\n=== SUMMARY ===');
  if (allGood) {
    console.log('✅ All positions are correctly aligned!');
  } else {
    console.log('❌ Corrections needed:');
    corrections.forEach(c => console.log(`  ${c}`));
  }
  
  return allGood;
}

calibrate().catch(console.error);
