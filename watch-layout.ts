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
const FONTS_DIR = 'src/assets/fonts';
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
registerFont(path.join(FONTS_DIR, 'nyala.ttf'), { family: 'Nyala' });
registerFont(path.join(FONTS_DIR, 'ARIAL.TTF'), { family: 'Arial' });
registerFont(path.join(FONTS_DIR, 'ARIALBD.TTF'), { family: 'Arial', weight: 'bold' });

function loadLayout() {
  delete require.cache[require.resolve('./' + LAYOUT_PATH)];
  const content = fs.readFileSync(LAYOUT_PATH, 'utf-8');
  return JSON.parse(content);
}

function getFontString(size: number, weight: string, family: string, fallback: string): string {
  const w = weight === '700' ? 'bold' : weight === '600' ? '600' : 'normal';
  return `${w} ${size}px ${family}, ${fallback}`;
}

async function render() {
  const layout = loadLayout();
  const { dimensions, front, back, fonts } = layout;

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
  fctx.font = getFontString(front.nameAmharic.fontSize, front.nameAmharic.fontWeight, front.nameAmharic.fontFamily, fonts.amharic.fallback);
  fctx.fillText(sampleData.fullNameAmharic, front.nameAmharic.x, front.nameAmharic.y);

  // Name English
  fctx.fillStyle = front.nameEnglish.color;
  fctx.font = getFontString(front.nameEnglish.fontSize, front.nameEnglish.fontWeight, 'Arial', fonts.english.fallback);
  fctx.fillText(sampleData.fullNameEnglish, front.nameEnglish.x, front.nameEnglish.y);

  // DOB
  fctx.fillStyle = front.dateOfBirth.color;
  fctx.font = getFontString(front.dateOfBirth.fontSize, front.dateOfBirth.fontWeight, 'Arial', fonts.english.fallback);
  fctx.fillText(`${sampleData.dateOfBirthGregorian} | ${sampleData.dateOfBirthEthiopian}`, front.dateOfBirth.x, front.dateOfBirth.y);

  // Sex
  fctx.fillStyle = front.sex.color;
  fctx.font = getFontString(front.sex.fontSize, front.sex.fontWeight, 'Nyala', fonts.amharic.fallback);
  const sexAmharic = sampleData.sex === 'Female' ? 'ሴት' : 'ወንድ';
  fctx.fillText(sexAmharic, front.sex.x, front.sex.y);
  const sexWidth = fctx.measureText(sexAmharic).width;
  fctx.font = getFontString(front.sex.fontSize, front.sex.fontWeight, 'Arial', fonts.english.fallback);
  fctx.fillText(`  |  ${sampleData.sex}`, front.sex.x + sexWidth, front.sex.y);

  // Expiry
  fctx.fillStyle = front.expiryDate.color;
  fctx.font = getFontString(front.expiryDate.fontSize, front.expiryDate.fontWeight, 'Arial', fonts.english.fallback);
  fctx.fillText(`${sampleData.expiryDateGregorian} | ${sampleData.expiryDateEthiopian}`, front.expiryDate.x, front.expiryDate.y);

  // FAN
  fctx.fillStyle = front.fan.color;
  fctx.font = getFontString(front.fan.fontSize, front.fan.fontWeight, 'Consolas', fonts.monospace.fallback);
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
  fctx.font = getFontString(front.dateOfIssueEthiopian.fontSize, front.dateOfIssueEthiopian.fontWeight, 'Arial', fonts.english.fallback);
  fctx.save();
  fctx.translate(front.dateOfIssueEthiopian.x, front.dateOfIssueEthiopian.y);
  fctx.rotate((front.dateOfIssueEthiopian.rotation * Math.PI) / 180);
  fctx.fillText(sampleData.issueDateEthiopian, 0, 0);
  fctx.restore();

  // Issue date Gregorian (rotated)
  fctx.fillStyle = front.dateOfIssueGregorian.color;
  fctx.font = getFontString(front.dateOfIssueGregorian.fontSize, front.dateOfIssueGregorian.fontWeight, 'Arial', fonts.english.fallback);
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
  bctx.font = getFontString(back.phoneNumber.fontSize, back.phoneNumber.fontWeight, 'Arial', fonts.english.fallback);
  bctx.fillText(sampleData.phoneNumber, back.phoneNumber.x, back.phoneNumber.y);

  // Region Amharic
  bctx.fillStyle = back.regionAmharic.color;
  bctx.font = getFontString(back.regionAmharic.fontSize, back.regionAmharic.fontWeight, 'Nyala', fonts.amharic.fallback);
  bctx.fillText('ትግራይ', back.regionAmharic.x, back.regionAmharic.y);

  // Region English
  bctx.fillStyle = back.regionEnglish.color;
  bctx.font = getFontString(back.regionEnglish.fontSize, back.regionEnglish.fontWeight, 'Arial', fonts.english.fallback);
  bctx.fillText(sampleData.region, back.regionEnglish.x, back.regionEnglish.y);

  // Zone Amharic
  bctx.fillStyle = back.zoneAmharic.color;
  bctx.font = getFontString(back.zoneAmharic.fontSize, back.zoneAmharic.fontWeight, 'Nyala', fonts.amharic.fallback);
  bctx.fillText('መቐለ', back.zoneAmharic.x, back.zoneAmharic.y);

  // Zone English
  bctx.fillStyle = back.zoneEnglish.color;
  bctx.font = getFontString(back.zoneEnglish.fontSize, back.zoneEnglish.fontWeight, 'Arial', fonts.english.fallback);
  bctx.fillText(sampleData.city, back.zoneEnglish.x, back.zoneEnglish.y);

  // Woreda Amharic
  bctx.fillStyle = back.woredaAmharic.color;
  bctx.font = getFontString(back.woredaAmharic.fontSize, back.woredaAmharic.fontWeight, 'Nyala', fonts.amharic.fallback);
  bctx.fillText('ሓድነት', back.woredaAmharic.x, back.woredaAmharic.y);

  // Woreda English
  bctx.fillStyle = back.woredaEnglish.color;
  bctx.font = getFontString(back.woredaEnglish.fontSize, back.woredaEnglish.fontWeight, 'Arial', fonts.english.fallback);
  bctx.fillText(sampleData.subcity, back.woredaEnglish.x, back.woredaEnglish.y);

  // FIN
  bctx.fillStyle = back.fin.color;
  bctx.font = getFontString(back.fin.fontSize, back.fin.fontWeight, 'Consolas', fonts.monospace.fallback);
  bctx.fillText(sampleData.fin, back.fin.x, back.fin.y);

  // Serial
  bctx.fillStyle = back.serialNumber.color;
  bctx.font = getFontString(back.serialNumber.fontSize, back.serialNumber.fontWeight, 'Arial', fonts.english.fallback);
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
