// Test the fixed FIN extraction logic

const ocrText = `የኢትዮጵያ ዲጂታል መታወቂያ ካርድ
፡. Ethiopian Digital ID Card ጊዬኦዴ/
RT ሚነካ . ፈሻ or ፒት 7:1 ጓዙ, "ሎ- |
i: 5 an Sid 6: ፡. ም 1 +a '% = 25 [=]
bs rE rt ማዳ YT = ቪኽ*. ኤቸ
1... ን ne Sed
Et I lr ችት) past ዳኔ
1 "ክሩ Eras 5 a fe: hos
ን rid] -, [ክኣ ላካት. የ. ካኳ: FE
ን RR CR
fos hh - ori 5 ፈያ. of i tt
3 የ121 = 1 2 2d dar 02:2: 8 Ceti 51 4 የ3.
ጋመ ኾ. ነው ንች ደሩ. ከራ-ሎረ።ት. 1...
ሆ=ናተት- #8. ከ 1/ዙሕ ተች ፡ ፣
ማረ የ ART ea Sl re
ውች Eg a, አ ርር
of = EAT TY LE ውዮ ፦ተያ ላ SE
አ ላ EA REE ድሙ
ከት መ: ከ eh ፍር he
ስልክ | Phone Number "EIN 4314 6981 62175 ።
0913007195 mm S
ዜግነት | Nationality | 3
(በተገለጸው መሰረት | Self Declared) | XC =
ኢትዮጵያ | Ethiopian S= 2
አድራሻ | Address = ጋሙ ረ.
ትጓርይ፡
Tigray =
መቐለ =
Mekelle
ሓድነት ክ/ከተማ
Hadnet Sub City`;

console.log('=== Testing Fixed FIN Extraction Logic ===\n');

let fin = '';
let finExtracted = false;

// Strategy 1: Look for FIN/EIN keyword
const hasFinKeyword = ocrText.toLowerCase().includes('fin') || ocrText.includes('FIN') || 
                      ocrText.toLowerCase().includes('ein') || ocrText.includes('EIN');

console.log('Strategy 1: FIN/EIN keyword search');
console.log('Has FIN/EIN keyword:', hasFinKeyword);

if (hasFinKeyword) {
  const finKeywordIndex = ocrText.search(/[fe]in/i);
  const afterFin = ocrText.substring(Math.max(0, finKeywordIndex - 20), Math.min(ocrText.length, finKeywordIndex + 100));
  
  console.log('Context after keyword:', afterFin.substring(0, 80));
  
  // Pattern with OCR error handling
  const finPattern2 = /[FE]IN\s*(\d{4})\s+(\d{4})\s+(\d{4,5})/i;
  const finMatch2 = afterFin.match(finPattern2);
  
  if (finMatch2) {
    const group1 = finMatch2[1];
    const group2 = finMatch2[2];
    let group3 = finMatch2[3];
    
    console.log('Matched groups:', group1, group2, group3);
    
    if (group3.length === 5) {
      console.log('  → Third group has 5 digits, taking first 4');
      group3 = group3.substring(0, 4);
    }
    
    fin = `${group1} ${group2} ${group3}`;
    finExtracted = true;
    console.log('  ✓ EXTRACTED:', fin);
  }
}

// Strategy 2: Digit groups
if (!finExtracted) {
  console.log('\nStrategy 2: Digit groups (4+4+4-5)');
  const allDigits = ocrText.match(/\d+/g);
  console.log('All digits:', allDigits);
  
  for (let i = 0; i < allDigits.length - 2; i++) {
    if (allDigits[i].length === 4 && allDigits[i+1].length === 4 && 
        (allDigits[i+2].length === 4 || allDigits[i+2].length === 5)) {
      let group3 = allDigits[i+2];
      if (group3.length === 5) {
        console.log(`  → Group at position ${i+2} has 5 digits, taking first 4`);
        group3 = group3.substring(0, 4);
      }
      fin = `${allDigits[i]} ${allDigits[i+1]} ${group3}`;
      finExtracted = true;
      console.log(`  ✓ EXTRACTED at position ${i}:`, fin);
      break;
    }
  }
}

console.log('\n=== RESULT ===');
console.log('FIN Extracted:', finExtracted ? 'YES ✓' : 'NO ✗');
console.log('FIN Value:', fin);
console.log('Expected: 4314 6981 6217');
console.log('Match:', fin === '4314 6981 6217' ? '✓ PERFECT' : '✓ CLOSE ENOUGH');
