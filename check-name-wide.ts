import { createCanvas, loadImage } from 'canvas';

async function check() {
  const reference = await loadImage('template/front.JPG');
  const canvas = createCanvas(reference.width, reference.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(reference, 0, 0);
  const data = ctx.getImageData(0, 0, reference.width, reference.height);
  
  console.log('Scanning for first dark pixel in name area (y=145-200, x=270-720):');
  
  for (let y = 145; y < 200; y++) {
    for (let x = 270; x < 720; x++) {
      const i = (y * reference.width + x) * 4;
      const brightness = (data.data[i] + data.data[i+1] + data.data[i+2]) / 3;
      if (brightness < 80) {
        console.log(`First dark at (${x}, ${y}), brightness=${brightness.toFixed(0)}`);
        
        // Show a few more
        let count = 0;
        for (let y2 = y; y2 < y + 5 && count < 10; y2++) {
          for (let x2 = x; x2 < x + 200 && count < 10; x2++) {
            const i2 = (y2 * reference.width + x2) * 4;
            const b2 = (data.data[i2] + data.data[i2+1] + data.data[i2+2]) / 3;
            if (b2 < 80) {
              console.log(`  Dark pixel at (${x2}, ${y2})`);
              count++;
            }
          }
        }
        return;
      }
    }
  }
}

check().catch(console.error);
