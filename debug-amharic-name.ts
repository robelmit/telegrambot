/**
 * Debug Amharic name extraction issue
 */
import fs from 'fs';
import pdfParse from 'pdf-parse';

async function debugAmharicName() {
  const pdfFile = 'template/efayda_Eset Tsegay Gebremeskel.pdf';
  const buffer = fs.readFileSync(pdfFile);
  const pdfData = await pdfParse(buffer);
  const text = pdfData.text;

  console.log('Full PDF Text:');
  console.log('='.repeat(80));
  console.log(text);
  console.log('='.repeat(80));

  // Find the English name
  const englishName = 'Eset Tsegay Gebremeskel';
  const englishIndex = text.indexOf(englishName);
  
  console.log('\nEnglish name position:', englishIndex);
  console.log('English name:', englishName);

  // Look for Amharic text BEFORE the English name
  console.log('\n--- Text BEFORE English name (last 200 chars) ---');
  const beforeEnglish = text.substring(Math.max(0, englishIndex - 200), englishIndex);
  console.log(beforeEnglish);

  // Look for Amharic text AFTER the English name
  console.log('\n--- Text AFTER English name (first 200 chars) ---');
  const afterEnglish = text.substring(englishIndex + englishName.length, Math.min(text.length, englishIndex + englishName.length + 200));
  console.log(afterEnglish);

  // Find all Amharic sequences
  const amharicPattern = /([\u1200-\u137F]+(?:\s+[\u1200-\u137F]+){1,3})/g;
  const matches = [...text.matchAll(amharicPattern)];
  
  console.log('\n--- All Amharic sequences with positions ---');
  matches.forEach((match, idx) => {
    const position = match.index || 0;
    const distanceFromEnglish = position - englishIndex;
    console.log(`${idx + 1}. Position ${position} (${distanceFromEnglish > 0 ? '+' : ''}${distanceFromEnglish} from English): "${match[0]}"`);
  });

  // Find the Amharic name that should be "እሴት ፀጋይ ገብረመስቀል"
  const expectedAmharic = 'እሴት ፀጋይ ገብረመስቀል';
  const amharicIndex = text.indexOf(expectedAmharic);
  
  console.log('\n--- Expected Amharic Name ---');
  console.log('Expected:', expectedAmharic);
  console.log('Position:', amharicIndex);
  console.log('Distance from English name:', amharicIndex - englishIndex);
  
  if (amharicIndex !== -1) {
    console.log('\n✅ Amharic name IS in the PDF text');
    console.log('Context (50 chars before and after):');
    console.log(text.substring(Math.max(0, amharicIndex - 50), Math.min(text.length, amharicIndex + expectedAmharic.length + 50)));
  } else {
    console.log('\n❌ Amharic name NOT found in PDF text');
  }
}

debugAmharicName().catch(console.error);
