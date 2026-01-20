// Test issue date extraction logic

const testText = `Date of Issue 2 0 18/04/27 2026/Jdan/ 05`;

console.log('=== Testing Issue Date Extraction ===\n');
console.log('OCR Text:', testText);
console.log();

// Simulate the extraction logic
const datePatterns = [
  { name: 'YYYY/MM/DD with year split', regex: /(\d{2})\s+(\d{2}\/\d{1,2}\/\d{1,2})/g, type: 'ethiopian-split', needsCleanup: true },
  { name: 'DD/MM/YYYY', regex: /(\d{1,2}\/\d{1,2}\/\d{4})/g, type: 'gregorian-ddmmyyyy', needsCleanup: false },
  { name: 'YYYY/MM/DD', regex: /(\d{4}\/\d{1,2}\/\d{1,2})/g, type: 'ethiopian-yyyymmdd', needsCleanup: false },
  { name: 'YYYY/Mon/DD with space', regex: /(\d{4}\/[A-Za-z]{3}\/\s*\d{1,2})/g, type: 'gregorian', needsCleanup: true },
  { name: 'YYYY/Mon/DD', regex: /(\d{4}\/[A-Za-z]{3,9}\/\d{1,2})/g, type: 'gregorian', needsCleanup: false },
];

let foundDates = [];
let orderCounter = 0;

for (const pattern of datePatterns) {
  const matches = [...testText.matchAll(pattern.regex)];
  console.log(`Pattern: ${pattern.name}`);
  console.log(`  Matches:`, matches.map(m => m[0]));
  
  for (const match of matches) {
    let dateStr = match[1];
    let year = 0;
    
    // Handle year split case
    if (pattern.type === 'ethiopian-split' && match[2]) {
      console.log(`  → Split year detected: "${match[1]}" + "${match[2]}"`);
      dateStr = match[1] + match[2];
      dateStr = dateStr.replace(/\s+/g, '');
      year = parseInt(dateStr.split('/')[0]);
      console.log(`  → Combined: ${dateStr}, year: ${year}`);
    }
    // Clean up spacing
    else if (pattern.needsCleanup) {
      console.log(`  → Cleanup needed: "${dateStr}"`);
      dateStr = dateStr.replace(/\s+/g, '');
      year = pattern.type === 'gregorian-ddmmyyyy' ? 
        parseInt(dateStr.split('/')[2]) : 
        parseInt(dateStr.split('/')[0]);
      console.log(`  → Cleaned: ${dateStr}, year: ${year}`);
    }
    else {
      year = pattern.type === 'gregorian-ddmmyyyy' ? 
        parseInt(dateStr.split('/')[2]) : 
        parseInt(dateStr.split('/')[0]);
      console.log(`  → Year: ${year}`);
    }
    
    if (year > 2015 && year <= 2040) {
      foundDates.push({
        date: dateStr,
        type: pattern.type,
        order: orderCounter++
      });
      console.log(`  ✓ Added to foundDates`);
    } else {
      console.log(`  ✗ Year ${year} out of range (2015-2040)`);
    }
  }
  console.log();
}

console.log('=== Found Dates ===');
foundDates.forEach((d, i) => {
  console.log(`${i+1}. ${d.date} (${d.type})`);
});

console.log('\n=== Assignment (First=Ethiopian, Second=Gregorian) ===');
if (foundDates.length >= 1) {
  console.log('Ethiopian (1st):', foundDates[0].date);
}
if (foundDates.length >= 2) {
  console.log('Gregorian (2nd):', foundDates[1].date);
}

console.log('\n=== Expected ===');
console.log('Ethiopian: 2018/04/27');
console.log('Gregorian: 2026/Jan/05 (or 2026/01/05)');
