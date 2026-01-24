/**
 * Test rendering both PDF files to verify name extraction and card generation
 */
import fs from 'fs';
import { pdfParser } from './src/services/pdf/parser';
import { IDGeneratorService } from './src/services/generator';

async function testRender() {
  const files = [
    { path: 'template/efayda_Eset Tsegay Gebremeskel.pdf', name: 'Eset' },
    { path: 'template/efayda_Mulu Kidanu Haylu.pdf', name: 'Mulu' }
  ];

  for (const file of files) {
    console.log('\n' + '='.repeat(80));
    console.log(`Processing: ${file.path}`);
    console.log('='.repeat(80));

    try {
      const buffer = fs.readFileSync(file.path);
      const data = await pdfParser.parse(buffer);
      
      console.log('\nExtracted Data:');
      console.log('  English Name:', data.fullNameEnglish);
      console.log('  Amharic Name:', data.fullNameAmharic);
      console.log('  Sex:', data.sex);
      console.log('  DOB:', data.dateOfBirthGregorian);
      console.log('  Phone:', data.phoneNumber);
      console.log('  Region:', data.region);
      console.log('  FCN:', data.fcn);
      console.log('  FIN:', data.fin);
      
      // Generate card
      console.log('\nGenerating card...');
      const generator = new IDGeneratorService('test-output');
      const result = await generator.generateAll(data, `test-${file.name}`);
      
      console.log(`✅ Card generated successfully!`);
      console.log(`   Normal PNG: ${result.colorNormalPng}`);
      console.log(`   Mirrored PNG: ${result.colorMirroredPng}`);
      console.log(`   Normal PDF: ${result.colorNormalPdf}`);
      console.log(`   Mirrored PDF: ${result.colorMirroredPdf}`);
      
    } catch (error) {
      console.error('❌ Error:', error);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('Test complete! Check test-output/ folder for rendered files');
  console.log('='.repeat(80));
}

testRender().catch(console.error);
