/**
 * Check what's in the name area of template vs reference
 */

import { createCanvas, loadImage } from 'canvas';

async function checkNameArea() {
  const template = await loadImage('template/front_template.png');
  const reference = await loadImage('template/front.JPG');
  
  const canvas = createCanvas(template.width, template.height);
  const ctx = canvas.getContext('2d');
  
  // Check template
  ctx.drawImage(template, 0, 0);
  const templateData = ctx.getImageData(0, 0, template.width, template.height);
  
  console.log('=== TEMPLATE - Name Amharic area (y=150-195, x=270-720) ===');
  let templateDarkPixels = 0;
  let templateFirstDark = { x: -1, y: -1 };
  
  for (let y = 150; y < 195; y++) {
    for (let x = 270; x < 720; x++) {
      const i = (y * template.width + x) * 4;
      const brightness = (templateData.data[i] + templateData.data[i+1] + templateData.data[i+2]) / 3;
      if (brightness < 80) {
        templateDarkPixels++;
        if (templateFirstDark.x === -1) {
          templateFirstDark = { x, y };
        }
      }
    }
  }
  console.log(`Dark pixels: ${templateDarkPixels}`);
  console.log(`First dark at: (${templateFirstDark.x}, ${templateFirstDark.y})`);
  
  // Check reference
  ctx.drawImage(reference, 0, 0);
  const refData = ctx.getImageData(0, 0, reference.width, reference.height);
  
  console.log('\n=== REFERENCE - Name Amharic area (y=150-195, x=270-720) ===');
  let refDarkPixels = 0;
  let refFirstDark = { x: -1, y: -1 };
  
  for (let y = 150; y < 195; y++) {
    for (let x = 270; x < 720; x++) {
      const i = (y * reference.width + x) * 4;
      const brightness = (refData.data[i] + refData.data[i+1] + refData.data[i+2]) / 3;
      if (brightness < 80) {
        refDarkPixels++;
        if (refFirstDark.x === -1) {
          refFirstDark = { x, y };
        }
      }
    }
  }
  console.log(`Dark pixels: ${refDarkPixels}`);
  console.log(`First dark at: (${refFirstDark.x}, ${refFirstDark.y})`);
  
  // The difference tells us what's in template vs what's added
  console.log('\n=== ANALYSIS ===');
  if (templateDarkPixels > 100) {
    console.log('Template has text in name area (likely the label)');
    console.log(`Template text starts at x=${templateFirstDark.x}`);
    console.log(`Reference text starts at x=${refFirstDark.x}`);
    console.log(`Value should start at x=${refFirstDark.x} (same as reference)`);
  } else {
    console.log('Template name area is empty - we add the full name');
    console.log(`Reference name starts at x=${refFirstDark.x}`);
  }
}

checkNameArea().catch(console.error);
