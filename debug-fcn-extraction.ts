import fs from 'fs';
import pdfParse from 'pdf-parse';

async function debugFcnExtraction() {
  const buffer = fs.readFileSync('template/efayda_Eset Tsegay Gebremeskel.pdf');
  const pdfData = await pdfParse(buffer);
  const text = pdfData.text;
  
  // Extract FCN
  const fcnPattern = /(\d{4}\s+\d{4}\s+\d{4}\s+\d{4})/;
  const fcnMatch = text.match(fcnPattern);
  
  if (fcnMatch) {
    console.log('FCN found:', fcnMatch[1]);
    const fcnIndex = text.indexOf(fcnMatch[1]);
    console.log('FCN position:', fcnIndex);
    
    // Look after FCN
    const afterFcn = text.substring(fcnIndex + fcnMatch[1].length, fcnIndex + fcnMatch[1].length + 100);
    console.log('\nText after FCN (100 chars):');
    console.log(afterFcn);
    console.log('\nBytes:', Buffer.from(afterFcn).toString('hex').substring(0, 200));
    
    // Try to match Amharic
    const amharicPattern = /([\u1200-\u137F]+(?:\s+[\u1200-\u137F]+){1,3})/;
    const amharicMatch = afterFcn.match(amharicPattern);
    
    if (amharicMatch) {
      console.log('\nAmharic match found:', amharicMatch[1]);
    } else {
      console.log('\nNo Amharic match found!');
      
      // Try simpler pattern
      const simplePattern = /([\u1200-\u137F]+)/g;
      const simpleMatches = [...afterFcn.matchAll(simplePattern)];
      console.log('\nSimple Amharic matches:', simpleMatches.map(m => m[1]));
    }
  }
}

debugFcnExtraction().catch(console.error);
