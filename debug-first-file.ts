import fs from 'fs';
import pdfParse from 'pdf-parse';

async function debug() {
  const buffer = fs.readFileSync('template/efayda_Eset Tsegay Gebremeskel.pdf');
  const pdfData = await pdfParse(buffer);
  const text = pdfData.text;
  
  const fcnPattern = /(\d{4}\s+\d{4}\s+\d{4}\s+\d{4})/;
  const fcnMatch = text.match(fcnPattern);
  
  if (fcnMatch) {
    console.log('FCN:', fcnMatch[1]);
    const fcnIndex = text.indexOf(fcnMatch[1]);
    const afterFcn = text.substring(fcnIndex + fcnMatch[1].length, fcnIndex + fcnMatch[1].length + 100);
    
    console.log('\nAfter FCN:');
    console.log(afterFcn);
    
    const amharicPattern = /([\u1200-\u137F]+(?:\s+[\u1200-\u137F]+){1,3})/;
    const amharicMatch = afterFcn.match(amharicPattern);
    
    if (amharicMatch) {
      const candidateName = amharicMatch[1].trim();
      console.log('\nCandidate name:', candidateName);
      
      const excludeWords = [
        'ኢትዮጵያ', 'ብሔራዊ', 'መታወቂያ', 'ፕሮግራም', 'ዲጂታል', 'ካርድ', 
        'ክፍለ', 'ከተማ', 'ወረዳ', 'ክልል', 'ዜግነት', 'ስልክ', 'የስነ', 
        'ሕዝብ', 'መረጃ', 'ማሳሰቢያ', 'ፋይዳ', 'ቁጥር', 'አድራሻ', 'ጾታ',
        'የትውልድ', 'ቀን', 'ያበቃል', 'ተሰጠ', 'እዚህ', 'ይቁረጡ', 'ቅዳ',
        'ስም', 'ፆታ', 'ወንድ', 'ሴት', 'ኢትዮጵያዊ', 'ተወላጅ',
        'የማንነት', 'መገለጫዎች', 'ናቸው', 'አበባ', 'አዲስ', 'ዞን', 'ማዕከላዊ',
        'ቀይሕ', 'ተኽሊ', 'ወሎሰፈር', 'ቦሌ', 'ጎዳና', 'ቻይና', 'ኢትዮ', 'ትግራይ',
        'አዋጅ', 'መሠረት', 'ህጋዊ', 'ናቸው', 'ማንኛውም', 'ከብሄራዊ', 'ሲስተም',
        'ታትሞ', 'የተገኘ', 'ወይም', 'በቀጥታ', 'የሚታተም', 'ዓዲ', 'ሓቂ', 'ሓድነት',
        'አገልግሎት', 'ብቻ', 'ልገሎት'
      ];
      
      const isExcluded = excludeWords.some(w => candidateName.includes(w));
      console.log('Is excluded:', isExcluded);
      
      if (isExcluded) {
        console.log('Excluded by words:', excludeWords.filter(w => candidateName.includes(w)));
      }
      
      const wordCount = candidateName.split(/\s+/).length;
      console.log('Word count:', wordCount);
      
      if (!isExcluded && wordCount >= 2) {
        console.log('✅ Would be extracted!');
      } else {
        console.log('❌ Would NOT be extracted');
      }
    }
  }
}

debug().catch(console.error);
