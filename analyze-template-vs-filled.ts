/**
 * Compare template (blank) vs filled (front.JPG) to find exact value positions
 */

import { createCanvas, loadImage } from 'canvas';

async function analyzePositions() {
  // Load both template and filled version
  const template = await loadImage('template/front_template.png');
  const filled = await loadImage('template/front.JPG');
  
  const canvas = createCanvas(template.width, template.height);
  const ctx = canvas.getContext('2d');
  
  // Get template data
  ctx.drawImage(template, 0, 0);
  const templateData = ctx.getImageData(0, 0, template.width, template.height);
  
  // Get filled data
  ctx.drawImage(filled, 0, 0);
  const filledData = ctx.getImageData(0, 0, filled.width, filled.height);
  
  console.log('=== FINDING VALUE POSITIONS (where filled differs from template) ===\n');
  
  // Find regions where filled has dark pixels but template doesn't
  // These are the actual value positions
  
  const regions = [
    { name: 'Full Name area', y1: 145, y2: 240, x1: 270, x2: 750 },
    { name: 'DOB area', y1: 260, y2: 320, x1: 270, x2: 620 },
    { name: 'Sex area', y1: 350, y2: 420, x1: 270, x2: 520 },
    { name: 'Expiry area', y1: 440, y2: 500, x1: 270, x2: 620 },
    { name: 'FAN area', y1: 525, y2: 600, x1: 300, x2: 820 },
  ];
  
  for (const region of regions) {
    console.log(`\n${region.name}:`);
    
    let firstValueX = -1, firstValueY = -1;
    
    for (let y = region.y1; y < region.y2; y++) {
      for (let x = region.x1; x < region.x2; x++) {
        const i = (y * template.width + x) * 4;
        
        const templateBright = (templateData.data[i] + templateData.data[i+1] + templateData.data[i+2]) / 3;
        const filledBright = (filledData.data[i] + filledData.data[i+1] + filledData.data[i+2]) / 3;
        
        // Template is light, filled is dark = this is a value pixel
        if (templateBright > 150 && filledBright < 80) {
          if (firstValueX === -1) {
            firstValueX = x;
            firstValueY = y;
          }
        }
      }
    }
    
    if (firstValueX !== -1) {
      console.log(`  First value pixel at: (${firstValueX}, ${firstValueY})`);
    } else {
      console.log(`  No value pixels found (might be same as template)`);
    }
  }
  
  // Same for back
  console.log('\n\n=== BACK CARD VALUE POSITIONS ===\n');
  
  const templateBack = await loadImage('template/back_template.png');
  const filledBack = await loadImage('template/back.JPG');
  
  ctx.drawImage(templateBack, 0, 0);
  const templateBackData = ctx.getImageData(0, 0, templateBack.width, templateBack.height);
  
  ctx.drawImage(filledBack, 0, 0);
  const filledBackData = ctx.getImageData(0, 0, filledBack.width, filledBack.height);
  
  const backRegions = [
    { name: 'Phone area', y1: 35, y2: 85, x1: 20, x2: 250 },
    { name: 'Nationality ET area', y1: 120, y2: 175, x1: 170, x2: 280 },
    { name: 'Address area', y1: 190, y2: 400, x1: 20, x2: 280 },
    { name: 'FIN area', y1: 420, y2: 465, x1: 90, x2: 300 },
    { name: 'SN area', y1: 460, y2: 510, x1: 800, x2: 960 },
    { name: 'QR area', y1: 10, y2: 420, x1: 470, x2: 900 },
  ];
  
  for (const region of backRegions) {
    console.log(`\n${region.name}:`);
    
    let firstValueX = -1, firstValueY = -1;
    
    for (let y = region.y1; y < region.y2; y++) {
      for (let x = region.x1; x < region.x2; x++) {
        const i = (y * templateBack.width + x) * 4;
        
        const templateBright = (templateBackData.data[i] + templateBackData.data[i+1] + templateBackData.data[i+2]) / 3;
        const filledBright = (filledBackData.data[i] + filledBackData.data[i+1] + filledBackData.data[i+2]) / 3;
        
        // For SN, check for red
        if (region.name === 'SN area') {
          const r = filledBackData.data[i];
          const g = filledBackData.data[i+1];
          const b = filledBackData.data[i+2];
          if (r > 150 && g < 100 && b < 100) {
            if (firstValueX === -1) {
              firstValueX = x;
              firstValueY = y;
            }
          }
        } else if (templateBright > 150 && filledBright < 80) {
          if (firstValueX === -1) {
            firstValueX = x;
            firstValueY = y;
          }
        }
      }
    }
    
    if (firstValueX !== -1) {
      console.log(`  First value pixel at: (${firstValueX}, ${firstValueY})`);
    } else {
      console.log(`  No value pixels found`);
    }
  }
}

analyzePositions().catch(console.error);
