/**
 * Full PDF parsing and card generation from real/fayda.pdf
 */
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { createCanvas, loadImage } from 'canvas';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

const TEMPLATE_DIR = 'template/assets';
const OUTPUT_DIR = 'test-output';

// Load layout config
const layout = JSON.parse(fs.readFileSync('src/config/cardLayout.json', 'utf-8'));
const { dimensions, front, back } = layout;

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
  fcn: string;  // FAN on front
  fin: string;  // FIN on back (different from FCN)
  photo?: Buffer;
  qrCode?: Buffer;
}

async function extractImagesFromPdf(buffer: Buffer): Promise<{ photo?: Buffer; qrCode?: Buffer }> {
  const result: { photo?: Buffer; qrCode?: Buffer } = {};
  
  // Find JPEG images
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
  
  console.log(`Found ${images.length} images in PDF`);
  
  // First image is the user photo, second is QR code
  if (images.length >= 1) {
    result.photo = images[0];
    console.log(`Photo size: ${images[0].length} bytes`);
  }
  
  if (images.length >= 2) {
    result.qrCode = images[1];
    console.log(`QR code size: ${images[1].length} bytes`);
  }
  
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
    fin: ''
  };
  
  // Extract dates (format: DD/MM/YYYY and YYYY/MM/DD)
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
  
  // Extract FCN (16 digits with spaces) - this is the FAN
  const fcnPattern = /(\d{4}\s+\d{4}\s+\d{4}\s+\d{4})/;
  const fcnMatch = text.match(fcnPattern);
  if (fcnMatch) data.fcn = fcnMatch[1];
  
  // Extract FIN (12 digits with spaces) - look for different pattern
  // FIN format is typically XXXX XXXX XXXX (12 digits)
  const finPattern = /(\d{4}\s+\d{4}\s+\d{4})(?!\s+\d)/;
  const finMatch = text.match(finPattern);
  if (finMatch) {
    data.fin = finMatch[1];
  } else {
    // If no separate FIN found, generate from FCN (first 12 digits)
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
  
  // Extract English name - look for 3 capitalized words that are a person's name
  // The name appears near the end of the text, after all the labels
  const englishNamePattern = /([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)/g;
  const englishMatches = [...text.matchAll(englishNamePattern)];
  
  const excludeEnglish = ['Ethiopian', 'Digital', 'National', 'Date', 'Birth', 'Sub', 'City', 'Phone', 'Number', 'Region', 'Woreda', 'Demographic', 'Data', 'Disclaimer', 'Personal'];
  
  // Get the last valid name match (usually the actual name is at the end)
  for (let i = englishMatches.length - 1; i >= 0; i--) {
    const fullMatch = englishMatches[i][0];
    const words = fullMatch.split(/\s+/);
    const isExcluded = words.some(w => excludeEnglish.includes(w));
    if (!isExcluded) {
      data.fullNameEnglish = fullMatch;
      break;
    }
  }
  
  // Extract Amharic name - look for the line right before the English name
  // The Amharic name appears on its own line before the English name
  const amharicNamePattern = /^([\u1200-\u137F]+\s+[\u1200-\u137F]+\s+[\u1200-\u137F]+)$/gm;
  const amharicMatches = [...text.matchAll(amharicNamePattern)];
  
  const excludeAmharic = ['ኢትዮጵያ', 'ብሔራዊ', 'መታወቂያ', 'ፕሮግራም', 'ዲጂታል', 'ካርድ', 'ክፍለ', 'ከተማ', 'ወረዳ', 'ክልል', 'ዜግነት', 'ስልክ', 'የስነ', 'ሕዝብ', 'መረጃ', 'ማሳሰቢያ'];
  
  // Get the last valid Amharic name (usually at the end)
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
  } else if (text.includes('አማራ')) {
    data.regionAmharic = 'አማራ';
    data.regionEnglish = 'Amhara';
  } else if (text.includes('ኦሮሚያ')) {
    data.regionAmharic = 'ኦሮሚያ';
    data.regionEnglish = 'Oromia';
  }
  
  // Zone/City
  if (text.includes('መቐለ')) {
    data.zoneAmharic = 'መቐለ';
    data.zoneEnglish = 'Mekelle';
  } else if (text.includes('አዲስ አበባ') && !data.zoneAmharic) {
    data.zoneAmharic = 'አዲስ አበባ';
    data.zoneEnglish = 'Addis Ababa';
  }
  
  // Woreda - look for pattern with ክ/ከተማ
  const woredaAmharicPattern = /([\u1200-\u137F]+)\s*ክ\/ከተማ/;
  const woredaMatch = text.match(woredaAmharicPattern);
  if (woredaMatch) {
    data.woredaAmharic = woredaMatch[0];
  }
  
  // English woreda
  const woredaEnglishPattern = /([A-Za-z]+)\s+Sub\s+City/i;
  const woredaEnglishMatch = text.match(woredaEnglishPattern);
  if (woredaEnglishMatch) {
    data.woredaEnglish = woredaEnglishMatch[0];
  }
  
  return data;
}

// Convert image to grayscale
function convertToGrayscale(ctx: any, x: number, y: number, width: number, height: number) {
  const imageData = ctx.getImageData(x, y, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = gray;     // R
    data[i + 1] = gray; // G
    data[i + 2] = gray; // B
  }
  ctx.putImageData(imageData, x, y);
}

async function renderFrontCard(data: ParsedData): Promise<Buffer> {
  const canvas = createCanvas(dimensions.width, dimensions.height);
  const ctx = canvas.getContext('2d');
  
  // Draw template
  const template = await loadImage(path.join(TEMPLATE_DIR, 'front_template.png'));
  ctx.drawImage(template, 0, 0, dimensions.width, dimensions.height);
  
  // Draw photo (grayscale)
  if (data.photo) {
    try {
      const photo = await loadImage(data.photo);
      // Draw main photo
      ctx.drawImage(photo, front.mainPhoto.x, front.mainPhoto.y, front.mainPhoto.width, front.mainPhoto.height);
      convertToGrayscale(ctx, front.mainPhoto.x, front.mainPhoto.y, front.mainPhoto.width, front.mainPhoto.height);
      // Draw small photo
      ctx.drawImage(photo, front.smallPhoto.x, front.smallPhoto.y, front.smallPhoto.width, front.smallPhoto.height);
      convertToGrayscale(ctx, front.smallPhoto.x, front.smallPhoto.y, front.smallPhoto.width, front.smallPhoto.height);
    } catch (e) {
      console.log('Could not load photo:', e);
    }
  }
  
  ctx.textBaseline = 'top';
  
  // Name Amharic
  ctx.fillStyle = front.nameAmharic.color;
  ctx.font = `bold ${front.nameAmharic.fontSize}px Ebrima`;
  ctx.fillText(data.fullNameAmharic, front.nameAmharic.x, front.nameAmharic.y);
  
  // Name English
  ctx.fillStyle = front.nameEnglish.color;
  ctx.font = `bold ${front.nameEnglish.fontSize}px Arial`;
  ctx.fillText(data.fullNameEnglish, front.nameEnglish.x, front.nameEnglish.y);
  
  // DOB
  ctx.fillStyle = front.dateOfBirth.color;
  ctx.font = `bold ${front.dateOfBirth.fontSize}px Arial`;
  ctx.fillText(`${data.dateOfBirthGregorian} | ${data.dateOfBirthEthiopian}`, front.dateOfBirth.x, front.dateOfBirth.y);
  
  // Sex
  ctx.fillStyle = front.sex.color;
  ctx.font = `bold ${front.sex.fontSize}px Ebrima`;
  ctx.fillText(data.sexAmharic, front.sex.x, front.sex.y);
  const sexWidth = ctx.measureText(data.sexAmharic).width;
  ctx.font = `bold ${front.sex.fontSize}px Arial`;
  ctx.fillText(`  |  ${data.sex}`, front.sex.x + sexWidth, front.sex.y);
  
  // Expiry (placeholder - 10 years from DOB)
  ctx.fillStyle = front.expiryDate.color;
  ctx.font = `bold ${front.expiryDate.fontSize}px Arial`;
  ctx.fillText('2035/06/14 | 2027/10/07', front.expiryDate.x, front.expiryDate.y);
  
  // FAN
  ctx.fillStyle = front.fan.color;
  ctx.font = `bold ${front.fan.fontSize}px Consolas`;
  ctx.fillText(data.fcn, front.fan.x, front.fan.y);
  
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
  ctx.drawImage(barcodeCanvas, front.barcode.x, front.barcode.y, front.barcode.width, front.barcode.height);
  
  // Issue dates (rotated)
  ctx.fillStyle = front.dateOfIssueEthiopian.color;
  ctx.font = `bold ${front.dateOfIssueEthiopian.fontSize}px Arial`;
  ctx.save();
  ctx.translate(front.dateOfIssueEthiopian.x, front.dateOfIssueEthiopian.y);
  ctx.rotate((front.dateOfIssueEthiopian.rotation * Math.PI) / 180);
  ctx.fillText('2017/10/07', 0, 0);
  ctx.restore();
  
  ctx.save();
  ctx.translate(front.dateOfIssueGregorian.x, front.dateOfIssueGregorian.y);
  ctx.rotate((front.dateOfIssueGregorian.rotation * Math.PI) / 180);
  ctx.fillText('2025/06/14', 0, 0);
  ctx.restore();
  
  return canvas.toBuffer('image/png');
}

async function renderBackCard(data: ParsedData): Promise<Buffer> {
  const canvas = createCanvas(dimensions.width, dimensions.height);
  const ctx = canvas.getContext('2d');
  
  // Draw template
  const template = await loadImage(path.join(TEMPLATE_DIR, 'back_template.png'));
  ctx.drawImage(template, 0, 0, dimensions.width, dimensions.height);
  
  // Draw QR code
  if (data.qrCode) {
    try {
      const qr = await loadImage(data.qrCode);
      ctx.drawImage(qr, back.qrCode.x, back.qrCode.y, back.qrCode.width, back.qrCode.height);
    } catch (e) {
      // Generate QR from FCN if extraction failed
      const qrCanvas = createCanvas(back.qrCode.width, back.qrCode.height);
      await QRCode.toCanvas(qrCanvas, data.fcn.replace(/\s/g, ''), { width: back.qrCode.width, margin: 0 });
      ctx.drawImage(qrCanvas, back.qrCode.x, back.qrCode.y);
    }
  } else {
    // Generate QR from FCN
    const qrCanvas = createCanvas(back.qrCode.width, back.qrCode.height);
    await QRCode.toCanvas(qrCanvas, data.fcn.replace(/\s/g, ''), { width: back.qrCode.width, margin: 0 });
    ctx.drawImage(qrCanvas, back.qrCode.x, back.qrCode.y);
  }
  
  ctx.textBaseline = 'top';
  
  // Phone
  ctx.fillStyle = back.phoneNumber.color;
  ctx.font = `bold ${back.phoneNumber.fontSize}px Arial`;
  ctx.fillText(data.phoneNumber, back.phoneNumber.x, back.phoneNumber.y);
  
  // Region
  ctx.fillStyle = back.regionAmharic.color;
  ctx.font = `bold ${back.regionAmharic.fontSize}px Ebrima`;
  ctx.fillText(data.regionAmharic, back.regionAmharic.x, back.regionAmharic.y);
  
  ctx.fillStyle = back.regionEnglish.color;
  ctx.font = `bold ${back.regionEnglish.fontSize}px Arial`;
  ctx.fillText(data.regionEnglish, back.regionEnglish.x, back.regionEnglish.y);
  
  // Zone
  ctx.fillStyle = back.zoneAmharic.color;
  ctx.font = `bold ${back.zoneAmharic.fontSize}px Ebrima`;
  ctx.fillText(data.zoneAmharic, back.zoneAmharic.x, back.zoneAmharic.y);
  
  ctx.fillStyle = back.zoneEnglish.color;
  ctx.font = `bold ${back.zoneEnglish.fontSize}px Arial`;
  ctx.fillText(data.zoneEnglish, back.zoneEnglish.x, back.zoneEnglish.y);
  
  // Woreda
  ctx.fillStyle = back.woredaAmharic.color;
  ctx.font = `bold ${back.woredaAmharic.fontSize}px Ebrima`;
  ctx.fillText(data.woredaAmharic, back.woredaAmharic.x, back.woredaAmharic.y);
  
  ctx.fillStyle = back.woredaEnglish.color;
  ctx.font = `bold ${back.woredaEnglish.fontSize}px Arial`;
  ctx.fillText(data.woredaEnglish, back.woredaEnglish.x, back.woredaEnglish.y);
  
  // FIN (12 digits, different from FCN/FAN)
  ctx.fillStyle = back.fin.color;
  ctx.font = `bold ${back.fin.fontSize}px Consolas`;
  ctx.fillText(data.fin, back.fin.x, back.fin.y);
  
  // Serial Number (generate random)
  ctx.fillStyle = back.serialNumber.color;
  ctx.font = `bold ${back.serialNumber.fontSize}px Arial`;
  ctx.fillText('5479474', back.serialNumber.x, back.serialNumber.y);
  
  return canvas.toBuffer('image/png');
}

async function main() {
  console.log('Reading PDF...');
  const pdfBuffer = fs.readFileSync('real/fayda.pdf');
  
  console.log('Extracting text...');
  const pdfData = await pdfParse(pdfBuffer);
  const parsedData = parsePdfText(pdfData.text);
  
  console.log('\n=== Parsed Data ===');
  console.log('Name (Amharic):', parsedData.fullNameAmharic);
  console.log('Name (English):', parsedData.fullNameEnglish);
  console.log('DOB (Gregorian):', parsedData.dateOfBirthGregorian);
  console.log('DOB (Ethiopian):', parsedData.dateOfBirthEthiopian);
  console.log('Sex:', parsedData.sexAmharic, '|', parsedData.sex);
  console.log('Phone:', parsedData.phoneNumber);
  console.log('Region:', parsedData.regionAmharic, '|', parsedData.regionEnglish);
  console.log('Zone:', parsedData.zoneAmharic, '|', parsedData.zoneEnglish);
  console.log('Woreda:', parsedData.woredaAmharic, '|', parsedData.woredaEnglish);
  console.log('FCN (FAN):', parsedData.fcn);
  console.log('FIN:', parsedData.fin);
  
  console.log('\nExtracting images...');
  const images = await extractImagesFromPdf(pdfBuffer);
  parsedData.photo = images.photo;
  parsedData.qrCode = images.qrCode;
  
  console.log('\nRendering front card...');
  const frontBuffer = await renderFrontCard(parsedData);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'front_color.png'), frontBuffer);
  console.log('Saved: test-output/front_color.png');
  
  console.log('\nRendering back card...');
  const backBuffer = await renderBackCard(parsedData);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'back_color.png'), backBuffer);
  console.log('Saved: test-output/back_color.png');
  
  console.log('\nDone!');
}

main().catch(console.error);
