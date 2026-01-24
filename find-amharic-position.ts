import fs from 'fs';
import pdfParse from 'pdf-parse';

async function findPosition() {
  const files = [
    { path: 'template/efayda_Eset Tsegay Gebremeskel.pdf', amharic: 'እሴት ፀጋይ ገብረመስቀል', english: 'Eset Tsegay Gebremeskel' },
    { path: 'template/efayda_Mulu Kidanu Haylu.pdf', amharic: 'ሙሉ ኪዳኑ ሃይሉ', english: 'Mulu Kidanu Haylu' }
  ];

  for (const file of files) {
    console.log('\n' + '='.repeat(80));
    console.log(file.path);
    console.log('='.repeat(80));
    
    const buffer = fs.readFileSync(file.path);
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text;
    
    const amharicPos = text.indexOf(file.amharic);
    const englishPos = text.indexOf(file.english);
    const fcnPattern = /(\d{4}\s+\d{4}\s+\d{4}\s+\d{4})/;
    const fcnMatch = text.match(fcnPattern);
    const fcnPos = fcnMatch ? text.indexOf(fcnMatch[1]) : -1;
    
    console.log('Amharic name position:', amharicPos);
    console.log('English name position:', englishPos);
    console.log('FCN position:', fcnPos);
    console.log('Distance Amharic -> English:', englishPos - amharicPos);
    console.log('Distance FCN -> Amharic:', amharicPos - fcnPos);
    console.log('Distance FCN -> English:', englishPos - fcnPos);
    
    console.log('\nContext around names:');
    const start = Math.max(0, amharicPos - 50);
    const end = Math.min(text.length, englishPos + file.english.length + 10);
    console.log(text.substring(start, end));
  }
}

findPosition().catch(console.error);
