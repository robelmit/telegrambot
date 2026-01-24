import fs from 'fs';
import { pdfParser } from './src/services/pdf/parser';

async function testNames() {
  const files = [
    { path: 'template/efayda_Eset Tsegay Gebremeskel.pdf', expectedAmharic: 'እሴት ፀጋይ ገብረመስቀል', expectedEnglish: 'Eset Tsegay Gebremeskel' },
    { path: 'template/efayda_Mulu Kidanu Haylu.pdf', expectedAmharic: 'ሙሉ ኪዳኑ ሃይሉ', expectedEnglish: 'Mulu Kidanu Haylu' }
  ];

  let output = '';
  
  for (const file of files) {
    output += '\n' + '='.repeat(80) + '\n';
    output += file.path + '\n';
    output += '='.repeat(80) + '\n';
    
    const buffer = fs.readFileSync(file.path);
    const data = await pdfParser.parse(buffer);
    
    const englishMatch = data.fullNameEnglish === file.expectedEnglish;
    const amharicMatch = data.fullNameAmharic === file.expectedAmharic;
    
    output += `English: ${englishMatch ? '✅' : '❌'} "${data.fullNameEnglish}"\n`;
    output += `Expected: "${file.expectedEnglish}"\n\n`;
    output += `Amharic: ${amharicMatch ? '✅' : '❌'} "${data.fullNameAmharic}"\n`;
    output += `Expected: "${file.expectedAmharic}"\n`;
    
    if (!amharicMatch) {
      output += `\nDifference:\n`;
      output += `  Extracted length: ${data.fullNameAmharic?.length || 0} chars\n`;
      output += `  Expected length: ${file.expectedAmharic.length} chars\n`;
    }
  }
  
  fs.writeFileSync('test-output/name-test-results.txt', output, 'utf8');
  console.log('Results saved to test-output/name-test-results.txt');
  console.log(output);
}

testNames().catch(console.error);
