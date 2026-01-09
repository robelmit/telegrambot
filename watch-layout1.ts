/**
 * Watch cardLayout1.json (Template 2) and re-render on save
 * Uses real data from fayda.pdf
 * Run with: npx ts-node watch-layout1.ts
 */

import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { createCanvas, loadImage, registerFont } from 'canvas';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

const LAYOUT_PATH = 'src/config/cardLayout1.json';
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
  } else {
    console.log(`✗ Missing: ${font.file}`);
  }
}

// Register Ebrima from root directory
const ebrimaPath = path.resolve(__dirname, 'ebrima.ttf');
if (fs.existsSync(ebrimaPath)) {
  try {
    registerFont(ebrimaPath, { family: 'Ebrima', weight: 'normal' });
    console.log(`✓ Registered: ebrima.ttf as Ebrima`);
  } catch (err) {
    console.log(`✗ Failed to register: ebrima.ttf - ${err}`);
  }
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
    
    const imageBuffer = buffer.slice(start, end + 2);
    if (imageBuffer.length > 500) {
      images.push(imageBuffer);
    }
    startIndex = end + 2;
  }
  
  if (images.length >= 1) result.photo = images[0];
  if (images.length >= 2) result.qrCode = images[1];
  
  return result;
}

function parsePdfText(text: string): ParsedData {
  const data: ParsedData = {
    fullNameAmharic: '',
    fullNameEnglish: '',
    dateOfBirthEthiopian: '',
    dateOfBirthGregorian: '',
    sex: '',
    sexAmharic: '',
    phoneNumber: '',
    regionAmharic: '',
    regionEnglish: '',
    zoneAmharic: '',
    zoneEnglish: '',
    woredaAmharic: '',
    woredaEnglish: '',
    fcn: '',
    fin: '',
    issueDateEthiopian: '2017/10/07',
    issueDateGregorian: '2025/06/14',
    expiryDateEthiopian: '2027/10/07',
    expiryDateGregorian: '2035/06/14',
    serialNumber: '5479474'
  };
  
  // Extract dates
  const datePattern1 = /(\d{2}\/\d{2}\/\d{4})/g;
  const datePattern2 = /(\d{4}\/\d{2}\/\d{2})/g;
  
  const dates1 = text.match(datePattern1) || [];
  const dates2 = text.match(datePattern2) || [];
  
  if (dates1.length > 0) data.dateOfBirthGregorian = dates1[0] || '';
  if (dates2.length > 0) data.dateOfBirthEthiopian = dates2[0] || '';
  
  // Extract phone number
  const phonePattern = /(09\d{8})/;
  const phoneMatch = text.match(phonePattern);
  if (phoneMatch) data.phoneNumber = phoneMatch[1];
  
  // Extract FCN (16 digits with spaces)
  const fcnPattern = /(\d{4}\s+\d{4}\s+\d{4}\s+\d{4})/;
  const fcnMatch = text.match(fcnPattern);
  if (fcnMatch) data.fcn = fcnMatch[1];
  
  // Extract FIN (12 digits with spaces)
  const finPattern = /(\d{4}\s+\d{4}\s+\d{4})(?!\s+\d)/;
  const finMatch = text.match(finPattern);
  if (finMatch) {
    data.fin = finMatch[1];
  } else {
    const fcnDigits = data.fcn.replace(/\s/g, '');
    if (fcnDigits.length >= 12) {
      const finDigits = fcnDigits.substring(0, 12);
      data.fin = `${finDigits.substring(0,4)} ${finDigits.substring(4,8)} ${finDigits.substring(8,12)}`;
    }
  }
  
  // Extract sex
  if (text.includes('ወንድ')) {
    data.sexAmharic = 'ወንድ';
    data.sex = 'Male';
  } else if (text.includes('ሴት')) {
    data.sexAmharic = 'ሴት';
    data.sex = 'Female';
  }
  
  // Extract English name
  const englishNamePattern = /([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)/g;
  const englishMatches = [...text.matchAll(englishNamePattern)];
  const excludeEnglish = ['Ethiopian', 'Digital', 'National', 'Date', 'Birth', 'Sub', 'City', 'Phone', 'Number', 'Region', 'Woreda', 'Demographic', 'Data', 'Disclaimer', 'Personal'];
  
  for (let i = englishMatches.length - 1; i >= 0; i--) {
    const fullMatch = englishMatches[i][0];
    const words = fullMatch.split(/\s+/);
    const isExcluded = words.some(w => excludeEnglish.includes(w));
    if (!isExcluded) {
      data.fullNameEnglish = fullMatch;
      break;
    }
  }
  
  // Extract Amharic name
  const amharicNamePattern = /^([\u1200-\u137F]+\s+[\u1200-\u137F]+\s+[\u1200-\u137F]+)$/gm;
  const amharicMatches = [...text.matchAll(amharicNamePattern)];
  const excludeAmharic = ['ኢትዮጵያ', 'ብሔራዊ', 'መታወቂያ', 'ፕሮግራም', 'ዲጂታል', 'ካርድ', 'ክፍለ', 'ከተማ', 'ወረዳ', 'ክልል', 'ዜግነት', 'ስልክ', 'የስነ', 'ሕዝብ', 'መረጃ', 'ማሳሰቢያ'];
  
  for (let i = amharicMatches.length - 1; i >= 0; i--) {
    const fullMatch = amharicMatches[i][1];
    const words = fullMatch.split(/\s+/);
    const isExcluded = words.some(w => excludeAmharic.some(e => w.includes(e)));
    if (!isExcluded && words.length >= 3) {
      data.fullNameAmharic = fullMatch;
      break;
    }
  }
  
  // Region
  if (text.includes('ትግራይ')) {
    data.regionAmharic = 'ትግራይ';
    data.regionEnglish = 'Tigray';
  } else if (text.includes('አዲስ አበባ')) {
    data.regionAmharic = 'አዲስ አበባ';
    data.regionEnglish = 'Addis Ababa';
  }
  
  // Zone/City
  if (text.includes('መቐለ')) {
    data.zoneAmharic = 'መቐለ';
    data.zoneEnglish = 'Mekelle';
  }
  
  // Woreda
  const woredaAmharicPattern = /([\u1200-\u137F]+)\s*ክ\/ከተማ/;
  const woredaMatch = text.match(woredaAmharicPattern);
  if (woredaMatch) data.woredaAmharic = woredaMatch[0];
  
  const woredaEnglishPattern = /([A-Za-z]+)\s+Sub\s+City/i;
  const woredaEnglishMatch = text.match(woredaEnglishPattern);
  if (woredaEnglishMatch) data.woredaEnglish = woredaEnglishMatch[0];
  
  return data;
}

function convertToGrayscale(ctx: any, x: number, y: number, width: number, height: number) {
  const imageData = ctx.getImageData(x, y, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  ctx.putImageData(imageData, x, y);
}

function loadLayout() {
  delete require.cache[require.resolve('./' + LAYOUT_PATH)];
  const content = fs.readFileSync(LAYOUT_PATH, 'utf-8');
  return JSON.parse(content);
}

let cachedData: ParsedData | null = null;

async function loadPdfData(): Promise<ParsedData> {
  if (cachedData) return cachedData;
  
  console.log('Reading PDF...');
  const pdfBuffer = fs.readFileSync(PDF_PATH);
  
  console.log('Extracting text...');
  const pdfData = await pdfParse(pdfBuffer);
  const parsedData = parsePdfText(pdfData.text);
  
  console.log('Extracting images...');
  const images = await extractImagesFromPdf(pdfBuffer);
  parsedData.photo = images.photo;
  parsedData.qrCode = images.qrCode;
  
  console.log('\n=== Parsed Data ===');
  console.log('Name (Amharic):', parsedData.fullNameAmharic);
  console.log('Name (English):', parsedData.fullNameEnglish);
  console.log('FCN:', parsedData.fcn);
  console.log('FIN:', parsedData.fin);
  console.log('Photo:', parsedData.photo ? `${parsedData.photo.length} bytes` : 'Not found');
  console.log('QR Code:', parsedData.qrCode ? `${parsedData.qrCode.length} bytes` : 'Not found');
  console.log('');
  
  cachedData = parsedData;
  return parsedData;
}

async function render() {
  const layout = loadLayout();
  const { dimensions, front, back, templateFiles } = layout;
  const data = await loadPdfData();

  // Render front
  const frontCanvas = createCanvas(dimensions.width, dimensions.height);
  const fctx = frontCanvas.getContext('2d');
  
  const frontTemplate = await loadImage(path.join(TEMPLATE_DIR, templateFiles.front));
  fctx.drawImage(frontTemplate, 0, 0, dimensions.width, dimensions.height);

  // Draw photo
  if (data.photo) {
    try {
      const photo = await loadImage(data.photo);
      // Main photo
      fctx.drawImage(photo, front.mainPhoto.x, front.mainPhoto.y, front.mainPhoto.width, front.mainPhoto.height);
      convertToGrayscale(fctx, front.mainPhoto.x, front.mainPhoto.y, front.mainPhoto.width, front.mainPhoto.height);
      // Small photo
      fctx.drawImage(photo, front.smallPhoto.x, front.smallPhoto.y, front.smallPhoto.width, front.smallPhoto.height);
      convertToGrayscale(fctx, front.smallPhoto.x, front.smallPhoto.y, front.smallPhoto.width, front.smallPhoto.height);
    } catch (e) {
      console.log('Could not load photo:', e);
    }
  }

  fctx.textBaseline = 'top';

  // Name Amharic
  fctx.fillStyle = front.nameAmharic.color;
  fctx.font = `bold ${front.nameAmharic.fontSize}px Ebrima`;
  fctx.fillText(data.fullNameAmharic, front.nameAmharic.x, front.nameAmharic.y);

  // Name English
  fctx.fillStyle = front.nameEnglish.color;
  fctx.font = `bold ${front.nameEnglish.fontSize}px Arial`;
  fctx.fillText(data.fullNameEnglish, front.nameEnglish.x, front.nameEnglish.y);

  // DOB
  fctx.fillStyle = front.dateOfBirth.color;
  fctx.font = `bold ${front.dateOfBirth.fontSize}px Arial`;
  fctx.fillText(`${data.dateOfBirthGregorian} | ${data.dateOfBirthEthiopian}`, front.dateOfBirth.x, front.dateOfBirth.y);

  // Sex
  fctx.fillStyle = front.sex.color;
  fctx.font = `bold ${front.sex.fontSize}px Ebrima`;
  fctx.fillText(data.sexAmharic, front.sex.x, front.sex.y);
  const sexWidth = fctx.measureText(data.sexAmharic).width;
  fctx.font = `bold ${front.sex.fontSize}px Arial`;
  fctx.fillText(`  |  ${data.sex}`, front.sex.x + sexWidth, front.sex.y);

  // Expiry
  fctx.fillStyle = front.expiryDate.color;
  fctx.font = `bold ${front.expiryDate.fontSize}px Arial`;
  fctx.fillText(`${data.expiryDateGregorian} | ${data.expiryDateEthiopian}`, front.expiryDate.x, front.expiryDate.y);

  // FAN
  fctx.fillStyle = front.fan.color;
  fctx.font = `bold ${front.fan.fontSize}px Consolas`;
  fctx.fillText(data.fcn, front.fan.x, front.fan.y);

  // Barcode
  const barcodeCanvas = createCanvas(front.barcode.width, front.barcode.height);
  JsBarcode(barcodeCanvas, data.fcn.replace(/\s/g, ''), {
    format: 'CODE128',
    width: 2,
    height: front.barcode.height - 5,
    displayValue: false,
    margin: 0,
    background: 'transparent'
  });
  fctx.drawImage(barcodeCanvas, front.barcode.x, front.barcode.y, front.barcode.width, front.barcode.height);

  // Issue date Ethiopian (rotated)
  fctx.fillStyle = front.dateOfIssueEthiopian.color;
  fctx.font = `bold ${front.dateOfIssueEthiopian.fontSize}px Arial`;
  fctx.save();
  fctx.translate(front.dateOfIssueEthiopian.x, front.dateOfIssueEthiopian.y);
  fctx.rotate((front.dateOfIssueEthiopian.rotation * Math.PI) / 180);
  fctx.fillText(data.issueDateEthiopian, 0, 0);
  fctx.restore();

  // Issue date Gregorian (rotated)
  fctx.fillStyle = front.dateOfIssueGregorian.color;
  fctx.font = `bold ${front.dateOfIssueGregorian.fontSize}px Arial`;
  fctx.save();
  fctx.translate(front.dateOfIssueGregorian.x, front.dateOfIssueGregorian.y);
  fctx.rotate((front.dateOfIssueGregorian.rotation * Math.PI) / 180);
  fctx.fillText(data.issueDateGregorian, 0, 0);
  fctx.restore();

  fs.writeFileSync(path.join(OUTPUT_DIR, 'front1_color.png'), frontCanvas.toBuffer('image/png'));

  // Render back
  const backCanvas = createCanvas(dimensions.width, dimensions.height);
  const bctx = backCanvas.getContext('2d');
  
  const backTemplate = await loadImage(path.join(TEMPLATE_DIR, templateFiles.back));
  bctx.drawImage(backTemplate, 0, 0, dimensions.width, dimensions.height);

  // QR Code
  if (data.qrCode) {
    try {
      const qr = await loadImage(data.qrCode);
      bctx.drawImage(qr, back.qrCode.x, back.qrCode.y, back.qrCode.width, back.qrCode.height);
    } catch (e) {
      const qrCanvas = createCanvas(back.qrCode.width, back.qrCode.height);
      await QRCode.toCanvas(qrCanvas, data.fcn.replace(/\s/g, ''), { width: back.qrCode.width, margin: 0 });
      bctx.drawImage(qrCanvas, back.qrCode.x, back.qrCode.y);
    }
  } else {
    const qrCanvas = createCanvas(back.qrCode.width, back.qrCode.height);
    await QRCode.toCanvas(qrCanvas, data.fcn.replace(/\s/g, ''), { width: back.qrCode.width, margin: 0 });
    bctx.drawImage(qrCanvas, back.qrCode.x, back.qrCode.y);
  }

  bctx.textBaseline = 'top';

  // Phone
  bctx.fillStyle = back.phoneNumber.color;
  bctx.font = `bold ${back.phoneNumber.fontSize}px Arial`;
  bctx.fillText(data.phoneNumber, back.phoneNumber.x, back.phoneNumber.y);

  // Nationality (Amharic | English in one line)
  if (back.nationality) {
    bctx.fillStyle = back.nationality.color;
    bctx.font = `bold ${back.nationality.fontSize}px Ebrima`;
    const nationalityAmharic = 'ኢትዮጵያዊ';
    bctx.fillText(nationalityAmharic, back.nationality.x, back.nationality.y);
    const amharicWidth = bctx.measureText(nationalityAmharic).width;
    bctx.font = `bold ${back.nationality.fontSize}px Arial`;
    bctx.fillText('  |  Ethiopian', back.nationality.x + amharicWidth, back.nationality.y);
  }

  // Region Amharic
  bctx.fillStyle = back.regionAmharic.color;
  bctx.font = `bold ${back.regionAmharic.fontSize}px Ebrima`;
  bctx.fillText(data.regionAmharic, back.regionAmharic.x, back.regionAmharic.y);

  // Region English
  bctx.fillStyle = back.regionEnglish.color;
  bctx.font = `bold ${back.regionEnglish.fontSize}px Arial`;
  bctx.fillText(data.regionEnglish, back.regionEnglish.x, back.regionEnglish.y);

  // Zone Amharic
  bctx.fillStyle = back.zoneAmharic.color;
  bctx.font = `bold ${back.zoneAmharic.fontSize}px Ebrima`;
  bctx.fillText(data.zoneAmharic, back.zoneAmharic.x, back.zoneAmharic.y);

  // Zone English
  bctx.fillStyle = back.zoneEnglish.color;
  bctx.font = `bold ${back.zoneEnglish.fontSize}px Arial`;
  bctx.fillText(data.zoneEnglish, back.zoneEnglish.x, back.zoneEnglish.y);

  // Woreda Amharic
  bctx.fillStyle = back.woredaAmharic.color;
  bctx.font = `bold ${back.woredaAmharic.fontSize}px Ebrima`;
  bctx.fillText(data.woredaAmharic, back.woredaAmharic.x, back.woredaAmharic.y);

  // Woreda English
  bctx.fillStyle = back.woredaEnglish.color;
  bctx.font = `bold ${back.woredaEnglish.fontSize}px Arial`;
  bctx.fillText(data.woredaEnglish, back.woredaEnglish.x, back.woredaEnglish.y);

  // FIN
  bctx.fillStyle = back.fin.color;
  bctx.font = `bold ${back.fin.fontSize}px Consolas`;
  bctx.fillText(data.fin, back.fin.x, back.fin.y);

  // Serial
  bctx.fillStyle = back.serialNumber.color;
  bctx.font = `bold ${back.serialNumber.fontSize}px Arial`;
  bctx.fillText(data.serialNumber, back.serialNumber.x, back.serialNumber.y);

  fs.writeFileSync(path.join(OUTPUT_DIR, 'back1_color.png'), backCanvas.toBuffer('image/png'));

  console.log(`[${new Date().toLocaleTimeString()}] ✓ Rendered front1_color.png & back1_color.png (Template 2 with real PDF data)`);
}

// Initial render
console.log('Watching cardLayout1.json (Template 2) for changes...');
console.log('Using real data from fayda.pdf');
console.log('Edit src/config/cardLayout1.json and save to see updates.\n');
render().catch(console.error);

// Watch for changes
fs.watch(LAYOUT_PATH, async (eventType) => {
  if (eventType === 'change') {
    try {
      await render();
    } catch (err) {
      console.error('Render error:', err);
    }
  }
});
