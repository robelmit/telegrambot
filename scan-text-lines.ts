/**
 * Scan horizontal lines to find text positions
 */
import sharp from 'sharp';

async function scanTextLines() {
  console.log('Scanning for text positions...\n');

  // Load the filled reference images
  const frontData = await sharp('template/front.JPG')
    .resize(1012, 638)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const backData = await sharp('template/back.JPG')
    .resize(1012, 638)
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Scan for dark pixels (text) in specific regions
  console.log('=== FRONT CARD ANALYSIS ===\n');

  // Name area (y: 100-200, x: 250-800)
  console.log('Name area (y: 100-200):');
  scanRegion(frontData.data, frontData.info.width, 250, 100, 550, 100);

  // DOB area (y: 240-290)
  console.log('\nDOB area (y: 240-290):');
  scanRegion(frontData.data, frontData.info.width, 250, 240, 550, 50);

  // Sex area (y: 330-380)
  console.log('\nSex area (y: 330-380):');
  scanRegion(frontData.data, frontData.info.width, 250, 330, 550, 50);

  // Expiry area (y: 420-470)
  console.log('\nExpiry area (y: 420-470):');
  scanRegion(frontData.data, frontData.info.width, 250, 420, 550, 50);

  // FAN area (y: 500-540)
  console.log('\nFAN area (y: 500-540):');
  scanRegion(frontData.data, frontData.info.width, 250, 500, 600, 40);

  // Barcode area (y: 550-620)
  console.log('\nBarcode area (y: 550-620):');
  scanRegion(frontData.data, frontData.info.width, 250, 550, 600, 70);

  console.log('\n=== BACK CARD ANALYSIS ===\n');

  // Phone area (y: 30-80)
  console.log('Phone area (y: 30-80):');
  scanRegion(backData.data, backData.info.width, 10, 30, 250, 50);

  // Address area (y: 200-500)
  console.log('\nAddress area (y: 200-500):');
  scanRegion(backData.data, backData.info.width, 10, 200, 450, 300);

  // FIN area (y: 530-580)
  console.log('\nFIN area (y: 530-580):');
  scanRegion(backData.data, backData.info.width, 10, 530, 400, 50);

  // SN area (y: 580-630)
  console.log('\nSN area (y: 580-630):');
  scanRegion(backData.data, backData.info.width, 750, 580, 250, 50);
}

function scanRegion(data: Buffer, width: number, startX: number, startY: number, regionWidth: number, regionHeight: number) {
  // Find rows with dark pixels (text)
  const textRows: number[] = [];
  
  for (let y = startY; y < startY + regionHeight; y++) {
    let darkPixelCount = 0;
    let firstDarkX = -1;
    let lastDarkX = -1;
    
    for (let x = startX; x < startX + regionWidth; x++) {
      const idx = (y * width + x) * 3;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const brightness = (r + g + b) / 3;
      
      if (brightness < 100) { // Dark pixel (text)
        darkPixelCount++;
        if (firstDarkX === -1) firstDarkX = x;
        lastDarkX = x;
      }
    }
    
    if (darkPixelCount > 5) { // Row has text
      textRows.push(y);
      if (textRows.length <= 5) {
        console.log(`  Row ${y}: ${darkPixelCount} dark pixels, x: ${firstDarkX}-${lastDarkX}`);
      }
    }
  }
  
  if (textRows.length > 0) {
    const firstRow = textRows[0];
    const lastRow = textRows[textRows.length - 1];
    console.log(`  Text found: y=${firstRow} to y=${lastRow} (${textRows.length} rows)`);
  } else {
    console.log('  No text found in this region');
  }
}

scanTextLines().catch(console.error);
