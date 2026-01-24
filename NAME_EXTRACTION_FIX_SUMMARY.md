# Name Extraction Fix Summary

## Problem
The PDF parser was not correctly extracting Amharic names from the two test fayda PDF files:
- `template/efayda_Eset Tsegay Gebremeskel.pdf`
- `template/efayda_Mulu Kidanu Haylu.pdf`

Both files were extracting "አገልግሎቶች አቅራቢዎች እራሳቸውን" (meaning "service providers themselves") instead of the actual person names.

## Root Causes

### 1. Incorrect Extraction Strategy
The original code tried to extract the Amharic name from a window BEFORE the English name, but the actual PDF structure is:
```
FCN (16-digit number)
Amharic Name
English Name
```

The Amharic name appears AFTER the FCN, not before the English name.

### 2. Word "ሙሉ" in Exclusion List
The word "ሙሉ" (meaning "full" as in "full name") was in the exclusion list, which prevented extracting names containing this common Ethiopian name component. The second test file has a person named "ሙሉ ኪዳኑ ሃይሉ" (Mulu Kidanu Haylu).

### 3. Substring Matching in Exclusion Check
The exclusion check used `.includes()` which matches substrings. This caused the name "እሴት" to be excluded because it contains "ሴት" (meaning "female") as a substring.

## Solution

### 1. Extract Amharic Name After FCN
Changed the extraction logic to look for the Amharic name immediately after the FCN number:

```typescript
// Extract FCN first
const fcnPattern = /(\d{4}\s+\d{4}\s+\d{4}\s+\d{4})/;
const fcnMatch = text.match(fcnPattern);

if (fcnMatch) {
  const fcnIndex = text.indexOf(fcnMatch[1]);
  // Look in a window after FCN (up to 100 chars)
  const afterFcn = text.substring(fcnIndex + fcnMatch[1].length, fcnIndex + fcnMatch[1].length + 100);
  
  // Find Amharic name pattern (2-4 words) after FCN
  const amharicAfterFcnPattern = /([\u1200-\u137F]+(?:\s+[\u1200-\u137F]+){1,3})/;
  const amharicMatch = afterFcn.match(amharicAfterFcnPattern);
  
  if (amharicMatch) {
    const candidateName = amharicMatch[1].trim();
    // ... exclusion check ...
  }
}
```

### 2. Removed "ሙሉ" from Exclusion List
Removed "ሙሉ" from the exclusion list since it's a common name component, not just a form field label.

### 3. Changed to Whole-Word Matching
Changed the exclusion check from substring matching to whole-word matching:

```typescript
// OLD (substring matching - BAD)
const isExcluded = excludeWords.some(w => candidateName.includes(w));

// NEW (whole-word matching - GOOD)
const words = candidateName.split(/\s+/);
const isExcluded = words.some(word => excludeWords.includes(word));
```

This ensures that "እሴት" is not excluded just because it contains "ሴት" as a substring.

## Test Results

### Before Fix
```
File 1: efayda_Eset Tsegay Gebremeskel.pdf
  English: ✅ "Eset Tsegay Gebremeskel"
  Amharic: ❌ "አገልግሎቶች አቅራቢዎች እራሳቸውን" (WRONG)

File 2: efayda_Mulu Kidanu Haylu.pdf
  English: ✅ "Mulu Kidanu Haylu"
  Amharic: ❌ "አገልግሎቶች አቅራቢዎች እራሳቸውን" (WRONG)
```

### After Fix
```
File 1: efayda_Eset Tsegay Gebremeskel.pdf
  English: ✅ "Eset Tsegay Gebremeskel"
  Amharic: ✅ "እሴት ፀጋይ ገብረመስቀል" (CORRECT)

File 2: efayda_Mulu Kidanu Haylu.pdf
  English: ✅ "Mulu Kidanu Haylu"
  Amharic: ✅ "ሙሉ ኪዳኑ ሃይሉ" (CORRECT)
```

## Files Modified
- `src/services/pdf/parser.ts` - Updated Amharic name extraction logic

## Verification
Both PDF files were successfully processed and rendered into ID cards:
- Normal and mirrored PNG images generated
- Normal and mirrored PDF files generated
- All extracted data (names, dates, addresses) correct

## Conclusion
The name extraction issue was caused by:
1. Looking in the wrong location (before English name instead of after FCN)
2. Overly aggressive exclusion list (including common name components)
3. Substring matching instead of whole-word matching

All issues have been fixed and verified with the test PDF files.
