import fs from 'fs';
import pdfParse from 'pdf-parse';

async function checkNameLabel() {
  const files = [
    'template/efayda_Eset Tsegay Gebremeskel.pdf',
    'template/efayda_Mulu Kidanu Haylu.pdf'
  ];

  for (const file of files) {
    console.log('\n' + '='.repeat(80));
    console.log(file);
    console.log('='.repeat(80));
    
    const buffer = fs.readFileSync(file);
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text;
    
    // Look for "ሙሉ ስም" label
    const nameLabel = 'ሙሉ ስም';
    const nameLabelIndex = text.indexOf(nameLabel);
    
    if (nameLabelIndex !== -1) {
      console.log(`\n✅ Found "ሙሉ ስም" at position ${nameLabelIndex}`);
      
      // Show context around it
      const start = Math.max(0, nameLabelIndex - 100);
      const end = Math.min(text.length, nameLabelIndex + 300);
      console.log('\nContext:');
      console.log(text.substring(start, end));
      
      // Look for text after the label
      const afterLabel = text.substring(nameLabelIndex + nameLabel.length, nameLabelIndex + nameLabel.length + 200);
      console.log('\n--- Text after "ሙሉ ስም" (200 chars) ---');
      console.log(afterLabel);
      
      // Try to find the Amharic name
      const amharicPattern = /([\u1200-\u137F]+(?:\s+[\u1200-\u137F]+){1,3})/;
      const matches = [...afterLabel.matchAll(new RegExp(amharicPattern, 'g'))];
      
      console.log('\n--- Amharic sequences after label ---');
      matches.forEach((match, idx) => {
        console.log(`${idx + 1}. "${match[0]}"`);
      });
      
    } else {
      console.log('\n❌ "ሙሉ ስም" not found in PDF');
      
      // Try alternative patterns
      console.log('\nSearching for alternatives...');
      if (text.includes('First, Middle, Surname')) {
        const idx = text.indexOf('First, Middle, Surname');
        console.log(`Found "First, Middle, Surname" at position ${idx}`);
        const after = text.substring(idx, idx + 200);
        console.log('After:', after);
      }
    }
  }
}

checkNameLabel().catch(console.error);
