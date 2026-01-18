import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function visualCompare() {
  console.log('=== Visual Comparison Tool ===\n');
  
  const resultPath = path.join(__dirname, 'template', 'result.jpg');
  const renderedFrontPath = path.join(__dirname, 'test-output', 'rendered-front.png');
  const renderedBackPath = path.join(__dirname, 'test-output', 'rendered-back.png');
  
  // Check which files exist
  const resultExists = fs.existsSync(resultPath);
  const frontExists = fs.existsSync(renderedFrontPath);
  const backExists = fs.existsSync(renderedBackPath);
  
  console.log('Files found:');
  console.log('- Result image:', resultExists ? '✓' : '✗');
  console.log('- Rendered front:', frontExists ? '✓' : '✗');
  console.log('- Rendered back:', backExists ? '✓' : '✗');
  
  if (!resultExists) {
    console.log('\nError: result.jpg not found in template folder');
    return;
  }
  
  // Get dimensions of result image
  const resultMeta = await sharp(resultPath).metadata();
  console.log('\nResult Image:');
  console.log(`- Size: ${resultMeta.width}x${resultMeta.height}`);
  console.log(`- Aspect: ${(resultMeta.width! / resultMeta.height!).toFixed(2)}`);
  
  // The result image is portrait (904x1280), which suggests it might be:
  // 1. A photo of both cards stacked vertically
  // 2. Just one card in portrait orientation
  // 3. A screenshot from a phone
  
  const isPortrait = resultMeta.height! > resultMeta.width!;
  console.log(`- Orientation: ${isPortrait ? 'Portrait' : 'Landscape'}`);
  
  if (isPortrait) {
    console.log('\n⚠️  Result image is in portrait orientation.');
    console.log('This might be:');
    console.log('  1. Both front and back cards stacked vertically');
    console.log('  2. A single card rotated');
    console.log('  3. A screenshot from a mobile device');
  }
  
  // Try to split the image if it contains both cards
  const halfHeight = Math.floor(resultMeta.height! / 2);
  
  console.log('\n=== Attempting to split result image ===');
  
  // Extract top half (might be front card)
  const topHalf = await sharp(resultPath)
    .extract({ left: 0, top: 0, width: resultMeta.width!, height: halfHeight })
    .toBuffer();
  
  fs.writeFileSync('test-output/result-top-half.jpg', topHalf);
  console.log('Saved top half to: test-output/result-top-half.jpg');
  
  // Extract bottom half (might be back card)
  const bottomHalf = await sharp(resultPath)
    .extract({ left: 0, top: halfHeight, width: resultMeta.width!, height: halfHeight })
    .toBuffer();
  
  fs.writeFileSync('test-output/result-bottom-half.jpg', bottomHalf);
  console.log('Saved bottom half to: test-output/result-bottom-half.jpg');
  
  // Create comparison images if we have rendered cards
  if (frontExists) {
    const frontMeta = await sharp(renderedFrontPath).metadata();
    console.log('\nRendered Front Card:');
    console.log(`- Size: ${frontMeta.width}x${frontMeta.height}`);
    
    // Resize result top half to match rendered card size for comparison
    const resizedTop = await sharp(topHalf)
      .resize(frontMeta.width, frontMeta.height, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
      .toBuffer();
    
    // Create side-by-side comparison
    const comparison = await sharp({
      create: {
        width: frontMeta.width! * 2,
        height: frontMeta.height!,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
    .composite([
      { input: resizedTop, left: 0, top: 0 },
      { input: renderedFrontPath, left: frontMeta.width!, top: 0 }
    ])
    .jpeg()
    .toBuffer();
    
    fs.writeFileSync('test-output/comparison-front.jpg', comparison);
    console.log('Created comparison: test-output/comparison-front.jpg');
    console.log('  (Left: Result | Right: Our Render)');
  }
  
  if (backExists) {
    const backMeta = await sharp(renderedBackPath).metadata();
    console.log('\nRendered Back Card:');
    console.log(`- Size: ${backMeta.width}x${backMeta.height}`);
    
    // Resize result bottom half to match rendered card size for comparison
    const resizedBottom = await sharp(bottomHalf)
      .resize(backMeta.width, backMeta.height, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
      .toBuffer();
    
    // Create side-by-side comparison
    const comparison = await sharp({
      create: {
        width: backMeta.width! * 2,
        height: backMeta.height!,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
    .composite([
      { input: resizedBottom, left: 0, top: 0 },
      { input: renderedBackPath, left: backMeta.width!, top: 0 }
    ])
    .jpeg()
    .toBuffer();
    
    fs.writeFileSync('test-output/comparison-back.jpg', comparison);
    console.log('Created comparison: test-output/comparison-back.jpg');
    console.log('  (Left: Result | Right: Our Render)');
  }
  
  console.log('\n=== Comparison Complete ===');
  console.log('\nPlease check the following files:');
  console.log('1. test-output/result-top-half.jpg - Top half of result image');
  console.log('2. test-output/result-bottom-half.jpg - Bottom half of result image');
  console.log('3. test-output/comparison-front.jpg - Side-by-side front card comparison');
  console.log('4. test-output/comparison-back.jpg - Side-by-side back card comparison');
  console.log('\nVisually inspect these files to identify any differences.');
}

visualCompare().catch(console.error);
