/**
 * Watch cardLayout.json and re-render on save
 * Run with: npx ts-node watch-layout.ts
 */

import fs from 'fs';
import path from 'path';
import { createCanvas, loadImage, registerFont } from 'canvas';
import JsBarcode from 'jsbarcode';

const LAYOUT_PATH = 'src/config/cardLayout.json';
const TEMPLATE_DIR = 'template/assets';
const OUTPUT_DIR = 'test-output';
const FONTS_DIR = path.resolve(__dirname, 'src/assets/fonts');
const PERSON_IMAGE = 'template/person.png';

// Sample data
const sampleData = {
  fullNameAmharic: 'ፀጋ ገብረስላሴ ገብረሂወት',
  fullNameEnglish: 'Tsega Gebreslasie Gebrehiwot',
  dateOfBirthEthiopian: '1981/Apr/29',
  dateOfBirthGregorian: '21/08/1973',
  sex: 'Female',
  phoneNumber: '0913687923',
  region: 'Tigray',
  city: 'Mekelle',
  subcity: 'Hadnet Sub City',
  fin: '4189 2798 1057',
  fan: '3092 7187 9089 3152',
  serialNumber: '5479474',
  issueDate: '2025/Dec/10',
  issueDateEthiopian: '2018/04/01',
  expiryDateGregorian: '2026/04/01',
  expiryDateEthiopian: '2033/Dec/10',
};

// Register fonts once
const fontsToRegister = [
  { file: 'Inter-Medium.otf', family: 'InterMedium', weight: 'normal' },
  { file: 'Inter-SemiBold.otf', family: 'InterSemiBold', weight: 'normal' },
  { file: 'Inter-Bold.otf', family: 'InterBold', weight: 'normal' },
  { file: 'OCR.ttf', family: 'OCRB', weight: 'normal' },
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

function loadLayout() {
  delete require.cache[require.resolve('./' + LAYOUT_PATH)];
  const content = fs.readFileSync(LAYOUT_PATH, 'utf-8');
  return JSON.parse(content);
}

async function render() {
  const layout = loadLayout();
  const { dimensions, front, back } = layout;

  // Render front
  const frontCanvas = createCanvas(dimensions.width, dimensions.height);
  const fctx = frontCanvas.getContext('2d');
  
  const frontTemplate = await loadImage(path.join(TEMPLATE_DIR, 'front_template.png'));
  fctx.drawImage(frontTemplate, 0, 0, dimensions.width, dimensions.height);

  // Main photo
  const personImg = await loadImage(PERSON_IMAGE);
  fctx.drawImage(personImg, front.mainPhoto.x, front.mainPhoto.y, front.mainPhoto.width, front.mainPhoto.height);

  // Small photo (thumbnail)
  fctx.drawImage(personImg, front.smallPhoto.x, front.smallPhoto.y, front.smallPhoto.width, front.smallPhoto.height);

  fctx.textBaseline = 'top';

  // Name Amharic
  fctx.fillStyle = front.nameAmharic.color;
  fctx.font = `bold ${front.nameAmharic.fontSize}px Ebrima`;
  fctx.fillText(sampleData.fullNameAmharic, front.nameAmharic.x, front.nameAmharic.y);

  // Name English
  fctx.fillStyle = front.nameEnglish.color;
  fctx.font = `bold ${front.nameEnglish.fontSize}px Arial`;
  fctx.fillText(sampleData.fullNameEnglish, front.nameEnglish.x, front.nameEnglish.y);

  // DOB
  fctx.fillStyle = front.dateOfBirth.color;
  fctx.font = `bold ${front.dateOfBirth.fontSize}px Arial`;
  fctx.fillText(`${sampleData.dateOfBirthGregorian} | ${sampleData.dateOfBirthEthiopian}`, front.dateOfBirth.x, front.dateOfBirth.y);

  // Sex
  fctx.fillStyle = front.sex.color;
  fctx.font = `bold ${front.sex.fontSize}px Ebrima`;
  const sexAmharic = sampleData.sex === 'Female' ? 'ሴት' : 'ወንድ';
  fctx.fillText(sexAmharic, front.sex.x, front.sex.y);
  const sexWidth = fctx.measureText(sexAmharic).width;
  fctx.font = `bold ${front.sex.fontSize}px Arial`;
  fctx.fillText(`  |  ${sampleData.sex}`, front.sex.x + sexWidth, front.sex.y);

  // Expiry
  fctx.fillStyle = front.expiryDate.color;
  fctx.font = `bold ${front.expiryDate.fontSize}px Arial`;
  fctx.fillText(`${sampleData.expiryDateGregorian} | ${sampleData.expiryDateEthiopian}`, front.expiryDate.x, front.expiryDate.y);

  // FAN
  fctx.fillStyle = front.fan.color;
  fctx.font = `bold ${front.fan.fontSize}px Consolas`;
  fctx.fillText(sampleData.fan, front.fan.x, front.fan.y);

  // Barcode
  const barcodeCanvas = createCanvas(front.barcode.width, front.barcode.height);
  JsBarcode(barcodeCanvas, sampleData.fan.replace(/\s/g, ''), {
    format: 'CODE128',
    width: Math.floor(front.barcode.width / sampleData.fan.replace(/\s/g, '').length / 11 * 2),
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
  fctx.fillText(sampleData.issueDateEthiopian, 0, 0);
  fctx.restore();

  // Issue date Gregorian (rotated)
  fctx.fillStyle = front.dateOfIssueGregorian.color;
  fctx.font = `bold ${front.dateOfIssueGregorian.fontSize}px Arial`;
  fctx.save();
  fctx.translate(front.dateOfIssueGregorian.x, front.dateOfIssueGregorian.y);
  fctx.rotate((front.dateOfIssueGregorian.rotation * Math.PI) / 180);
  fctx.fillText(sampleData.issueDate, 0, 0);
  fctx.restore();

  fs.writeFileSync(path.join(OUTPUT_DIR, 'front_color.png'), frontCanvas.toBuffer('image/png'));

  // Render back
  const backCanvas = createCanvas(dimensions.width, dimensions.height);
  const bctx = backCanvas.getContext('2d');
  
  const backTemplate = await loadImage(path.join(TEMPLATE_DIR, 'back_template.png'));
  bctx.drawImage(backTemplate, 0, 0, dimensions.width, dimensions.height);

  // QR Code placeholder (generate a sample QR)
  const QRCode = require('qrcode');
  const qrCanvas = createCanvas(back.qrCode.width, back.qrCode.height);
  await QRCode.toCanvas(qrCanvas, sampleData.fan.replace(/\s/g, ''), { width: back.qrCode.width, margin: 0 });
  bctx.drawImage(qrCanvas, back.qrCode.x, back.qrCode.y, back.qrCode.width, back.qrCode.height);

  bctx.textBaseline = 'top';

  // Phone
  bctx.fillStyle = back.phoneNumber.color;
  bctx.font = `bold ${back.phoneNumber.fontSize}px Arial`;
  bctx.fillText(sampleData.phoneNumber, back.phoneNumber.x, back.phoneNumber.y);

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
  bctx.fillText('ትግራይ', back.regionAmharic.x, back.regionAmharic.y);

  // Region English
  bctx.fillStyle = back.regionEnglish.color;
  bctx.font = `bold ${back.regionEnglish.fontSize}px Arial`;
  bctx.fillText(sampleData.region, back.regionEnglish.x, back.regionEnglish.y);

  // Zone Amharic
  bctx.fillStyle = back.zoneAmharic.color;
  bctx.font = `bold ${back.zoneAmharic.fontSize}px Ebrima`;
  bctx.fillText('መቐለ', back.zoneAmharic.x, back.zoneAmharic.y);

  // Zone English
  bctx.fillStyle = back.zoneEnglish.color;
  bctx.font = `bold ${back.zoneEnglish.fontSize}px Arial`;
  bctx.fillText(sampleData.city, back.zoneEnglish.x, back.zoneEnglish.y);

  // Woreda Amharic
  bctx.fillStyle = back.woredaAmharic.color;
  bctx.font = `bold ${back.woredaAmharic.fontSize}px Ebrima`;
  bctx.fillText('ሓድነት', back.woredaAmharic.x, back.woredaAmharic.y);

  // Woreda English
  bctx.fillStyle = back.woredaEnglish.color;
  bctx.font = `bold ${back.woredaEnglish.fontSize}px Arial`;
  bctx.fillText(sampleData.subcity, back.woredaEnglish.x, back.woredaEnglish.y);

  // FIN
  bctx.fillStyle = back.fin.color;
  bctx.font = `bold ${back.fin.fontSize}px Consolas`;
  bctx.fillText(sampleData.fin, back.fin.x, back.fin.y);

  // Serial
  bctx.fillStyle = back.serialNumber.color;
  bctx.font = `bold ${back.serialNumber.fontSize}px Arial`;
  bctx.fillText(sampleData.serialNumber, back.serialNumber.x, back.serialNumber.y);

  fs.writeFileSync(path.join(OUTPUT_DIR, 'back_color.png'), backCanvas.toBuffer('image/png'));

  console.log(`[${new Date().toLocaleTimeString()}] ✓ Rendered front_color.png & back_color.png`);
}

// Initial render
console.log('Watching cardLayout.json for changes...');
console.log('Edit src/config/cardLayout.json and save to see updates.\n');
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
