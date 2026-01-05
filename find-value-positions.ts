/**
 * Find exact value positions by comparing template (labels only) with reference (labels + values)
 * The difference shows where values are placed
 */

import { createCanvas, loadImage } from 'canvas';

async function findValues() {
  const template = await loadImage('template/front_template.png');
  const reference = await loadImage('template/front.JPG');
  
  const canvas = createCanvas(template.width, template.height);
  const ctx = canvas.getContext('2d');
  
  ctx.drawImage(template, 0, 0);
  const templateData = ctx.getImageData(0, 0, template.width, template.height);
  
  ctx.drawImage(reference, 0, 0);
  const refData = ctx.getImageData(0, 0, reference.width, reference.height);

  console.log('=== FINDING VALUE-ONLY POSITIONS (where ref has text but template does not) ===\n');

  const findValueStart = (name: string, x1: number, y1: number, x2: number, y2: number) => {
    for (let y = y1; y < y2; y++) {
      for (let x = x1; x < x2; x++) {
        const i = (y * template.width + x) * 4;
        
        const templateBright = (templateData.data[i] + templateData.data[i+1] + templateData.data[i+2]) / 3;
        const refBright = (refData.data[i] + refData.data[i+1] + refData.data[i+2]) / 3;
        
        // Reference has dark text, template doesn't = this is a VALUE pixel
        if (refBright < 80 && templateBright > 150) {
          console.log(`${name}: Value starts at (${x}, ${y})`);
          return { x, y };
        }
      }
    }
    console.log(`${name}: No value-only pixels found (might overlap with label)`);
    return null;
  };

  // Front card
  findValueStart('Name Amharic', 270, 145, 720, 200);
  findValueStart('Name English', 270, 180, 720, 240);
  findValueStart('DOB', 265, 250, 620, 320);
  findValueStart('Sex', 265, 340, 520, 420);
  findValueStart('Expiry', 265, 430, 620, 500);
  findValueStart('FAN', 305, 525, 760, 580);
  findValueStart('Barcode', 305, 560, 820, 600);

  console.log('\n=== BACK CARD ===\n');
  
  const templateBack = await loadImage('template/back_template.png');
  const refBack = await loadImage('template/back.JPG');
  
  ctx.drawImage(templateBack, 0, 0);
  const templateBackData = ctx.getImageData(0, 0, templateBack.width, templateBack.height);
  
  ctx.drawImage(refBack, 0, 0);
  const refBackData = ctx.getImageData(0, 0, refBack.width, refBack.height);

  const findValueStartBack = (name: string, x1: number, y1: number, x2: number, y2: number) => {
    for (let y = y1; y < y2; y++) {
      for (let x = x1; x < x2; x++) {
        const i = (y * templateBack.width + x) * 4;
        
        const templateBright = (templateBackData.data[i] + templateBackData.data[i+1] + templateBackData.data[i+2]) / 3;
        const refBright = (refBackData.data[i] + refBackData.data[i+1] + refBackData.data[i+2]) / 3;
        
        if (refBright < 80 && templateBright > 150) {
          console.log(`${name}: Value starts at (${x}, ${y})`);
          return { x, y };
        }
      }
    }
    console.log(`${name}: No value-only pixels found`);
    return null;
  };

  findValueStartBack('Phone', 20, 35, 250, 90);
  findValueStartBack('Region Amharic', 20, 190, 200, 240);
  findValueStartBack('Region English', 20, 230, 150, 275);
  findValueStartBack('City Amharic', 20, 250, 150, 300);
  findValueStartBack('City English', 20, 280, 150, 330);
  findValueStartBack('Subcity Amharic', 20, 305, 200, 365);
  findValueStartBack('Subcity English', 20, 345, 200, 400);
  findValueStartBack('FIN', 90, 420, 280, 460);
  findValueStartBack('QR Code', 475, 15, 890, 420);
}

findValues().catch(console.error);
