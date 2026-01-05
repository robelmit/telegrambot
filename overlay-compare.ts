/**
 * Create overlay comparison - reference with rendered overlaid at 50% opacity
 */

import { createCanvas, loadImage } from 'canvas';
import fs from 'fs/promises';

async function createOverlay() {
  // Load images
  const refFront = await loadImage('template/front.JPG');
  const refBack = await loadImage('template/back.JPG');
  const renderedFront = await loadImage('test-output/front_color.png');
  const renderedBack = await loadImage('test-output/back_color.png');

  // Front overlay
  const frontCanvas = createCanvas(refFront.width, refFront.height);
  const frontCtx = frontCanvas.getContext('2d');
  
  // Draw reference
  frontCtx.drawImage(refFront, 0, 0);
  
  // Overlay rendered at 50% opacity
  frontCtx.globalAlpha = 0.5;
  frontCtx.drawImage(renderedFront, 0, 0);
  frontCtx.globalAlpha = 1.0;
  
  // Add label
  frontCtx.fillStyle = '#ff0000';
  frontCtx.font = 'bold 16px Arial';
  frontCtx.fillText('OVERLAY: Reference + Rendered (50% opacity)', 10, 20);
  
  await fs.writeFile('test-output/overlay_front.png', frontCanvas.toBuffer('image/png'));
  console.log('Saved: test-output/overlay_front.png');

  // Back overlay
  const backCanvas = createCanvas(refBack.width, refBack.height);
  const backCtx = backCanvas.getContext('2d');
  
  backCtx.drawImage(refBack, 0, 0);
  backCtx.globalAlpha = 0.5;
  backCtx.drawImage(renderedBack, 0, 0);
  backCtx.globalAlpha = 1.0;
  
  backCtx.fillStyle = '#ff0000';
  backCtx.font = 'bold 16px Arial';
  backCtx.fillText('OVERLAY: Reference + Rendered (50% opacity)', 10, 20);
  
  await fs.writeFile('test-output/overlay_back.png', backCanvas.toBuffer('image/png'));
  console.log('Saved: test-output/overlay_back.png');

  // Also create difference image (XOR-like effect)
  const diffFrontCanvas = createCanvas(refFront.width, refFront.height);
  const diffFrontCtx = diffFrontCanvas.getContext('2d');
  
  diffFrontCtx.drawImage(refFront, 0, 0);
  const refData = diffFrontCtx.getImageData(0, 0, refFront.width, refFront.height);
  
  diffFrontCtx.drawImage(renderedFront, 0, 0);
  const renderedData = diffFrontCtx.getImageData(0, 0, refFront.width, refFront.height);
  
  // Calculate difference
  for (let i = 0; i < refData.data.length; i += 4) {
    const diffR = Math.abs(refData.data[i] - renderedData.data[i]);
    const diffG = Math.abs(refData.data[i + 1] - renderedData.data[i + 1]);
    const diffB = Math.abs(refData.data[i + 2] - renderedData.data[i + 2]);
    
    // Amplify differences
    renderedData.data[i] = Math.min(255, diffR * 3);
    renderedData.data[i + 1] = Math.min(255, diffG * 3);
    renderedData.data[i + 2] = Math.min(255, diffB * 3);
    renderedData.data[i + 3] = 255;
  }
  
  diffFrontCtx.putImageData(renderedData, 0, 0);
  await fs.writeFile('test-output/diff_front.png', diffFrontCanvas.toBuffer('image/png'));
  console.log('Saved: test-output/diff_front.png (differences highlighted)');
}

createOverlay().catch(console.error);
