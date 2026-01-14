/**
 * Test Template 3 with bleed area - generates PNG and PDF
 */
import { CardVariantGenerator } from './src/services/generator/cardVariantGenerator';
import { PDFGenerator } from './src/services/generator/pdfGenerator';
import { EfaydaData } from './src/types';
import fs from 'fs/promises';
import path from 'path';

// Sample data for Template 3
const mockData: EfaydaData = {
  fullNameAmharic: 'ፀጋ ገብረስላሴ ገብረሂወት',
  fullNameEnglish: 'Tsega Gebreslasie Gebrehiwot',
  dateOfBirthEthiopian: '1981/Apr/29',
  dateOfBirthGregorian: '21/08/1973',
  sex: 'Female',
  sexAmharic: 'ሴት',
  phoneNumber: '0913687923',
  nationality: 'Ethiopian',
  region: 'Tigray',
  regionAmharic: 'ትግራይ',
  city: 'Mekelle',
  zoneAmharic: 'መቐለ',
  subcity: 'Hadnet Sub City',
  woredaAmharic: 'ሓድነት ክ/ከተማ',
  fcn: '3092 7187 9089 3152',
  fin: '4189 2798 1057',
  fan: '3092 7187 9089 3152',
  serialNumber: '5479474',
  expiryDate: '2033/Dec/10',
  expiryDateGregorian: '2033/Dec/10',
  expiryDateEthiopian: '2026/04/01',
  issueDate: '2025/Dec/10',
  issueDateEthiopian: '2018/04/01'
};

async function testTemplate3Bleed() {
  console.log('🧪 Testing Template 3 with bleed area...\n');
  
  const outputDir = 'test-output';
  await fs.mkdir(outputDir, { recursive: true });
  
  // Generate using template2 (which is Template 3 with halefront/haleback)
  const variantGenerator = new CardVariantGenerator(outputDir);
  
  console.log('📐 Generating Template 3 cards with bleed...');
  const { normalCombined, mirroredCombined } = await variantGenerator.generateColorVariants(mockData, 'template2');
  
  // Save PNG files
  const normalPngPath = path.join(outputDir, 'template3_bleed_normal.png');
  const mirroredPngPath = path.join(outputDir, 'template3_bleed_mirrored.png');
  
  await fs.writeFile(normalPngPath, normalCombined);
  console.log(`✅ Saved: ${normalPngPath}`);
  
  await fs.writeFile(mirroredPngPath, mirroredCombined);
  console.log(`✅ Saved: ${mirroredPngPath}`);
  
  // Generate PDF
  const pdfGenerator = new PDFGenerator();
  const pdfPath = path.join(outputDir, 'template3_bleed_A4.pdf');
  
  console.log('\n📄 Generating A4 PDF with bleed...');
  await pdfGenerator.generateA4PDFFromBuffer(normalCombined, pdfPath);
  console.log(`✅ Saved: ${pdfPath}`);
  
  // Check dimensions
  const sharp = (await import('sharp')).default;
  const metadata = await sharp(normalCombined).metadata();
  
  console.log('\n📏 Image dimensions:');
  console.log(`   Width: ${metadata.width}px`);
  console.log(`   Height: ${metadata.height}px`);
  console.log(`   Expected with bleed: 2328 x 776px`);
  
  console.log('\n🎉 Done! Check test-output/ folder for:');
  console.log('   - template3_bleed_normal.png');
  console.log('   - template3_bleed_mirrored.png');
  console.log('   - template3_bleed_A4.pdf');
}

testTemplate3Bleed().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
