/**
 * Find text positions by comparing filled reference with template
 * Areas that differ significantly contain the filled-in values
 */
import sharp from 'sharp';

async function findTextPositions() {
  console.log('Finding text positions by comparing template vs filled...\n');

  // Create difference image to highlight where values are
  const template = await sharp('template/front_template.png').raw().toBuffer({ resolveWithObject: true });
  const filled = await sharp('template/front.JPG').resize(1012, 638).raw().toBuffer({ resolveWithObject: true });

  console.log('Template:', template.info.width, 'x', template.info.height);
  console.log('Filled:', filled.info.width, 'x', filled.info.height);

  // Create a difference image
  const diffBuffer = Buffer.alloc(template.data.length);
  for (let i = 0; i < template.data.length; i += 3) {
    const rDiff = Math.abs(template.data[i] - filled.data[i]);
    const gDiff = Math.abs(template.data[i + 1] - filled.data[i + 1]);
    const bDiff = Math.abs(template.data[i + 2] - filled.data[i + 2]);
    const diff = (rDiff + gDiff + bDiff) / 3;
    
    // Highlight differences in red
    if (diff > 30) {
      diffBuffer[i] = 255;     // R
      diffBuffer[i + 1] = 0;   // G
      diffBuffer[i + 2] = 0;   // B
    } else {
      diffBuffer[i] = template.data[i];
      diffBuffer[i + 1] = template.data[i + 1];
      diffBuffer[i + 2] = template.data[i + 2];
    }
  }

  await sharp(diffBuffer, {
    raw: {
      width: template.info.width,
      height: template.info.height,
      channels: 3
    }
  }).toFile('test-output/front_text_positions.png');

  console.log('✓ Created front_text_positions.png (red = text areas)');

  // Do the same for back
  const backTemplate = await sharp('template/back_template.png').raw().toBuffer({ resolveWithObject: true });
  const backFilled = await sharp('template/back.JPG').resize(1012, 638).raw().toBuffer({ resolveWithObject: true });

  const backDiffBuffer = Buffer.alloc(backTemplate.data.length);
  for (let i = 0; i < backTemplate.data.length; i += 3) {
    const rDiff = Math.abs(backTemplate.data[i] - backFilled.data[i]);
    const gDiff = Math.abs(backTemplate.data[i + 1] - backFilled.data[i + 1]);
    const bDiff = Math.abs(backTemplate.data[i + 2] - backFilled.data[i + 2]);
    const diff = (rDiff + gDiff + bDiff) / 3;
    
    if (diff > 30) {
      backDiffBuffer[i] = 255;
      backDiffBuffer[i + 1] = 0;
      backDiffBuffer[i + 2] = 0;
    } else {
      backDiffBuffer[i] = backTemplate.data[i];
      backDiffBuffer[i + 1] = backTemplate.data[i + 1];
      backDiffBuffer[i + 2] = backTemplate.data[i + 2];
    }
  }

  await sharp(backDiffBuffer, {
    raw: {
      width: backTemplate.info.width,
      height: backTemplate.info.height,
      channels: 3
    }
  }).toFile('test-output/back_text_positions.png');

  console.log('✓ Created back_text_positions.png (red = text areas)');

  // Now find bounding boxes of red areas
  console.log('\nAnalyzing text regions...');
  
  // Scan for red regions in front image
  const frontRegions = findRedRegions(diffBuffer, template.info.width, template.info.height);
  console.log('\nFront card text regions found:');
  frontRegions.forEach((r, i) => {
    console.log(`  Region ${i + 1}: x=${r.x}, y=${r.y}, w=${r.width}, h=${r.height}`);
  });

  const backRegions = findRedRegions(backDiffBuffer, backTemplate.info.width, backTemplate.info.height);
  console.log('\nBack card text regions found:');
  backRegions.forEach((r, i) => {
    console.log(`  Region ${i + 1}: x=${r.x}, y=${r.y}, w=${r.width}, h=${r.height}`);
  });
}

interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

function findRedRegions(buffer: Buffer, width: number, height: number): Region[] {
  const regions: Region[] = [];
  const visited = new Set<string>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      const isRed = buffer[idx] === 255 && buffer[idx + 1] === 0 && buffer[idx + 2] === 0;
      
      if (isRed && !visited.has(`${x},${y}`)) {
        // Found a new red region, flood fill to find bounds
        const bounds = floodFillBounds(buffer, width, height, x, y, visited);
        if (bounds.width > 10 && bounds.height > 5) { // Filter small noise
          regions.push(bounds);
        }
      }
    }
  }

  // Sort by Y position
  return regions.sort((a, b) => a.y - b.y);
}

function floodFillBounds(buffer: Buffer, width: number, height: number, startX: number, startY: number, visited: Set<string>): Region {
  let minX = startX, maxX = startX, minY = startY, maxY = startY;
  const stack = [[startX, startY]];

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const key = `${x},${y}`;
    
    if (visited.has(key) || x < 0 || x >= width || y < 0 || y >= height) continue;
    
    const idx = (y * width + x) * 3;
    const isRed = buffer[idx] === 255 && buffer[idx + 1] === 0 && buffer[idx + 2] === 0;
    
    if (!isRed) continue;
    
    visited.add(key);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    // Check neighbors (4-connected for speed)
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  };
}

findTextPositions().catch(console.error);
