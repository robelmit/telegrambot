/**
 * Prepare reference images for Gemini analysis
 * Resize to exact 1012x638 dimensions
 */
import sharp from 'sharp';
import fs from 'fs/promises';

async function prepareForGemini() {
  console.log('Preparing images for Gemini analysis...\n');

  await fs.mkdir('test-output/gemini', { recursive: true });

  // Check original dimensions
  const frontMeta = await sharp('template/front.JPG').metadata();
  const backMeta = await sharp('template/back.JPG').metadata();

  console.log('Original front.JPG:', frontMeta.width, 'x', frontMeta.height);
  console.log('Original back.JPG:', backMeta.width, 'x', backMeta.height);

  // Resize to exact 1012x638 (the target card dimensions)
  await sharp('template/front.JPG')
    .resize(1012, 638, { fit: 'fill' })
    .toFile('test-output/gemini/front_1012x638.png');
  console.log('\n✓ Created front_1012x638.png');

  await sharp('template/back.JPG')
    .resize(1012, 638, { fit: 'fill' })
    .toFile('test-output/gemini/back_1012x638.png');
  console.log('✓ Created back_1012x638.png');

  console.log('\n=== PROMPT FOR GEMINI ===\n');
  console.log(`I have two ID card images (front and back) with exact dimensions of 1012 x 638 pixels.

Please analyze these images and provide the EXACT pixel coordinates for where each text value is positioned.

For each field, provide:
- x: horizontal position (pixels from left edge)
- y: vertical position (pixels from top edge)  
- fontSize: estimated font size in pixels
- fontWeight: normal or bold

FRONT CARD fields to locate:
1. Full Name (Amharic script) - the name in Ethiopian script
2. Full Name (English) - the name in Latin letters below Amharic
3. Date of Birth - the date values (format: DD/MM/YYYY | Ethiopian date)
4. Sex - the gender values (Amharic | English)
5. Expiry Date - the expiry date values
6. FAN Number - the long number near bottom (format: XXXX XXXX XXXX XXXX)
7. Barcode - the barcode area (provide x, y, width, height)
8. Issue Date - the rotated date on left edge
9. Main Photo - the large photo area (provide x, y, width, height)
10. Small Photo - the small photo at bottom right (provide x, y, width, height)

BACK CARD fields to locate:
1. Phone Number - at top left
2. ET - nationality code
3. Region (Amharic) - region name in Ethiopian script
4. Region (English) - region name in English
5. City (Amharic) - city name in Ethiopian script
6. City (English) - city name in English
7. Subcity (Amharic) - subcity in Ethiopian script
8. Subcity (English) - subcity in English
9. QR Code - the QR code area (provide x, y, width, height)
10. FIN Number - the identification number at bottom
11. Serial Number - the red number at bottom right

IMPORTANT: 
- The image dimensions are exactly 1012 x 638 pixels
- Measure from the TOP-LEFT corner of each text element
- Coordinates must be within 0-1012 for x and 0-638 for y
- Be as precise as possible

Please provide the coordinates in this format:
FRONT CARD:
- Field Name: x=XXX, y=XXX, fontSize=XXpx, fontWeight=bold/normal

BACK CARD:
- Field Name: x=XXX, y=XXX, fontSize=XXpx, fontWeight=bold/normal
`);

  console.log('\n=== FILES READY ===');
  console.log('Upload these files to Gemini:');
  console.log('1. test-output/gemini/front_1012x638.png');
  console.log('2. test-output/gemini/back_1012x638.png');
}

prepareForGemini().catch(console.error);
