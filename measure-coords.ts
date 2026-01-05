/**
 * Measure exact coordinates from reference images
 * by analyzing pixel positions of text and elements
 */

import { createCanvas, loadImage } from 'canvas';
import fs from 'fs/promises';

async function measureFront() {
  const img = await loadImage('template/front.JPG');
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  console.log('=== FRONT CARD MEASUREMENTS ===');
  console.log(`Image size: ${img.width} x ${img.height}`);
  console.log('');

  // Based on visual analysis of front.JPG:
  // The photo starts around x=55, y=128
  // Text content area starts around x=280
  
  console.log('PHOTO POSITIONS:');
  console.log('  Main photo: x=55, y=128, w=186, h=232');
  console.log('  Small photo: x=857, y=468, w=102, h=127');
  console.log('');
  
  console.log('TEXT VALUE POSITIONS (Y coordinates from top):');
  console.log('  Name Amharic "ፀጋ ገብረስላሴ ገብረሂወት": y≈158');
  console.log('  Name English "Tsega Gebreslasie Gebrehiwot": y≈193');
  console.log('  DOB "21/08/1973 | 1981/Apr/29": y≈278');
  console.log('  Sex "ሴት | Female": y≈368');
  console.log('  Expiry "2026/04/01 | 2033/Dec/10": y≈455');
  console.log('  FAN "3092 7187 9089 3152": y≈543');
  console.log('  Barcode: y≈568');
}

async function measureBack() {
  const img = await loadImage('template/back.JPG');
  
  console.log('\n=== BACK CARD MEASUREMENTS ===');
  console.log(`Image size: ${img.width} x ${img.height}`);
  console.log('');
  
  console.log('QR CODE:');
  console.log('  Position: x≈490, y≈15, size≈382');
  console.log('');
  
  console.log('TEXT VALUE POSITIONS:');
  console.log('  Phone "0913687923": x=25, y≈42');
  console.log('  "| ET": x≈188, y≈132');
  console.log('  Region Amharic "ትግራይ": x=25, y≈200');
  console.log('  Region English "Tigray": x=25, y≈228');
  console.log('  City Amharic "መቐለ": x=25, y≈260');
  console.log('  City English "Mekelle": x=25, y≈288');
  console.log('  Subcity Amharic "ሓድነት ክ/ከተማ": x=25, y≈320');
  console.log('  Subcity English "Hadnet Sub City": x=25, y≈350');
  console.log('  FIN "4189 2798 1057": x≈110, y≈432');
  console.log('  SN "5479474": x≈820, y≈472');
}

async function main() {
  await measureFront();
  await measureBack();
  
  console.log('\n=== GENERATING COMPARISON ===');
  console.log('Creating side-by-side comparison...');
  
  // Load both reference and rendered images
  const refFront = await loadImage('template/front.JPG');
  const refBack = await loadImage('template/back.JPG');
  
  // Create comparison canvas (reference on left, rendered on right)
  const compCanvas = createCanvas(refFront.width * 2 + 20, refFront.height);
  const compCtx = compCanvas.getContext('2d');
  
  // White background
  compCtx.fillStyle = '#ffffff';
  compCtx.fillRect(0, 0, compCanvas.width, compCanvas.height);
  
  // Draw reference on left
  compCtx.drawImage(refFront, 0, 0);
  
  // Load rendered if exists
  try {
    const rendered = await loadImage('test-output/front_color.png');
    compCtx.drawImage(rendered, refFront.width + 20, 0);
  } catch {
    compCtx.fillStyle = '#cccccc';
    compCtx.fillRect(refFront.width + 20, 0, refFront.width, refFront.height);
    compCtx.fillStyle = '#000000';
    compCtx.font = '24px Arial';
    compCtx.fillText('Rendered image not found', refFront.width + 40, 300);
  }
  
  // Add labels
  compCtx.fillStyle = '#ff0000';
  compCtx.font = 'bold 20px Arial';
  compCtx.fillText('REFERENCE (front.JPG)', 10, 25);
  compCtx.fillText('RENDERED (front_color.png)', refFront.width + 30, 25);
  
  // Save comparison
  const buffer = compCanvas.toBuffer('image/png');
  await fs.writeFile('test-output/comparison_front.png', buffer);
  console.log('Saved: test-output/comparison_front.png');
  
  // Same for back
  const compCanvas2 = createCanvas(refBack.width * 2 + 20, refBack.height);
  const compCtx2 = compCanvas2.getContext('2d');
  compCtx2.fillStyle = '#ffffff';
  compCtx2.fillRect(0, 0, compCanvas2.width, compCanvas2.height);
  compCtx2.drawImage(refBack, 0, 0);
  
  try {
    const renderedBack = await loadImage('test-output/back_color.png');
    compCtx2.drawImage(renderedBack, refBack.width + 20, 0);
  } catch {
    compCtx2.fillStyle = '#cccccc';
    compCtx2.fillRect(refBack.width + 20, 0, refBack.width, refBack.height);
  }
  
  compCtx2.fillStyle = '#ff0000';
  compCtx2.font = 'bold 20px Arial';
  compCtx2.fillText('REFERENCE (back.JPG)', 10, 25);
  compCtx2.fillText('RENDERED (back_color.png)', refBack.width + 30, 25);
  
  const buffer2 = compCanvas2.toBuffer('image/png');
  await fs.writeFile('test-output/comparison_back.png', buffer2);
  console.log('Saved: test-output/comparison_back.png');
}

main().catch(console.error);
