import fs from 'fs';
import path from 'path';
import { pdfParser } from './src/services/pdf/parser';

async function testTemplatePdf() {
  const pdfPath = path.join(__dirname, 'template', 'efayda_Degef Weldeabzgi Gebreweld .pdf');
  
  console.log('Reading PDF:', pdfPath);
  const pdfBuffer = fs.readFileSync(pdfPath);
  
  console.log('\n=== Parsing PDF ===');
  const data = await pdfParser.parse(pdfBuffer);
  
  console.log('\n=== Extracted Data ===');
  console.log('Full Name (Amharic):', data.fullNameAmharic);
  console.log('Full Name (English):', data.fullNameEnglish);
  console.log('DOB (Ethiopian):', data.dateOfBirthEthiopian);
  console.log('DOB (Gregorian):', data.dateOfBirthGregorian);
  console.log('Sex:', data.sex, '/', data.sexAmharic);
  console.log('Phone:', data.phoneNumber);
  console.log('\n=== Address ===');
  console.log('Region (Amharic):', data.regionAmharic);
  console.log('Region (English):', data.region);
  console.log('Zone (Amharic):', data.zoneAmharic);
  console.log('Zone (English):', data.city);
  console.log('Woreda (Amharic):', data.woredaAmharic);
  console.log('Woreda (English):', data.subcity);
  console.log('\n=== Dates ===');
  console.log('Issue Date (Ethiopian):', data.issueDateEthiopian);
  console.log('Issue Date (Gregorian):', data.issueDate);
  console.log('Expiry Date (Ethiopian):', data.expiryDateEthiopian);
  console.log('Expiry Date (Gregorian):', data.expiryDateGregorian);
  console.log('\n=== IDs ===');
  console.log('FCN/FAN:', data.fcn);
  console.log('FIN:', data.fin);
  console.log('Serial:', data.serialNumber);
  console.log('Nationality:', data.nationality);
  
  // Save images for inspection
  if (data.photo) {
    const photoBuffer = typeof data.photo === 'string' ? Buffer.from(data.photo, 'base64') : data.photo;
    fs.writeFileSync('test-output/extracted-photo.jpg', photoBuffer);
    console.log('\nPhoto saved to test-output/extracted-photo.jpg');
  }
  
  if (data.qrCode) {
    const qrBuffer = typeof data.qrCode === 'string' ? Buffer.from(data.qrCode, 'base64') : data.qrCode;
    fs.writeFileSync('test-output/extracted-qr.jpg', qrBuffer);
    console.log('QR code saved to test-output/extracted-qr.jpg');
  }
}

testTemplatePdf().catch(console.error);
