/**
 * Find exact text start positions by scanning for first dark pixel in each row
 */

import { createCanvas, loadImage } from 'canvas';

async function findTextStart() {
  const refFront = await loadImage('template/front.JPG');
  const canvas = createCanvas(refFront.width, refFront.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(refFront, 0, 0);
  const data = ctx.getImageData(0, 0, refFront.width, refFront.height);

  console.log('=== FRONT CARD - EXACT TEXT START POSITIONS ===\n');

  // For each text region, find the exact first dark pixel
  const findFirstDark = (startX: number, startY: number, endX: number, endY: number, name: string) => {
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const i = (y * refFront.width + x) * 4;
        const brightness = (data.data[i] + data.data[i+1] + data.data[i+2]) / 3;
        if (brightness < 60) {
          console.log(`${name}: First dark pixel at (${x}, ${y})`);
          return { x, y };
        }
      }
    }
    console.log(`${name}: No dark pixel found`);
    return null;
  };

  // Name Amharic - scan from x=270 to find where text actually starts
  findFirstDark(270, 150, 450, 190, 'Name Amharic');
  
  // Name English
  findFirstDark(270, 190, 450, 235, 'Name English');
  
  // DOB
  findFirstDark(270, 265, 400, 310, 'DOB');
  
  // Sex
  findFirstDark(270, 355, 350, 410, 'Sex');
  
  // Expiry
  findFirstDark(270, 445, 400, 490, 'Expiry');
  
  // FAN
  findFirstDark(310, 530, 450, 575, 'FAN');

  console.log('\n=== BACK CARD - EXACT TEXT START POSITIONS ===\n');
  
  const refBack = await loadImage('template/back.JPG');
  ctx.drawImage(refBack, 0, 0);
  const backData = ctx.getImageData(0, 0, refBack.width, refBack.height);

  const findFirstDarkBack = (startX: number, startY: number, endX: number, endY: number, name: string) => {
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const i = (y * refBack.width + x) * 4;
        const brightness = (backData.data[i] + backData.data[i+1] + backData.data[i+2]) / 3;
        if (brightness < 60) {
          console.log(`${name}: First dark pixel at (${x}, ${y})`);
          return { x, y };
        }
      }
    }
    console.log(`${name}: No dark pixel found`);
    return null;
  };

  // Phone
  findFirstDarkBack(20, 40, 150, 80, 'Phone');
  
  // ET
  findFirstDarkBack(175, 125, 230, 165, 'ET');
  
  // Region Amharic
  findFirstDarkBack(20, 195, 100, 230, 'Region Amharic');
  
  // Region English
  findFirstDarkBack(20, 225, 100, 265, 'Region English');
  
  // City Amharic
  findFirstDarkBack(20, 255, 100, 295, 'City Amharic');
  
  // City English
  findFirstDarkBack(20, 285, 100, 325, 'City English');
  
  // Subcity Amharic
  findFirstDarkBack(20, 315, 100, 360, 'Subcity Amharic');
  
  // Subcity English
  findFirstDarkBack(20, 350, 100, 390, 'Subcity English');
  
  // FIN
  findFirstDarkBack(95, 425, 180, 455, 'FIN');
  
  // SN (red text - need different threshold)
  console.log('\nSN (checking for red):');
  for (let y = 465; y < 500; y++) {
    for (let x = 805; x < 900; x++) {
      const i = (y * refBack.width + x) * 4;
      const r = backData.data[i];
      const g = backData.data[i+1];
      const b = backData.data[i+2];
      // Red text: high R, low G and B
      if (r > 150 && g < 100 && b < 100) {
        console.log(`SN: First red pixel at (${x}, ${y})`);
        return;
      }
    }
  }
}

findTextStart().catch(console.error);
