import fs from 'fs';
import pdfParse from 'pdf-parse';

async function findPattern() {
  const buffer = fs.readFileSync('template/efayda_Eset Tsegay Gebremeskel.pdf');
  const pdfData = await pdfParse(buffer);
  const text = pdfData.text;
  
  console.log('Full text length:', text.length);
  console.log('\n--- Last 500 characters of PDF ---');
  console.log(text.substring(text.length - 500));
  
  // Find all occurrences of "ሙሉ ስም"
  console.log('\n--- All occurrences of "ሙሉ ስም" ---');
  let index = 0;
  let count = 0;
  while ((index = text.indexOf('ሙሉ ስም', index)) !== -1) {
    count++;
    console.log(`\nOccurrence ${count} at position ${index}:`);
    const context = text.substring(Math.max(0, index - 50), Math.min(text.length, index + 150));
    console.log(context);
    index += 'ሙሉ ስም'.length;
  }
  
  // Check the structure around the actual name
  const expectedName = 'እሴት ፀጋይ ገብረመስቀል';
  const nameIndex = text.indexOf(expectedName);
  
  console.log(`\n--- Context around actual name (position ${nameIndex}) ---`);
  const before = text.substring(Math.max(0, nameIndex - 200), nameIndex);
  const after = text.substring(nameIndex, Math.min(text.length, nameIndex + 100));
  
  console.log('BEFORE name:');
  console.log(before);
  console.log('\nNAME and AFTER:');
  console.log(after);
}

findPattern().catch(console.error);
