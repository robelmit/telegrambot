/**
 * Final visual check - create side by side with grid overlay
 */

import { createCanvas, loadImage } from 'canvas';
import fs from 'fs/promises';

async function finalCheck() {
  const refFront = await loadImage('template/front.JPG');
  const rendered = await loadImage('test-output/front_color.png');
  
  // Create side-by-side with alignment grid
  const canvas = createCanvas(refFront.width * 2 + 40, refFront.height + 60);
  const ctx = canvas.getContext('2d');
  
  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw reference
  ctx.drawImage(refFront, 10, 50);
  
  // Draw rendered
  ctx.drawImage(rendered, refFront.width + 30, 50);
  
  // Add labels
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 20px Arial';
  ctx.fillText('REFERENCE (front.JPG)', 10, 30);
  ctx.fillText('RENDERED (front_color.png)', refFront.width + 30, 30);
  
  // Draw horizontal guide lines at key Y positions
  ctx.strokeStyle = '#ff000050';
  ctx.lineWidth = 1;
  
  const yPositions = [
    { y: 155, label: 'Name Am' },
    { y: 192, label: 'Name En' },
    { y: 272, label: 'DOB' },
    { y: 362, label: 'Sex' },
    { y: 452, label: 'Expiry' },
    { y: 538, label: 'FAN' },
  ];
  
  for (const pos of yPositions) {
    // Line on reference
    ctx.beginPath();
    ctx.moveTo(10, 50 + pos.y);
    ctx.lineTo(10 + refFront.width, 50 + pos.y);
    ctx.stroke();
    
    // Line on rendered
    ctx.beginPath();
    ctx.moveTo(refFront.width + 30, 50 + pos.y);
    ctx.lineTo(refFront.width + 30 + refFront.width, 50 + pos.y);
    ctx.stroke();
    
    // Label
    ctx.fillStyle = '#ff0000';
    ctx.font = '10px Arial';
    ctx.fillText(pos.label, refFront.width + 15, 50 + pos.y);
  }
  
  await fs.writeFile('test-output/final_comparison_front.png', canvas.toBuffer('image/png'));
  console.log('Saved: test-output/final_comparison_front.png');
  
  // Same for back
  const refBack = await loadImage('template/back.JPG');
  const renderedBack = await loadImage('test-output/back_color.png');
  
  const canvasBack = createCanvas(refBack.width * 2 + 40, refBack.height + 60);
  const ctxBack = canvasBack.getContext('2d');
  
  ctxBack.fillStyle = '#ffffff';
  ctxBack.fillRect(0, 0, canvasBack.width, canvasBack.height);
  
  ctxBack.drawImage(refBack, 10, 50);
  ctxBack.drawImage(renderedBack, refBack.width + 30, 50);
  
  ctxBack.fillStyle = '#000000';
  ctxBack.font = 'bold 20px Arial';
  ctxBack.fillText('REFERENCE (back.JPG)', 10, 30);
  ctxBack.fillText('RENDERED (back_color.png)', refBack.width + 30, 30);
  
  await fs.writeFile('test-output/final_comparison_back.png', canvasBack.toBuffer('image/png'));
  console.log('Saved: test-output/final_comparison_back.png');
  
  console.log('\nCheck test-output/final_comparison_front.png and final_comparison_back.png');
  console.log('Red lines show the Y positions where text should align.');
}

finalCheck().catch(console.error);
