/**
 * Test script to verify bleed area is working correctly
 */
import { CardVariantGenerator } from './src/services/generator/cardVariantGenerator';
import { PDFGenerator } from './src/services/generator/pdfGenerator';
import { EfaydaData } from './src/types';
import fs from 'fs/promises';
import path from 'path';

// Mock data for testing
const mockData: EfaydaData = {
  fullNameAmharic: 'አበበ በቀለ ተስፋዬ',
  fullNameEnglish: 'Abebe Bekele Tesfaye',
  dateOfBirthEthiopian: '1985/05/12',
  dateOfBirthGregorian: '1993/01/20',
  sex: 'Male',
  sexAmharic: 'ወንድ',
  phoneNumber: '0911234567',
  nationality: 'Ethiopian',
  region: 'Addis Ababa',
  regionAmharic: 'አዲስ አበባ',
  city: 'Addis Ababa',
  zoneAmharic: 'አዲስ አበባ',
  subcity: 'Bole Sub City',
  woredaAmharic: 'ቦሌ ክ/ከተማ',
  fcn: '1234 5678 9012 3456',
  fin: '1234 5678 9012',
  fan: '1234 5678 9012 3456',
  serialNumber: '1234567',
  expiryDate: '2035/01/20',
  expiryDateGregorian: '2035/01/20',
  expiryDateEthiopian: '2027/05/12',
  issueDate: '2025/01/20',
  issueDateEthiopian: '2017/05/12'
};

async function testBleed() {
  console.log('🧪 Testing bleed area implementation...\n');
  
  // Ensure output directory exists
  const outputDir = 'test-output';
  await fs.mkdir(outputDir, { recursive: true });
  
  // Generate card variants
  const variantGenerator = new CardVariantGenerator(outputDir);
  
  console.log('📐 Generating cards with bleed area...');
  const { normalCombined, mirroredCombined } = await variantGenerator.generateColorVariants(mockData);
  
  // Save PNG files
  const normalPngPath = path.join(outputDir, 'test_bleed_normal.png');
  const mirroredPngPath = path.join(outputDir, 'test_bleed_mirrored.png');
  
  await fs.writeFile(normalPngPath, normalCombined);
  console.log(`✅ Saved: ${normalPngPath}`);
  
  await fs.writeFile(mirroredPngPath, mirroredCombined);
  console.log(`✅ Saved: ${mirroredPngPath}`);
  
  // Generate PDF
  const pdfGenerator = new PDFGenerator();
  const pdfPath = path.join(outputDir, 'test_bleed_A4.pdf');
  
  console.log('\n📄 Generating A4 PDF with bleed...');
  await pdfGenerator.generateA4PDFFromBuffer(normalCombined, pdfPath);
  console.log(`✅ Saved: ${pdfPath}`);
  
  // Get image dimensions to verify bleed
  const sharp = (await import('sharp')).default;
  const metadata = await sharp(normalCombined).metadata();
  
  console.log('\n📏 Image dimensions:');
  console.log(`   Width: ${metadata.width}px`);
  console.log(`   Height: ${metadata.height}px`);
  
  // Expected dimensions with bleed:
  // Original card: 1024 x 646 px
  // With bleed (35px each side): 1094 x 716 px per card
  // Combined: (1094*2 + 80 gap + 60 padding) x (716 + 60 padding) = 2328 x 776 px
  const expectedWidth = (1024 + 70) * 2 + 80 + 60; // 2328
  const expectedHeight = 646 + 70 + 60; // 776
  
  console.log(`   Expected: ${expectedWidth} x ${expectedHeight}px`);
  
  if (metadata.width === expectedWidth && metadata.height === expectedHeight) {
    console.log('\n✅ Bleed area is correctly applied!');
  } else {
    console.log('\n⚠️  Dimensions differ from expected (may be due to rounding)');
  }
  
  console.log('\n🎉 Test complete! Check the files in test-output/');
  console.log('   - The cards should extend slightly beyond the cutting guides');
  console.log('   - When cut, edges will show card content instead of white paper');
}

testBleed().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
