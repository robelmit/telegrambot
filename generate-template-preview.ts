/**
 * One-time script to generate template preview image
 * Run with: npx ts-node generate-template-preview.ts
 */
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { createCanvas, loadImage, registerFont } from 'canvas';
import JsBarcode from 'jsbarcode';

const ASSETS_DIR = path.join(__dirname, 'src/assets');
const FONTS_DIR = path.join(__dirname, 'src/assets/fonts');
const OUTPUT_PATH = path.join(ASSETS_DIR, 'template_preview.png');
const PDF_PATH = path.join(__dirname, 'fayda.pdf');

// Extract photo from PDF
async function extractPhotoFromPdf(): Promise<Buffer | null> {
  if (!fs.existsSync(PDF_PATH)) {
    console.log('fayda.pdf not found, using placeholder');
    return null;
  }
  
  const pdfBuffer = fs.readFileSync(PDF_PATH);
  const jpegStart = Buffer.from([0xFF, 0xD8, 0xFF]);
  const jpegEnd = Buffer.from([0xFF, 0xD9]);
  
  let startIndex = 0;
  const start = pdfBuffer.indexOf(jpegStart, startIndex);
  if (start === -1) return null;
  
  const end = pdfBuffer.indexOf(jpegEnd, start + 3);
  if (end === -1) return null;
  
  const imageBuffer = pdfBuffer.slice(start, end + 2);
  if (imageBuffer.length > 500) {
    console.log(`Extracted photo from PDF: ${imageBuffer.length} bytes`);
    return imageBuffer;
  }
  
  return null;
}

// Remove white background and convert to grayscale
async function processPhoto(photoBuffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(photoBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const width = info.width;
  const height = info.height;
  const pixels = Buffer.from(data);
  const threshold = 240;
  
  // Flood fill from edges
  const visited = new Set<number>();
  const queue: number[] = [];
  
  const isWhite = (idx: number) => {
    return pixels[idx] >= threshold && pixels[idx + 1] >= threshold && pixels[idx + 2] >= threshold;
  };
  
  const getIdx = (x: number, y: number) => (y * width + x) * 4;
  
  // Add edge pixels
  for (let x = 0; x < width; x++) {
    queue.push(getIdx(x, 0));
    queue.push(getIdx(x, height - 1));
  }
  for (let y = 0; y < height; y++) {
    queue.push(getIdx(0, y));
    queue.push(getIdx(width - 1, y));
  }
  
  while (queue.length > 0) {
    const idx = queue.shift()!;
    if (visited.has(idx)) continue;
    visited.add(idx);
    if (!isWhite(idx)) continue;
    
    pixels[idx + 3] = 0; // Make transparent
    
    const pixelNum = idx / 4;
    const x = pixelNum % width;
    const y = Math.floor(pixelNum / width);
    
    if (x > 0) queue.push(getIdx(x - 1, y));
    if (x < width - 1) queue.push(getIdx(x + 1, y));
    if (y > 0) queue.push(getIdx(x, y - 1));
    if (y < height - 1) queue.push(getIdx(x, y + 1));
  }
  
  // Convert to grayscale
  for (let i = 0; i < width * height * 4; i += 4) {
    const gray = Math.round(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
    pixels[i] = gray;
    pixels[i + 1] = gray;
    pixels[i + 2] = gray;
  }
  
  return sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

// Register fonts
const fontsToRegister = [
  { file: 'ARIAL.TTF', family: 'Arial', weight: 'normal' },
  { file: 'ARIALBD.TTF', family: 'Arial', weight: 'bold' },
  { file: 'OCR.ttf', family: 'OCR-B', weight: 'normal' },
];

for (const font of fontsToRegister) {
  const fontPath = path.join(FONTS_DIR, font.file);
  if (fs.existsSync(fontPath)) {
    registerFont(fontPath, { family: font.family, weight: font.weight });
  }
}

// Register Ebrima
const ebrimaPath = path.join(__dirname, 'ebrima.ttf');
if (fs.existsSync(ebrimaPath)) {
  registerFont(ebrimaPath, { family: 'Ebrima', weight: 'normal' });
}

// Sample data
const SAMPLE_DATA = {
  fullNameAmharic: 'ዓወት ትካቦ ገብረሂወት',
  fullNameEnglish: 'Awet Tikabo Gebrehiwet',
  dateOfBirthEthiopian: '1985/03/15',
  dateOfBirthGregorian: '25/11/1992',
  sex: 'Male',
  sexAmharic: 'ወንድ',
  phoneNumber: '0912345678',
  regionAmharic: 'ትግራይ',
  regionEnglish: 'Tigray',
  zoneAmharic: 'መቐለ',
  zoneEnglish: 'Mekelle',
  woredaAmharic: 'ሓድነት ክ/ከተማ',
  woredaEnglish: 'Hadnet Sub City',
  fcn: '1234 5678 9012 3456',
  fin: '1234 5678 9012',
  serialNumber: '1234567',
  issueDateGregorian: '2024/01/15',
  issueDateEthiopian: '2016/05/06',
  expiryDateGregorian: '2034/01/15',
  expiryDateEthiopian: '2026/05/06'
};

// Load layouts
const layouts = [
  JSON.parse(fs.readFileSync('src/config/cardLayout.json', 'utf-8')),
  JSON.parse(fs.readFileSync('src/config/cardLayout1.json', 'utf-8')),
  JSON.parse(fs.readFileSync('src/config/cardLayout2.json', 'utf-8'))
];

const TEMPLATE_NAMES = ['Template 1', 'Template 2', 'Template 3'];

let processedPhoto: Buffer | null = null;

async function renderCard(layout: any, layoutIndex: number): Promise<Buffer> {
  const { dimensions, front, templateFiles } = layout;
  
  const canvas = createCanvas(dimensions.width, dimensions.height);
  const ctx = canvas.getContext('2d');
  
  // Load template - use assets folder for template 3 (halefront/haleback), src/assets for others
  let templatePath: string;
  if (layoutIndex === 2) {
    // Template 3 uses assets folder
    templatePath = path.join(__dirname, 'assets', templateFiles.front);
  } else {
    templatePath = path.join(ASSETS_DIR, templateFiles.front);
  }
  
  const template = await loadImage(templatePath);
  ctx.drawImage(template, 0, 0, dimensions.width, dimensions.height);
  
  // Draw photo
  if (processedPhoto) {
    try {
      console.log(`    Drawing photo for ${templateFiles.front}...`);
      const photo = await loadImage(processedPhoto);
      console.log(`    Photo loaded: ${photo.width}x${photo.height}`);
      // Main photo
      ctx.drawImage(photo, front.mainPhoto.x, front.mainPhoto.y, front.mainPhoto.width, front.mainPhoto.height);
      console.log(`    Main photo drawn at ${front.mainPhoto.x},${front.mainPhoto.y} size ${front.mainPhoto.width}x${front.mainPhoto.height}`);
      // Small photo
      ctx.drawImage(photo, front.smallPhoto.x, front.smallPhoto.y, front.smallPhoto.width, front.smallPhoto.height);
      console.log(`    Small photo drawn at ${front.smallPhoto.x},${front.smallPhoto.y} size ${front.smallPhoto.width}x${front.smallPhoto.height}`);
    } catch (err) {
      console.error(`    Failed to draw photo:`, err);
    }
  } else {
    console.log(`    No photo available, using placeholder`);
    // Placeholder if no photo
    ctx.fillStyle = '#cccccc';
    ctx.fillRect(front.mainPhoto.x, front.mainPhoto.y, front.mainPhoto.width, front.mainPhoto.height);
    ctx.fillRect(front.smallPhoto.x, front.smallPhoto.y, front.smallPhoto.width, front.smallPhoto.height);
  }
  
  ctx.textBaseline = 'top';
  
  // Name Amharic
  ctx.fillStyle = front.nameAmharic.color;
  ctx.font = `bold ${front.nameAmharic.fontSize}px Ebrima`;
  ctx.fillText(SAMPLE_DATA.fullNameAmharic, front.nameAmharic.x, front.nameAmharic.y);
  
  // Name English
  ctx.fillStyle = front.nameEnglish.color;
  ctx.font = `bold ${front.nameEnglish.fontSize}px Arial`;
  ctx.fillText(SAMPLE_DATA.fullNameEnglish, front.nameEnglish.x, front.nameEnglish.y);
  
  // DOB
  ctx.fillStyle = front.dateOfBirth.color;
  ctx.font = `bold ${front.dateOfBirth.fontSize}px Arial`;
  ctx.fillText(`${SAMPLE_DATA.dateOfBirthGregorian} | ${SAMPLE_DATA.dateOfBirthEthiopian}`, front.dateOfBirth.x, front.dateOfBirth.y);
  
  // Sex
  ctx.fillStyle = front.sex.color;
  ctx.font = `bold ${front.sex.fontSize}px Ebrima`;
  ctx.fillText(SAMPLE_DATA.sexAmharic, front.sex.x, front.sex.y);
  const sexWidth = ctx.measureText(SAMPLE_DATA.sexAmharic).width;
  ctx.font = `bold ${front.sex.fontSize}px Arial`;
  ctx.fillText(`  |  ${SAMPLE_DATA.sex}`, front.sex.x + sexWidth, front.sex.y);
  
  // Expiry
  ctx.fillStyle = front.expiryDate.color;
  ctx.font = `bold ${front.expiryDate.fontSize}px Arial`;
  ctx.fillText(`${SAMPLE_DATA.expiryDateEthiopian} | ${SAMPLE_DATA.expiryDateGregorian}`, front.expiryDate.x, front.expiryDate.y);
  
  // FAN
  ctx.fillStyle = front.fan.color;
  ctx.font = `bold ${front.fan.fontSize}px Consolas`;
  ctx.fillText(SAMPLE_DATA.fcn, front.fan.x, front.fan.y);
  
  // Barcode
  const barcodeCanvas = createCanvas(front.barcode.width, front.barcode.height);
  JsBarcode(barcodeCanvas, SAMPLE_DATA.fcn.replace(/\s/g, ''), {
    format: 'CODE128',
    width: 2,
    height: front.barcode.height - 5,
    displayValue: false,
    margin: 0,
    background: 'transparent'
  });
  ctx.drawImage(barcodeCanvas, front.barcode.x, front.barcode.y, front.barcode.width, front.barcode.height);
  
  // Issue dates (rotated)
  if (front.dateOfIssueEthiopian) {
    ctx.fillStyle = front.dateOfIssueEthiopian.color;
    ctx.font = `bold ${front.dateOfIssueEthiopian.fontSize}px Arial`;
    ctx.save();
    ctx.translate(front.dateOfIssueEthiopian.x, front.dateOfIssueEthiopian.y);
    ctx.rotate((front.dateOfIssueEthiopian.rotation * Math.PI) / 180);
    ctx.fillText(SAMPLE_DATA.issueDateEthiopian, 0, 0);
    ctx.restore();
  }
  
  if (front.dateOfIssueGregorian) {
    ctx.fillStyle = front.dateOfIssueGregorian.color;
    ctx.font = `bold ${front.dateOfIssueGregorian.fontSize}px Arial`;
    ctx.save();
    ctx.translate(front.dateOfIssueGregorian.x, front.dateOfIssueGregorian.y);
    ctx.rotate((front.dateOfIssueGregorian.rotation * Math.PI) / 180);
    ctx.fillText(SAMPLE_DATA.issueDateGregorian, 0, 0);
    ctx.restore();
  }
  
  return canvas.toBuffer('image/png');
}

async function generatePreview() {
  console.log('Generating template preview with real rendered cards...\n');
  
  // Extract and process photo from PDF
  const rawPhoto = await extractPhotoFromPdf();
  if (rawPhoto) {
    console.log('Processing photo (removing background, converting to grayscale)...');
    processedPhoto = await processPhoto(rawPhoto);
    console.log(`Photo processed successfully: ${processedPhoto.length} bytes\n`);
    // Save processed photo for debugging
    fs.writeFileSync('test-output/preview_photo.png', processedPhoto);
    console.log('Saved processed photo to test-output/preview_photo.png\n');
  } else {
    console.log('WARNING: No photo extracted from PDF!\n');
  }
  
  const PREVIEW_WIDTH = 900;
  const TEMPLATE_HEIGHT = 280;
  const PADDING = 15;
  const LABEL_HEIGHT = 40;
  
  const templateWidth = Math.floor((PREVIEW_WIDTH - PADDING * 4) / 3);
  const totalHeight = TEMPLATE_HEIGHT + LABEL_HEIGHT + PADDING * 2;
  
  // Render each template
  const renderedCards: Buffer[] = [];
  
  for (let i = 0; i < layouts.length; i++) {
    console.log(`Rendering ${TEMPLATE_NAMES[i]}...`);
    try {
      const card = await renderCard(layouts[i], i);
      
      // Resize to fit preview
      const resized = await sharp(card)
        .resize(templateWidth, TEMPLATE_HEIGHT, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toBuffer();
      
      renderedCards.push(resized);
      console.log(`  ✓ ${TEMPLATE_NAMES[i]} rendered`);
    } catch (err) {
      console.error(`  ✗ Failed to render ${TEMPLATE_NAMES[i]}:`, err);
      // Create placeholder
      const placeholder = await sharp({
        create: {
          width: templateWidth,
          height: TEMPLATE_HEIGHT,
          channels: 4,
          background: { r: 200, g: 200, b: 200, alpha: 1 }
        }
      }).png().toBuffer();
      renderedCards.push(placeholder);
    }
  }
  
  // Create composite
  const composites: sharp.OverlayOptions[] = [];
  
  for (let i = 0; i < renderedCards.length; i++) {
    const x = PADDING + i * (templateWidth + PADDING);
    composites.push({
      input: renderedCards[i],
      left: x,
      top: LABEL_HEIGHT + PADDING
    });
  }
  
  // Create base image
  const baseImage = await sharp({
    create: {
      width: PREVIEW_WIDTH,
      height: totalHeight,
      channels: 4,
      background: { r: 240, g: 240, b: 240, alpha: 1 }
    }
  })
  .composite(composites)
  .png()
  .toBuffer();
  
  // Add bold text labels using SVG
  const svgLabels = `
    <svg width="${PREVIEW_WIDTH}" height="${totalHeight}">
      <style>
        .label { font-family: Arial, sans-serif; font-size: 20px; font-weight: 900; fill: #222; }
      </style>
      ${TEMPLATE_NAMES.map((name, i) => {
        const x = PADDING + i * (templateWidth + PADDING) + templateWidth / 2;
        return `<text x="${x}" y="28" text-anchor="middle" class="label">${name}</text>`;
      }).join('')}
    </svg>
  `;
  
  const finalPreview = await sharp(baseImage)
    .composite([{
      input: Buffer.from(svgLabels),
      top: 0,
      left: 0
    }])
    .png()
    .toBuffer();
  
  // Save
  fs.writeFileSync(OUTPUT_PATH, finalPreview);
  console.log(`\n✓ Template preview saved to: ${OUTPUT_PATH}`);
  console.log(`  Size: ${Math.round(finalPreview.length / 1024)} KB`);
}

generatePreview().catch(console.error);
