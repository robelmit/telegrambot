import { createCanvas, loadImage } from 'canvas';

async function inspect() {
  const template = await loadImage('template/front_template.png');
  const canvas = createCanvas(template.width, template.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(template, 0, 0);
  const data = ctx.getImageData(0, 0, template.width, template.height);

  console.log('Template size:', template.width, 'x', template.height);
  
  // Just count dark pixels in name area
  let darkCount = 0;
  for (let y = 150; y < 190; y++) {
    for (let x = 270; x < 720; x++) {
      const i = (y * template.width + x) * 4;
      const b = (data.data[i] + data.data[i+1] + data.data[i+2]) / 3;
      if (b < 100) darkCount++;
    }
  }
  console.log('Dark pixels in name area:', darkCount);
}

inspect().catch(console.error);
