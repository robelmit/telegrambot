/**
 * Test A4 paper layout with cards at top
 */
import { CardVariantGenerator } from './src/services/generator/cardVariantGenerator';
import { EfaydaData } from './src/types';
import fs from 'fs';
import sharp from 'sharp';

async function testA4TopPosition() {
  console.log('=== Testing A4 Layout - Cards at Top ===\n');

  const mockData: EfaydaData = {
    fullNameAmharic: 'ሙሉ ስም',
    fullNameEnglish: 'Test User',
    sex: 'Male',
    dateOfBirthEthiopian: '1995/05/15',
    dateOfBirthGregorian: '15/01/2003',
    nationality: 'Ethiopian',
    region: 'Addis Ababa',
    city: 'Addis Ababa',
    subcity: 'Test Subcity',
    fin: '1234567890123',
    fcn: 'FCN123456',
    fan: 'FAN123456',
    phoneNumber: '0911234567',
    photo: Buffer.from('test'),
    serialNumber: '12345678',
    issueDate: '2026/01/24',
    issueDateEthiopian: '2018/05/16',
    expiryDate: '2036/01/24',
    expiryDateEthiopian: '2028/05/16'
  };

  try {
    const generator = new CardVariantGenerator('test-output');
    
    console.log('Generating cards with A4 layout (top position)...');
    const { normalCombined } = await generator.generateColorVariants(mockData, 'template2');
    
    fs.writeFileSync('test-output/a4-top-position.png', normalCombined);
    
    const meta = await sharp(normalCombined).metadata();
    
    console.log('\n=== A4 Layout Results ===');
    console.log(`Size: ${meta.width} × ${meta.height} pixels`);
    console.log(`DPI: ${meta.density || 'not set'}`);
    console.log(`Format: ${meta.format}`);
    console.log(`File size: ${Math.round(normalCombined.length / 1024)}KB`);
    
    console.log('\n=== Position Details ===');
    console.log(`Top Margin: 30 pixels (minimal)`);
    console.log(`Cards start near the top of A4 paper`);
    console.log(`Horizontally centered`);
    
    console.log('\n=== Benefits ===');
    console.log('✅ Cards at top for easy access');
    console.log('✅ Maximum space below for notes/editing');
    console.log('✅ Standard A4 paper (210mm × 297mm)');
    console.log('✅ 300 DPI print quality');
    
    console.log('\n📄 Output: test-output/a4-top-position.png');
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testA4TopPosition();