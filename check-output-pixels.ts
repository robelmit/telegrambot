/**
 * Check specific pixels in output to see what color they are
 */
import sharp from 'sharp';

async function checkPixels() {
  console.log('Checking output pixels...\n');

  const output = await sharp('test-output/front_color.png').raw().toBuffer({ resolveWithObject: true });
  
  // Check pixels at text positions
  const positions = [
    { x: 444, y: 152, label: 'Name Amharic' },
    { x: 444, y: 178, label: 'Name English' },
    { x: 413, y: 287, label: 'DOB' },
    { x: 430, y: 354, label: 'Sex' },
    { x: 578, y: 444, label: 'Expiry' },
    { x: 380, y: 520, label: 'FAN' },
  ];

  for (const pos of positions) {
    // Check a 20x20 area around the position
    let darkCount = 0;
    let colors: string[] = [];
    
    for (let dy = 0; dy < 20; dy++) {
      for (let dx = 0; dx < 20; dx++) {
        const x = pos.x + dx;
        const y = pos.y + dy;
        const idx = (y * output.info.width + x) * 3;
        const r = output.data[idx];
        const g = output.data[idx + 1];
        const b = output.data[idx + 2];
        const brightness = (r + g + b) / 3;
        
        if (brightness < 150) {
          darkCount++;
          if (colors.length < 3) {
            colors.push(`rgb(${r},${g},${b})`);
          }
        }
      }
    }
    
    console.log(`${pos.label} at (${pos.x}, ${pos.y}):`);
    console.log(`  Dark pixels in 20x20 area: ${darkCount}`);
    if (colors.length > 0) {
      console.log(`  Sample colors: ${colors.join(', ')}`);
    }
  }

  // Also check the debug image
  console.log('\n=== Debug image check ===');
  const debug = await sharp('test-output/debug_positions.png').raw().toBuffer({ resolveWithObject: true });
  
  for (const pos of positions) {
    const idx = (pos.y * debug.info.width + pos.x) * 3;
    const r = debug.data[idx];
    const g = debug.data[idx + 1];
    const b = debug.data[idx + 2];
    console.log(`${pos.label}: rgb(${r},${g},${b})`);
  }
}

checkPixels().catch(console.error);
