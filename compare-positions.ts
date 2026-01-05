/**
 * Compare text positions between reference and output
 */
import sharp from 'sharp';

async function comparePositions() {
  console.log('Comparing text positions...\n');

  // Load reference and output
  const refFront = await sharp('template/front.JPG').resize(1012, 638).raw().toBuffer({ resolveWithObject: true });
  const outFront = await sharp('test-output/front_color.png').raw().toBuffer({ resolveWithObject: true });

  console.log('=== FRONT CARD COMPARISON ===\n');

  // Compare name area
  console.log('Name area (y: 150-200):');
  console.log('Reference:');
  scanRegion(refFront.data, refFront.info.width, 380, 150, 300, 50, '  ');
  console.log('Output:');
  scanRegion(outFront.data, outFront.info.width, 380, 150, 300, 50, '  ');

  // Compare DOB area
  console.log('\nDOB area (y: 260-290):');
  console.log('Reference:');
  scanRegion(refFront.data, refFront.info.width, 380, 260, 300, 30, '  ');
  console.log('Output:');
  scanRegion(outFront.data, outFront.info.width, 380, 260, 300, 30, '  ');

  // Compare Sex area
  console.log('\nSex area (y: 350-380):');
  console.log('Reference:');
  scanRegion(refFront.data, refFront.info.width, 380, 350, 300, 30, '  ');
  console.log('Output:');
  scanRegion(outFront.data, outFront.info.width, 380, 350, 300, 30, '  ');

  // Compare Expiry area
  console.log('\nExpiry area (y: 440-470):');
  console.log('Reference:');
  scanRegion(refFront.data, refFront.info.width, 380, 440, 300, 30, '  ');
  console.log('Output:');
  scanRegion(outFront.data, outFront.info.width, 380, 440, 300, 30, '  ');

  // Compare FAN area
  console.log('\nFAN area (y: 520-550):');
  console.log('Reference:');
  scanRegion(refFront.data, refFront.info.width, 380, 520, 300, 30, '  ');
  console.log('Output:');
  scanRegion(outFront.data, outFront.info.width, 380, 520, 300, 30, '  ');

  // Back card
  const refBack = await sharp('template/back.JPG').resize(1012, 638).raw().toBuffer({ resolveWithObject: true });
  const outBack = await sharp('test-output/back_color.png').raw().toBuffer({ resolveWithObject: true });

  console.log('\n=== BACK CARD COMPARISON ===\n');

  // Phone
  console.log('Phone area (y: 55-75):');
  console.log('Reference:');
  scanRegion(refBack.data, refBack.info.width, 20, 55, 200, 20, '  ');
  console.log('Output:');
  scanRegion(outBack.data, outBack.info.width, 20, 55, 200, 20, '  ');

  // FIN
  console.log('\nFIN area (y: 550-575):');
  console.log('Reference:');
  scanRegion(refBack.data, refBack.info.width, 50, 550, 300, 25, '  ');
  console.log('Output:');
  scanRegion(outBack.data, outBack.info.width, 50, 550, 300, 25, '  ');

  // SN
  console.log('\nSN area (y: 585-615):');
  console.log('Reference:');
  scanRegion(refBack.data, refBack.info.width, 820, 585, 180, 30, '  ');
  console.log('Output:');
  scanRegion(outBack.data, outBack.info.width, 820, 585, 180, 30, '  ');
}

function scanRegion(data: Buffer, width: number, startX: number, startY: number, regionWidth: number, regionHeight: number, prefix: string) {
  let firstTextRow = -1;
  let lastTextRow = -1;
  let firstTextX = -1;
  
  for (let y = startY; y < startY + regionHeight; y++) {
    let darkPixelCount = 0;
    let firstDarkX = -1;
    
    for (let x = startX; x < startX + regionWidth; x++) {
      const idx = (y * width + x) * 3;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const brightness = (r + g + b) / 3;
      
      if (brightness < 100) {
        darkPixelCount++;
        if (firstDarkX === -1) firstDarkX = x;
      }
    }
    
    if (darkPixelCount > 3) {
      if (firstTextRow === -1) {
        firstTextRow = y;
        firstTextX = firstDarkX;
      }
      lastTextRow = y;
    }
  }
  
  if (firstTextRow !== -1) {
    console.log(`${prefix}Text at y=${firstTextRow}-${lastTextRow}, starts x=${firstTextX}`);
  } else {
    console.log(`${prefix}No text found`);
  }
}

comparePositions().catch(console.error);
