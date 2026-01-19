// Test regex patterns for issue date extraction

const ocrText = "AAAI A PHAM 7 | Date of Issue 20 18/05/03 | 2026/Jan/ 11";

console.log('OCR Text:', ocrText);
console.log('\n=== Testing Regex Patterns ===\n');

// Pattern 1: Year split
const pattern1 = /(\d{2})\s+(\d{2}\/\d{1,2}\/\d{1,2})/g;
const match1 = [...ocrText.matchAll(pattern1)];
console.log('Pattern 1 (year split): /(\d{2})\s+(\d{2}\/\d{1,2}\/\d{1,2})/g');
console.log('Matches:', match1.map(m => ({ full: m[0], group1: m[1], group2: m[2] })));

if (match1.length > 0) {
  const dateStr = match1[0][1] + match1[0][2];
  const cleaned = dateStr.replace(/\s+/g, '');
  console.log('Combined:', dateStr);
  console.log('Cleaned:', cleaned);
}

// Pattern 2: Ethiopian with space
const pattern2 = /(\d{4}\/[A-Za-z]{3}\/\s*\d{1,2})/g;
const match2 = [...ocrText.matchAll(pattern2)];
console.log('\nPattern 2 (Ethiopian with space): /(\d{4}\/[A-Za-z]{3}\/\s*\d{1,2})/g');
console.log('Matches:', match2.map(m => m[1]));

if (match2.length > 0) {
  const cleaned = match2[0][1].replace(/\s+/g, '');
  console.log('Cleaned:', cleaned);
}

console.log('\n=== Expected Results ===');
console.log('Gregorian: 2018/05/03');
console.log('Ethiopian: 2026/Jan/11');
