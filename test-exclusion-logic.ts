/**
 * Test to demonstrate the difference between old and new exclusion logic
 */

// Test names
const testNames = [
  'እሴት ፀጋይ ገብረመስቀል',  // Eset - contains "ሴት" as substring
  'ሙሉ ኪዳኑ ሃይሉ',        // Mulu - contains "ሙሉ" as word
  'አገልግሎት ብቻ',         // "Service only" - should be excluded
  'ወንድ',                 // "Male" - should be excluded
  'ሴት',                  // "Female" - should be excluded
];

const excludeWords = [
  'ስም', 'ፆታ', 'ወንድ', 'ሴት', 'አገልግሎት', 'ብቻ', 'ልገሎት'
];

console.log('='.repeat(80));
console.log('OLD LOGIC (Substring Matching) - BROKEN');
console.log('='.repeat(80));

testNames.forEach(name => {
  // OLD: Substring matching
  const isExcludedOld = excludeWords.some(w => name.includes(w));
  console.log(`\n"${name}"`);
  console.log(`  Excluded: ${isExcludedOld ? '❌ YES' : '✅ NO'}`);
  if (isExcludedOld) {
    const matchedWords = excludeWords.filter(w => name.includes(w));
    console.log(`  Matched: ${matchedWords.join(', ')}`);
  }
});

console.log('\n\n' + '='.repeat(80));
console.log('NEW LOGIC (Whole-Word Matching) - FIXED');
console.log('='.repeat(80));

testNames.forEach(name => {
  // NEW: Whole-word matching
  const words = name.split(/\s+/);
  const isExcludedNew = words.some(word => excludeWords.includes(word));
  console.log(`\n"${name}"`);
  console.log(`  Words: [${words.join(', ')}]`);
  console.log(`  Excluded: ${isExcludedNew ? '❌ YES' : '✅ NO'}`);
  if (isExcludedNew) {
    const matchedWords = words.filter(word => excludeWords.includes(word));
    console.log(`  Matched: ${matchedWords.join(', ')}`);
  }
});

console.log('\n\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log('\nOLD (Substring): Excludes "እሴት ፀጋይ ገብረመስቀል" because it contains "ሴት"');
console.log('NEW (Whole-word): Keeps "እሴት ፀጋይ ገብረመስቀል" because "ሴት" is not a separate word');
console.log('\nOLD (Substring): Excludes "ሙሉ ኪዳኑ ሃይሉ" because it contains "ሙሉ"');
console.log('NEW (Whole-word): Keeps "ሙሉ ኪዳኑ ሃይሉ" because we removed "ሙሉ" from exclusions');
console.log('\nBoth correctly exclude: "አገልግሎት ብቻ", "ወንድ", "ሴት" (when standalone)');
