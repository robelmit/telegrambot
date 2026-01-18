import fs from 'fs';
import path from 'path';
import { pdfParser } from './src/services/pdf/parser';
import pdfParse from 'pdf-parse';

async function testMahtot() {
  const pdfPath = path.join(__dirname, 'template', 'mahtot.pdf');
  
  console.log('=== Testing Mahtot PDF ===');
  console.log('Reading PDF:', pdfPath);
  
  const pdfBuffer = fs.readFileSync(pdfPath);
  
  // First, get raw text
  console.log('\n=== RAW PDF TEXT ===');
  const rawData = await pdfParse(pdfBuffer);
  console.log(rawData.text);
  console.log('\n=== END RAW TEXT ===\n');
  
  // Save raw text
  fs.writeFileSync('test-output/mahtot-raw-text.txt', rawData.text);
  console.log('Raw text saved to test-output/mahtot-raw-text.txt');
  
  // Now parse with our parser
  console.log('\n=== Parsing with Our Parser ===');
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
  
  console.log('\n=== IDs ===');
  console.log('FCN/FAN:', data.fcn);
  console.log('FIN:', data.fin);
  console.log('Serial:', data.serialNumber);
  
  console.log('\n=== Dates ===');
  console.log('Issue Date (Ethiopian):', data.issueDateEthiopian);
  console.log('Issue Date (Gregorian):', data.issueDate);
  console.log('Expiry Date (Ethiopian):', data.expiryDateEthiopian);
  console.log('Expiry Date (Gregorian):', data.expiryDateGregorian);
  
  // Save images
  if (data.photo) {
    const photoBuffer = typeof data.photo === 'string' ? Buffer.from(data.photo, 'base64') : data.photo;
    fs.writeFileSync('test-output/mahtot-photo.jpg', photoBuffer);
    console.log('\nPhoto saved to test-output/mahtot-photo.jpg');
  }
  
  if (data.qrCode) {
    const qrBuffer = typeof data.qrCode === 'string' ? Buffer.from(data.qrCode, 'base64') : data.qrCode;
    fs.writeFileSync('test-output/mahtot-qr.jpg', qrBuffer);
    console.log('QR code saved to test-output/mahtot-qr.jpg');
  }
  
  console.log('\n=== Issues to Check ===');
  console.log('Expected Woreda: ቐ/ወያነ ክ/ከተማ (Kedamay Weyane Sub City)');
  console.log('Extracted Woreda:', data.woredaAmharic, '/', data.subcity);
  console.log('Match:', data.woredaAmharic?.includes('ቐ') || data.woredaAmharic?.includes('ወያነ') ? '✓' : '✗');
  
  console.log('\nFIN Check:');
  console.log('Extracted FIN:', data.fin);
  console.log('Expected format: XXXX XXXX XXXX (12 digits)');
}

testMahtot().catch(console.error);
