/**
 * Extract exact coordinates by finding dark pixels (text) in specific regions
 */

import { createCanvas, loadImage } from 'canvas';

async function findTextBounds(imagePath: string, regionName: string, startX: number, startY: number, endX: number, endY: number) {
  const img = await loadImage(imagePath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  
  const imageData = ctx.getImageData(startX, startY, endX - startX, endY - startY);
  const data = imageData.data;
  
  let minX = endX - startX, minY = endY - startY, maxX = 0, maxY = 0;
  let foundDark = false;
  
  for (let y = 0; y < endY - startY; y++) {
    for (let x = 0; x < endX - startX; x++) {
      const i = (y * (endX - startX) + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const brightness = (r + g + b) / 3;
      
      // Dark pixel (text)
      if (brightness < 80) {
        foundDark = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  
  if (foundDark) {
    console.log(`${regionName}:`);
    console.log(`  Absolute: x=${startX + minX}, y=${startY + minY} to x=${startX + maxX}, y=${startY + maxY}`);
    console.log(`  Text starts at: (${startX + minX}, ${startY + minY})`);
    console.log(`  Size: ${maxX - minX + 1} x ${maxY - minY + 1}`);
  } else {
    console.log(`${regionName}: No dark text found in region`);
  }
}

async function main() {
  console.log('=== FRONT CARD - EXACT TEXT POSITIONS ===\n');
  
  // Analyze specific regions of front.JPG
  // Name area (around y=150-220)
  await findTextBounds('template/front.JPG', 'Full Name Amharic', 270, 150, 700, 185);
  await findTextBounds('template/front.JPG', 'Full Name English', 270, 185, 700, 230);
  
  // DOB area
  await findTextBounds('template/front.JPG', 'Date of Birth', 270, 265, 600, 310);
  
  // Sex area
  await findTextBounds('template/front.JPG', 'Sex', 270, 355, 500, 410);
  
  // Expiry area
  await findTextBounds('template/front.JPG', 'Date of Expiry', 270, 445, 600, 490);
  
  // FAN area
  await findTextBounds('template/front.JPG', 'FAN Number', 320, 530, 750, 570);
  
  // Barcode area
  await findTextBounds('template/front.JPG', 'Barcode', 320, 565, 810, 625);
  
  // Photo area
  await findTextBounds('template/front.JPG', 'Main Photo', 50, 120, 250, 370);
  
  // Small photo
  await findTextBounds('template/front.JPG', 'Small Photo', 850, 460, 970, 600);
  
  console.log('\n=== BACK CARD - EXACT TEXT POSITIONS ===\n');
  
  // Phone
  await findTextBounds('template/back.JPG', 'Phone Number', 20, 35, 250, 80);
  
  // ET
  await findTextBounds('template/back.JPG', 'ET text', 180, 125, 280, 165);
  
  // Region
  await findTextBounds('template/back.JPG', 'Region Amharic', 20, 195, 200, 230);
  await findTextBounds('template/back.JPG', 'Region English', 20, 225, 150, 260);
  
  // City
  await findTextBounds('template/back.JPG', 'City Amharic', 20, 255, 150, 290);
  await findTextBounds('template/back.JPG', 'City English', 20, 285, 150, 320);
  
  // Subcity
  await findTextBounds('template/back.JPG', 'Subcity Amharic', 20, 315, 220, 355);
  await findTextBounds('template/back.JPG', 'Subcity English', 20, 345, 220, 385);
  
  // QR Code
  await findTextBounds('template/back.JPG', 'QR Code', 480, 10, 880, 410);
  
  // FIN
  await findTextBounds('template/back.JPG', 'FIN Number', 100, 425, 350, 465);
  
  // SN
  await findTextBounds('template/back.JPG', 'Serial Number', 810, 465, 950, 500);
}

main().catch(console.error);
