// Test updated issue date extraction logic

const testText = `Date of Issue 2 0 18/04/27 2026/Jdan/ 05`;

console.log('=== Testing Updated Issue Date Extraction ===\n');
console.log('OCR Text:', testText);
console.log();

// Updated patterns
const datePatterns = [
  { name: 'YYYY/MM/DD with year split (3 parts)', regex: /(\d)\s+(\d)\s+(\d{2}\/\d{1,2}\/\d{1,2})/g, type: 'ethiopian-split-3', needsCleanup: true },
  { name: 'YYYY/MM/DD with year split (2 parts)', regex: /(\d{2})\s+(\d{2}\/\d{1,2}\/\d{1,2})/g, type: 'ethiopian-split-2', needsCleanup: true },
  { name: 'DD/MM/YYYY', regex: /(\d{1,2}\/\d{1,2}\/\d{4})/g, type: 'gregorian-ddmmyyyy', needsCleanup: false },
  { name: 'YYYY/MM/DD', regex: /(\d{4}\/\d{1,2}\/\d{1,2})/g, type: 'ethiopian-yyyymmdd', needsCleanup: false },
  { name: 'YYYY/Mon/DD with space', regex: /(\d{4}\/[A-Za-z]{3,5}\/\s*\d{1,2})/g, type: 'gregorian', needsCleanup: true },
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
    
    // Handle year split case (3 parts)
    if (pattern.type === 'ethiopian-split-3' && match[2] && match[3]) {
      console.log(`  → 3-part split: "${match[1]}" + "${match[2]}" + "${match[3]}"`);
      dateStr = match[1] + match[2] + match[3];
      dateStr = dateStr.replace(/\s+/g, '');
      year = parseInt(dateStr.split('/')[0]);
      console.log(`  → Combined: ${dateStr}, year: ${year}`);
    }
    // Handle year split case (2 parts)
    else if (pattern.type === 'ethiopian-split-2' && match[2]) {
      console.log(`  → 2-part split: "${match[1]}" + "${match[2]}"`);
      dateStr = match[1] + match[2];
      dateStr = dateStr.replace(/\s+/g, '');
      year = parseInt(dateStr.split('/')[0]);
      console.log(`  → Combined: ${dateStr}, year: ${year}`);
    }
    // Clean up spacing
    else if (pattern.needsCleanup) {
      console.log(`  → Cleanup: "${dateStr}"`);
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
      console.log(`  ✗ Year ${year} out of range`);
    }
  }
  console.log();
}

console.log('=== Found Dates ===');
foundDates.forEach((d, i) => {
  console.log(`${i+1}. ${d.date} (${d.type})`);
});

// Normalize month names
function normalizeDate(dateStr) {
  const monthMap = {
    'jan': '01', 'jdan': '01',
    'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
    'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
  };
  
  let normalized = dateStr;
  for (const [monthName, monthNum] of Object.entries(monthMap)) {
    const regex = new RegExp(`/${monthName}/`, 'gi');
    normalized = normalized.replace(regex, `/${monthNum}/`);
  }
  return normalized;
}

console.log('\n=== Assignment (First=Ethiopian, Second=Gregorian) ===');
if (foundDates.length >= 1) {
  const ethiopian = normalizeDate(foundDates[0].date);
  console.log('Ethiopian (1st):', ethiopian);
}
if (foundDates.length >= 2) {
  const gregorian = normalizeDate(foundDates[1].date);
  console.log('Gregorian (2nd):', gregorian);
}

console.log('\n=== Expected ===');
console.log('Ethiopian: 2018/04/27');
console.log('Gregorian: 2026/01/05');

console.log('\n=== Status ===');
const ethiopianMatch = foundDates.length >= 1 && normalizeDate(foundDates[0].date) === '2018/04/27';
const gregorianMatch = foundDates.length >= 2 && normalizeDate(foundDates[1].date) === '2026/01/05';
console.log('Ethiopian:', ethiopianMatch ? '✓ CORRECT' : '✗ WRONG');
console.log('Gregorian:', gregorianMatch ? '✓ CORRECT' : '✗ WRONG');
