/**
 * Debug render - check what's actually being drawn
 */
import sharp from 'sharp';

async function debugRender() {
  console.log('Debugging render output...\n');

  // Check output image
  const output = await sharp('test-output/front_color.png').raw().toBuffer({ resolveWithObject: true });
  
  console.log('Output dimensions:', output.info.width, 'x', output.info.height);

  // Scan entire image for dark pixels
  let darkPixelCount = 0;
  const darkRows: number[] = [];
  
  for (let y = 0; y < output.info.height; y++) {
    let rowDarkCount = 0;
    for (let x = 0; x < output.info.width; x++) {
      const idx = (y * output.info.width + x) * 3;
      const brightness = (output.data[idx] + output.data[idx + 1] + output.data[idx + 2]) / 3;
      if (brightness < 100) {
        darkPixelCount++;
        rowDarkCount++;
      }
    }
    if (rowDarkCount > 50) {
      darkRows.push(y);
    }
  }

  console.log('Total dark pixels:', darkPixelCount);
  console.log('Rows with significant dark pixels:', darkRows.length);
  
  if (darkRows.length > 0) {
    console.log('First 10 dark rows:', darkRows.slice(0, 10));
    console.log('Last 10 dark rows:', darkRows.slice(-10));
  }

  // Check specific areas where we expect text
  console.log('\n=== Checking specific text areas ===');
  
  // Name area (y: 150-200, x: 440-700)
  console.log('\nName area (y: 150-200, x: 440-700):');
  checkArea(output.data, output.info.width, 440, 150, 260, 50);

  // DOB area
  console.log('\nDOB area (y: 285-295, x: 410-600):');
  checkArea(output.data, output.info.width, 410, 285, 190, 10);

  // Sex area
  console.log('\nSex area (y: 352-380, x: 428-600):');
  checkArea(output.data, output.info.width, 428, 352, 172, 28);

  // FAN area
  console.log('\nFAN area (y: 518-550, x: 378-600):');
  checkArea(output.data, output.info.width, 378, 518, 222, 32);
}

function checkArea(data: Buffer, width: number, startX: number, startY: number, areaWidth: number, areaHeight: number) {
  let darkCount = 0;
  let firstDark = { x: -1, y: -1 };
  
  for (let y = startY; y < startY + areaHeight; y++) {
    for (let x = startX; x < startX + areaWidth; x++) {
      const idx = (y * width + x) * 3;
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      if (brightness < 100) {
        darkCount++;
        if (firstDark.x === -1) {
          firstDark = { x, y };
        }
      }
    }
  }
  
  console.log(`  Dark pixels: ${darkCount}`);
  if (firstDark.x !== -1) {
    console.log(`  First dark pixel at: (${firstDark.x}, ${firstDark.y})`);
  }
}

debugRender().catch(console.error);
