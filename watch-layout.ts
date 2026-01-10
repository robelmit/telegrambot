/**
 * Watch cardLayout.json (Template 1) and re-render on save
 * Uses real data from fayda.pdf
 * Run with: npx ts-node watch-layout.ts
 */

import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { createCanvas, loadImage, registerFont } from 'canvas';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import sharp from 'sharp';

const LAYOUT_PATH = 'src/config/cardLayout.json';
const TEMPLATE_DIR = 'src/assets';
const OUTPUT_DIR = 'test-output';
const FONTS_DIR = path.resolve(__dirname, 'src/assets/fonts');
const PDF_PATH = 'fayda.pdf';

interface ParsedData {
  fullNameAmharic: string;
  fullNameEnglish: string;
  dateOfBirthEthiopian: string;
  dateOfBirthGregorian: string;
  sex: string;
  sexAmharic: string;
  phoneNumber: string;
  regionAmharic: string;
  regionEnglish: string;
  zoneAmharic: string;
  zoneEnglish: string;
  woredaAmharic: string;
  woredaEnglish: string;
  fcn: string;
  fin: string;
  photo?: Buffer;
  qrCode?: Buffer;
  issueDateEthiopian: string;
  issueDateGregorian: string;
  expiryDateEthiopian: string;
  expiryDateGregorian: string;
  serialNumber: string;
}

// Register fonts
const fontsToRegister = [
  { file: 'Inter-Medium.otf', family: 'InterMedium', weight: 'normal' },
  { file: 'Inter-SemiBold.otf', family: 'InterSemiBold', weight: 'normal' },
  { file: 'Inter-Bold.otf', family: 'InterBold', weight: 'normal' },
  { file: 'OCR.ttf', family: 'OCRB', weight: 'normal' },
  { file: 'ARIAL.TTF', family: 'Arial', weight: 'normal' },
  { file: 'ARIALBD.TTF', family: 'Arial', weight: 'bold' },
];

for (const font of fontsToRegister) {
  const fontPath = path.join(FONTS_DIR, font.file);
  if (fs.existsSync(fontPath)) {
    try {
      registerFont(fontPath, { family: font.family, weight: font.weight });
      console.log(`✓ Registered: ${font.file} as ${font.family}`);
    } catch (err) {
      console.log(`✗ Failed to register: ${font.file} - ${err}`);
    }
  }
}

// Register Ebrima
const ebrimaPath = path.resolve(__dirname, 'ebrima.ttf');
if (fs.existsSync(ebrimaPath)) {
  registerFont(ebrimaPath, { family: 'Ebrima', weight: 'normal' });
  console.log(`✓ Registered: ebrima.ttf as Ebrima`);
}

async function extractImagesFromPdf(buffer: Buffer): Promise<{ photo?: Buffer; qrCode?: Buffer }> {
  const result: { photo?: Buffer; qrCode?: Buffer } = {};
  const jpegStart = Buffer.from([0xFF, 0xD8, 0xFF]);
  const jpegEnd = Buffer.from([0xFF, 0xD9]);
  const images: Buffer[] = [];
  let startIndex = 0;
  
  while (startIndex < buffer.length) {
    const start = buffer.indexOf(jpegStart, startIndex);
    if (start === -1) break;
    const end = buffer.indexOf(jpegEnd, start + 3);
    if (end === -1) break;
    const imageBuffer = buffer.subarray(start, end + 2);
    if (imageBuffer.length > 500) images.push(imageBuffer);
    startIndex = end + 2;
  }
  
  if (images.length >= 1) result.photo = images[0];
  if (images.length >= 2) result.qrCode = images[1];
  return result;
}

function parsePdfText(text: string): ParsedData {
  const data: ParsedData = {
    fullNameAmharic: '', fullNameEnglish: '', dateOfBirthEthiopian: '', dateOfBirthGregorian: '',
    sex: '', sexAmharic: '', phoneNumber: '', regionAmharic: '', regionEnglish: '',
    zoneAmharic: '', zoneEnglish: '', woredaAmharic: '', woredaEnglish: '', fcn: '', fin: '',
    issueDateEthiopian: '2017/10/07', issueDateGregorian: '2025/06/14',
    expiryDateEthiopian: '2027/10/07', expiryDateGregorian: '2035/06/14', serialNumber: '5479474'
  };
  
  const dates1 = text.match(/(\d{2}\/\d{2}\/\d{4})/g) || [];
  const dates2 = text.match(/(\d{4}\/\d{2}\/\d{2})/g) || [];
  if (dates1.length > 0) data.dateOfBirthGregorian = dates1[0] || '';
  if (dates2.length > 0) data.dateOfBirthEthiopian = dates2[0] || '';
  
  const phoneMatch = text.match(/(09\d{8})/);
  if (phoneMatch) data.phoneNumber = phoneMatch[1];
  
  const fcnMatch = text.match(/(\d{4}\s+\d{4}\s+\d{4}\s+\d{4})/);
  if (fcnMatch) data.fcn = fcnMatch[1];
  
  const finMatch = text.match(/(\d{4}\s+\d{4}\s+\d{4})(?!\s+\d)/);
  if (finMatch) data.fin = finMatch[1];
  else if (data.fcn) {
    const d = data.fcn.replace(/\s/g, '');
    data.fin = `${d.substring(0,4)} ${d.substring(4,8)} ${d.substring(8,12)}`;
  }
  
  if (text.includes('ወንድ')) { data.sexAmharic = 'ወንድ'; data.sex = 'Male'; }
  else if (text.includes('ሴት')) { data.sexAmharic = 'ሴት'; data.sex = 'Female'; }
  
  const engMatch = [...text.matchAll(/([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)/g)];
  const exclude = ['Ethiopian', 'Digital', 'National', 'Date', 'Birth', 'Sub', 'City'];
  for (let i = engMatch.length - 1; i >= 0; i--) {
    if (!engMatch[i][0].split(/\s+/).some(w => exclude.includes(w))) {
      data.fullNameEnglish = engMatch[i][0]; break;
    }
  }
  
  const amhMatch = [...text.matchAll(/^([\u1200-\u137F]+\s+[\u1200-\u137F]+\s+[\u1200-\u137F]+)$/gm)];
  const excludeAmh = ['ኢትዮጵያ', 'ብሔራዊ', 'መታወቂያ'];
  for (let i = amhMatch.length - 1; i >= 0; i--) {
    if (!amhMatch[i][1].split(/\s+/).some(w => excludeAmh.some(e => w.includes(e)))) {
      data.fullNameAmharic = amhMatch[i][1]; break;
    }
  }
  
  if (text.includes('ትግራይ')) { data.regionAmharic = 'ትግራይ'; data.regionEnglish = 'Tigray'; }
  if (text.includes('መቐለ')) { data.zoneAmharic = 'መቐለ'; data.zoneEnglish = 'Mekelle'; }
  
  const woredaMatch = text.match(/([\u1200-\u137F]+)\s*ክ\/ከተማ/);
  if (woredaMatch) data.woredaAmharic = woredaMatch[0];
  const woredaEngMatch = text.match(/([A-Za-z]+)\s+Sub\s+City/i);
  if (woredaEngMatch) data.woredaEnglish = woredaEngMatch[0];
  
  return data;
}

// Remove white background using flood fill
async function removeWhiteBackground(photoBuffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(photoBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const pixels = Buffer.from(data);
  const threshold = 240;
  const visited = new Set<number>();
  const queue: number[] = [];
  
  const isWhite = (idx: number) => pixels[idx] >= threshold && pixels[idx+1] >= threshold && pixels[idx+2] >= threshold;
  const getIdx = (x: number, y: number) => (y * width + x) * 4;
  
  for (let x = 0; x < width; x++) { queue.push(getIdx(x, 0)); queue.push(getIdx(x, height - 1)); }
  for (let y = 0; y < height; y++) { queue.push(getIdx(0, y)); queue.push(getIdx(width - 1, y)); }
  
  while (queue.length > 0) {
    const idx = queue.shift()!;
    if (visited.has(idx)) continue;
    visited.add(idx);
    if (!isWhite(idx)) continue;
    pixels[idx + 3] = 0;
    const pn = idx / 4, x = pn % width, y = Math.floor(pn / width);
    if (x > 0) queue.push(getIdx(x-1, y));
    if (x < width-1) queue.push(getIdx(x+1, y));
    if (y > 0) queue.push(getIdx(x, y-1));
    if (y < height-1) queue.push(getIdx(x, y+1));
  }
  
  for (let i = 0; i < width * height * 4; i += 4) {
    const gray = Math.round(0.299 * pixels[i] + 0.587 * pixels[i+1] + 0.114 * pixels[i+2]);
    pixels[i] = pixels[i+1] = pixels[i+2] = gray;
  }
  
  return sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

function loadLayout() {
  delete require.cache[require.resolve('./' + LAYOUT_PATH)];
  try { return JSON.parse(fs.readFileSync(LAYOUT_PATH, 'utf-8')); }
  catch { return null; }
}

let cachedData: ParsedData | null = null;
let processedPhoto: Buffer | null = null;

async function loadPdfData(): Promise<ParsedData> {
  if (cachedData) return cachedData;
  
  if (!fs.existsSync(PDF_PATH)) {
    console.log('PDF not found, using sample data...');
    return { fullNameAmharic: 'ዓወት ትካቦ ገብረሂወት', fullNameEnglish: 'Awet Tikabo Gebrehiwet',
      dateOfBirthEthiopian: '1985/03/15', dateOfBirthGregorian: '25/11/1992', sex: 'Male', sexAmharic: 'ወንድ',
      phoneNumber: '0912345678', regionAmharic: 'ትግራይ', regionEnglish: 'Tigray', zoneAmharic: 'መቐለ',
      zoneEnglish: 'Mekelle', woredaAmharic: 'ሓድነት ክ/ከተማ', woredaEnglish: 'Hadnet Sub City',
      fcn: '1234 5678 9012 3456', fin: '1234 5678 9012', issueDateEthiopian: '2017/10/07',
      issueDateGregorian: '2025/06/14', expiryDateEthiopian: '2027/10/07', expiryDateGregorian: '2035/06/14',
      serialNumber: '5479474' } as ParsedData;
  }
  
  console.log('Reading PDF...');
  const pdfBuffer = fs.readFileSync(PDF_PATH);
  const pdfData = await pdfParse(pdfBuffer);
  const parsedData = parsePdfText(pdfData.text);
  const images = await extractImagesFromPdf(pdfBuffer);
  parsedData.photo = images.photo;
  parsedData.qrCode = images.qrCode;
  
  console.log(`Name: ${parsedData.fullNameEnglish}, FCN: ${parsedData.fcn}`);
  
  if (parsedData.photo) {
    console.log('Processing photo...');
    processedPhoto = await removeWhiteBackground(parsedData.photo);
  }
  
  cachedData = parsedData;
  return parsedData;
}

async function render() {
  const layout = loadLayout();
  if (!layout) return;
  
  const { dimensions, front, back, templateFiles } = layout;
  const data = await loadPdfData();

  // Front
  const frontCanvas = createCanvas(dimensions.width, dimensions.height);
  const fctx = frontCanvas.getContext('2d');
  const frontTemplate = await loadImage(path.join(TEMPLATE_DIR, templateFiles.front));
  fctx.drawImage(frontTemplate, 0, 0, dimensions.width, dimensions.height);

  if (processedPhoto) {
    const photo = await loadImage(processedPhoto);
    fctx.drawImage(photo, front.mainPhoto.x, front.mainPhoto.y, front.mainPhoto.width, front.mainPhoto.height);
    fctx.drawImage(photo, front.smallPhoto.x, front.smallPhoto.y, front.smallPhoto.width, front.smallPhoto.height);
  }

  fctx.textBaseline = 'top';
  fctx.fillStyle = front.nameAmharic.color;
  fctx.font = `bold ${front.nameAmharic.fontSize}px Ebrima`;
  fctx.fillText(data.fullNameAmharic, front.nameAmharic.x, front.nameAmharic.y);

  fctx.fillStyle = front.nameEnglish.color;
  fctx.font = `bold ${front.nameEnglish.fontSize}px Arial`;
  fctx.fillText(data.fullNameEnglish, front.nameEnglish.x, front.nameEnglish.y);

  fctx.fillStyle = front.dateOfBirth.color;
  fctx.font = `bold ${front.dateOfBirth.fontSize}px Arial`;
  fctx.fillText(`${data.dateOfBirthGregorian} | ${data.dateOfBirthEthiopian}`, front.dateOfBirth.x, front.dateOfBirth.y);

  fctx.fillStyle = front.sex.color;
  fctx.font = `bold ${front.sex.fontSize}px Ebrima`;
  fctx.fillText(data.sexAmharic, front.sex.x, front.sex.y);
  const sw = fctx.measureText(data.sexAmharic).width;
  fctx.font = `bold ${front.sex.fontSize}px Arial`;
  fctx.fillText(`  |  ${data.sex}`, front.sex.x + sw, front.sex.y);

  fctx.fillStyle = front.expiryDate.color;
  fctx.font = `bold ${front.expiryDate.fontSize}px Arial`;
  fctx.fillText(`${data.expiryDateGregorian} | ${data.expiryDateEthiopian}`, front.expiryDate.x, front.expiryDate.y);

  fctx.fillStyle = front.fan.color;
  fctx.font = `bold ${front.fan.fontSize}px Consolas`;
  fctx.fillText(data.fcn, front.fan.x, front.fan.y);

  const bc = createCanvas(front.barcode.width, front.barcode.height);
  JsBarcode(bc, data.fcn.replace(/\s/g, ''), { format: 'CODE128', width: 2, height: front.barcode.height - 5, displayValue: false, margin: 0, background: 'transparent' });
  fctx.drawImage(bc, front.barcode.x, front.barcode.y, front.barcode.width, front.barcode.height);

  if (front.dateOfIssueEthiopian) {
    fctx.fillStyle = front.dateOfIssueEthiopian.color;
    fctx.font = `bold ${front.dateOfIssueEthiopian.fontSize}px Arial`;
    fctx.save(); fctx.translate(front.dateOfIssueEthiopian.x, front.dateOfIssueEthiopian.y);
    fctx.rotate((front.dateOfIssueEthiopian.rotation * Math.PI) / 180);
    fctx.fillText(data.issueDateEthiopian, 0, 0); fctx.restore();
  }
  if (front.dateOfIssueGregorian) {
    fctx.fillStyle = front.dateOfIssueGregorian.color;
    fctx.font = `bold ${front.dateOfIssueGregorian.fontSize}px Arial`;
    fctx.save(); fctx.translate(front.dateOfIssueGregorian.x, front.dateOfIssueGregorian.y);
    fctx.rotate((front.dateOfIssueGregorian.rotation * Math.PI) / 180);
    fctx.fillText(data.issueDateGregorian, 0, 0); fctx.restore();
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, 'front_color.png'), frontCanvas.toBuffer('image/png'));

  // Back
  const backCanvas = createCanvas(dimensions.width, dimensions.height);
  const bctx = backCanvas.getContext('2d');
  const backTemplate = await loadImage(path.join(TEMPLATE_DIR, templateFiles.back));
  bctx.drawImage(backTemplate, 0, 0, dimensions.width, dimensions.height);

  if (data.qrCode) {
    try { const qr = await loadImage(data.qrCode); bctx.drawImage(qr, back.qrCode.x, back.qrCode.y, back.qrCode.width, back.qrCode.height); }
    catch { const qc = createCanvas(back.qrCode.width, back.qrCode.height); await QRCode.toCanvas(qc, data.fcn.replace(/\s/g, ''), { width: back.qrCode.width, margin: 0 }); bctx.drawImage(qc, back.qrCode.x, back.qrCode.y); }
  } else {
    const qc = createCanvas(back.qrCode.width, back.qrCode.height);
    await QRCode.toCanvas(qc, data.fcn.replace(/\s/g, ''), { width: back.qrCode.width, margin: 0 });
    bctx.drawImage(qc, back.qrCode.x, back.qrCode.y);
  }

  bctx.textBaseline = 'top';
  bctx.fillStyle = back.phoneNumber.color;
  bctx.font = `bold ${back.phoneNumber.fontSize}px Arial`;
  bctx.fillText(data.phoneNumber, back.phoneNumber.x, back.phoneNumber.y);

  if (back.nationality) {
    bctx.fillStyle = back.nationality.color;
    bctx.font = `bold ${back.nationality.fontSize}px Ebrima`;
    bctx.fillText('ኢትዮጵያዊ', back.nationality.x, back.nationality.y);
    const nw = bctx.measureText('ኢትዮጵያዊ').width;
    bctx.font = `bold ${back.nationality.fontSize}px Arial`;
    bctx.fillText('  |  Ethiopian', back.nationality.x + nw, back.nationality.y);
  }

  bctx.fillStyle = back.regionAmharic.color;
  bctx.font = `bold ${back.regionAmharic.fontSize}px Ebrima`;
  bctx.fillText(data.regionAmharic, back.regionAmharic.x, back.regionAmharic.y);
  bctx.fillStyle = back.regionEnglish.color;
  bctx.font = `bold ${back.regionEnglish.fontSize}px Arial`;
  bctx.fillText(data.regionEnglish, back.regionEnglish.x, back.regionEnglish.y);

  bctx.fillStyle = back.zoneAmharic.color;
  bctx.font = `bold ${back.zoneAmharic.fontSize}px Ebrima`;
  bctx.fillText(data.zoneAmharic, back.zoneAmharic.x, back.zoneAmharic.y);
  bctx.fillStyle = back.zoneEnglish.color;
  bctx.font = `bold ${back.zoneEnglish.fontSize}px Arial`;
  bctx.fillText(data.zoneEnglish, back.zoneEnglish.x, back.zoneEnglish.y);

  bctx.fillStyle = back.woredaAmharic.color;
  bctx.font = `bold ${back.woredaAmharic.fontSize}px Ebrima`;
  bctx.fillText(data.woredaAmharic, back.woredaAmharic.x, back.woredaAmharic.y);
  bctx.fillStyle = back.woredaEnglish.color;
  bctx.font = `bold ${back.woredaEnglish.fontSize}px Arial`;
  bctx.fillText(data.woredaEnglish, back.woredaEnglish.x, back.woredaEnglish.y);

  bctx.fillStyle = back.fin.color;
  bctx.font = `bold ${back.fin.fontSize}px Consolas`;
  bctx.fillText(data.fin, back.fin.x, back.fin.y);

  bctx.fillStyle = back.serialNumber.color;
  bctx.font = `bold ${back.serialNumber.fontSize}px Arial`;
  bctx.fillText(data.serialNumber, back.serialNumber.x, back.serialNumber.y);

  fs.writeFileSync(path.join(OUTPUT_DIR, 'back_color.png'), backCanvas.toBuffer('image/png'));
  console.log(`[${new Date().toLocaleTimeString()}] ✓ Rendered front_color.png & back_color.png`);
}

console.log('Watching cardLayout.json (Template 1) for changes...');
console.log('Edit src/config/cardLayout.json and save to see updates.\n');
render().catch(console.error);

fs.watch(LAYOUT_PATH, async (eventType) => {
  if (eventType === 'change') {
    try { await render(); } catch (err) { console.error('Render error:', err); }
  }
});
