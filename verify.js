const sharp = require('sharp');

async function verify() {
  const output = await sharp('test_front_color.png').raw().toBuffer({ resolveWithObject: true });
  const W = 1344;
  
  // Check horizontal line at each text Y position
  const lines = [
    { name: 'Name line', y: 112 },
    { name: 'Name line 2', y: 138 },
    { name: 'DOB line', y: 275 },
    { name: 'Sex line', y: 375 },
    { name: 'Expiry line', y: 472 },
    { name: 'FAN line', y: 555 }
  ];
  
  console.log('=== LINE SCAN (looking for dark text pixels) ===\n');
  
  for (const line of lines) {
    let darkestX = -1;
    let darkestBright = 255;
    let darkCount = 0;
    
    for (let x = 350; x < 1000; x++) {
      const idx = (line.y * W + x) * 3;
      const bright = (output.data[idx] + output.data[idx+1] + output.data[idx+2]) / 3;
      
      if (bright < darkestBright) {
        darkestBright = bright;
        darkestX = x;
      }
      if (bright < 100) darkCount++;
    }
    
    console.log(`${line.name} (y=${line.y}): darkest at x=${darkestX} (brightness=${Math.round(darkestBright)}), ${darkCount} very dark pixels`);
  }
  
  // Check photo area
  console.log('\n=== PHOTO AREA ===');
  let minBright = 255, maxBright = 0;
  for (let y = 180; y < 430; y += 5) {
    for (let x = 60; x < 250; x += 5) {
      const idx = (y * W + x) * 3;
      const bright = (output.data[idx] + output.data[idx+1] + output.data[idx+2]) / 3;
      minBright = Math.min(minBright, bright);
      maxBright = Math.max(maxBright, bright);
    }
  }
  console.log(`Photo area brightness range: ${Math.round(minBright)} - ${Math.round(maxBright)}`);
}

verify().catch(console.error);
