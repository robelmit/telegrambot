/**
 * Precise pixel-level comparison to identify exact differences
 */

import { createCanvas, loadImage } from 'canvas';
import fs from 'fs/promises';

async function compareImages() {
  const refFront = await loadImage('template/front.JPG');
  const rendered = await loadImage('test-output/front_color.png');
  
  const canvas = createCanvas(refFront.width, refFront.height);
  const ctx = canvas.getContext('2d');
  
  // Draw reference
  ctx.drawImage(refFront, 0, 0);
  const refData = ctx.getImageData(0, 0, refFront.width, refFront.height);
  
  // Draw rendered
  ctx.drawImage(rendered, 0, 0);
  const renderedData = ctx.getImageData(0, 0, refFront.width, refFront.height);
  
  // Find text regions in reference that differ from rendered
  console.log('=== ANALYZING FRONT CARD DIFFERENCES ===\n');
  
  // Check specific regions
  const regions = [
    { name: 'Name Amharic', x1: 270, y1: 145, x2: 720, y2: 190 },
    { name: 'Name English', x1: 270, y1: 185, x2: 720, y2: 235 },
    { name: 'DOB', x1: 270, y1: 260, x2: 620, y2: 315 },
    { name: 'Sex', x1: 270, y1: 350, x2: 520, y2: 415 },
    { name: 'Expiry', x1: 270, y1: 440, x2: 620, y2: 495 },
    { name: 'FAN', x1: 310, y1: 525, x2: 760, y2: 575 },
    { name: 'Barcode', x1: 310, y1: 560, x2: 820, y2: 600 },
    { name: 'Photo', x1: 50, y1: 125, x2: 250, y2: 370 },
    { name: 'Small Photo', x1: 845, y1: 455, x2: 960, y2: 595 },
  ];
  
  for (const region of regions) {
    let diffPixels = 0;
    let totalPixels = 0;
    let firstDiffX = -1, firstDiffY = -1;
    
    for (let y = region.y1; y < region.y2; y++) {
      for (let x = region.x1; x < region.x2; x++) {
        const i = (y * refFront.width + x) * 4;
        totalPixels++;
        
        const refBrightness = (refData.data[i] + refData.data[i+1] + refData.data[i+2]) / 3;
        const rendBrightness = (renderedData.data[i] + renderedData.data[i+1] + renderedData.data[i+2]) / 3;
        
        // Check if reference has dark text but rendered doesn't (or vice versa)
        const refIsDark = refBrightness < 100;
        const rendIsDark = rendBrightness < 100;
        
        if (refIsDark !== rendIsDark) {
          diffPixels++;
          if (firstDiffX === -1) {
            firstDiffX = x;
            firstDiffY = y;
          }
        }
      }
    }
    
    const diffPercent = ((diffPixels / totalPixels) * 100).toFixed(1);
    if (diffPixels > 100) {
      console.log(`${region.name}: ${diffPercent}% different (${diffPixels} pixels)`);
      if (firstDiffX !== -1) {
        console.log(`  First difference at: (${firstDiffX}, ${firstDiffY})`);
      }
    } else {
      console.log(`${region.name}: OK (${diffPercent}% diff)`);
    }
  }
  
  // Now analyze back card
  console.log('\n=== ANALYZING BACK CARD DIFFERENCES ===\n');
  
  const refBack = await loadImage('template/back.JPG');
  const renderedBack = await loadImage('test-output/back_color.png');
  
  ctx.drawImage(refBack, 0, 0);
  const refBackData = ctx.getImageData(0, 0, refBack.width, refBack.height);
  
  ctx.drawImage(renderedBack, 0, 0);
  const renderedBackData = ctx.getImageData(0, 0, refBack.width, refBack.height);
  
  const backRegions = [
    { name: 'Phone', x1: 20, y1: 35, x2: 220, y2: 85 },
    { name: 'ET', x1: 170, y1: 120, x2: 240, y2: 170 },
    { name: 'Region', x1: 20, y1: 190, x2: 180, y2: 270 },
    { name: 'City', x1: 20, y1: 250, x2: 150, y2: 330 },
    { name: 'Subcity', x1: 20, y1: 310, x2: 230, y2: 395 },
    { name: 'QR Code', x1: 475, y1: 10, x2: 890, y2: 420 },
    { name: 'FIN', x1: 95, y1: 420, x2: 280, y2: 460 },
    { name: 'SN', x1: 805, y1: 460, x2: 960, y2: 505 },
  ];
  
  for (const region of backRegions) {
    let diffPixels = 0;
    let totalPixels = 0;
    let firstDiffX = -1, firstDiffY = -1;
    
    for (let y = region.y1; y < region.y2; y++) {
      for (let x = region.x1; x < region.x2; x++) {
        const i = (y * refBack.width + x) * 4;
        totalPixels++;
        
        const refBrightness = (refBackData.data[i] + refBackData.data[i+1] + refBackData.data[i+2]) / 3;
        const rendBrightness = (renderedBackData.data[i] + renderedBackData.data[i+1] + renderedBackData.data[i+2]) / 3;
        
        const refIsDark = refBrightness < 100;
        const rendIsDark = rendBrightness < 100;
        
        if (refIsDark !== rendIsDark) {
          diffPixels++;
          if (firstDiffX === -1) {
            firstDiffX = x;
            firstDiffY = y;
          }
        }
      }
    }
    
    const diffPercent = ((diffPixels / totalPixels) * 100).toFixed(1);
    if (diffPixels > 100) {
      console.log(`${region.name}: ${diffPercent}% different (${diffPixels} pixels)`);
      if (firstDiffX !== -1) {
        console.log(`  First difference at: (${firstDiffX}, ${firstDiffY})`);
      }
    } else {
      console.log(`${region.name}: OK (${diffPercent}% diff)`);
    }
  }
  
  // Create visual diff highlighting problem areas
  console.log('\n=== CREATING VISUAL DIFF ===');
  
  const diffCanvas = createCanvas(refFront.width, refFront.height);
  const diffCtx = diffCanvas.getContext('2d');
  
  // Start with rendered image
  diffCtx.drawImage(rendered, 0, 0);
  
  // Highlight areas where reference has text but rendered doesn't (in red)
  // And where rendered has text but reference doesn't (in blue)
  const diffImageData = diffCtx.getImageData(0, 0, refFront.width, refFront.height);
  
  for (let i = 0; i < refData.data.length; i += 4) {
    const refBrightness = (refData.data[i] + refData.data[i+1] + refData.data[i+2]) / 3;
    const rendBrightness = (diffImageData.data[i] + diffImageData.data[i+1] + diffImageData.data[i+2]) / 3;
    
    const refIsDark = refBrightness < 80;
    const rendIsDark = rendBrightness < 80;
    
    if (refIsDark && !rendIsDark) {
      // Reference has text, rendered doesn't - mark RED
      diffImageData.data[i] = 255;
      diffImageData.data[i+1] = 0;
      diffImageData.data[i+2] = 0;
    } else if (!refIsDark && rendIsDark) {
      // Rendered has text, reference doesn't - mark BLUE
      diffImageData.data[i] = 0;
      diffImageData.data[i+1] = 0;
      diffImageData.data[i+2] = 255;
    }
  }
  
  diffCtx.putImageData(diffImageData, 0, 0);
  
  // Add legend
  diffCtx.fillStyle = '#ff0000';
  diffCtx.fillRect(10, 10, 20, 20);
  diffCtx.fillStyle = '#000000';
  diffCtx.font = '14px Arial';
  diffCtx.fillText('RED = Missing in rendered', 35, 25);
  
  diffCtx.fillStyle = '#0000ff';
  diffCtx.fillRect(10, 35, 20, 20);
  diffCtx.fillStyle = '#000000';
  diffCtx.fillText('BLUE = Extra in rendered', 35, 50);
  
  await fs.writeFile('test-output/visual_diff_front.png', diffCanvas.toBuffer('image/png'));
  console.log('Saved: test-output/visual_diff_front.png');
}

compareImages().catch(console.error);
