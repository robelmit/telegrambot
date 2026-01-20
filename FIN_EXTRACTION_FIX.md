# FIN Extraction Fix - Hgigat Aregawi Hagos PDF Issue

## Date: January 20, 2026

## Issue Reported
FIN field was showing a **subset of FCN** instead of the actual FIN value from the PDF.

## Root Cause
The PDF text extraction was attempting to extract FIN from PDF text, which was unreliable and resulted in extracting the last 12 digits of the FCN (16 digits) instead of the actual FIN field.

**Example**:
- FCN (16 digits): `1234 5678 9012 3456`
- Old behavior: Extracted `9012 3456` (last 12 digits of FCN) ❌
- Correct behavior: Extract actual FIN from back card image via OCR ✓

## Solution
**FIN is now extracted ONLY from back card image (image 4) via OCR, NOT from PDF text.**

### Changes Made

**File**: `src/services/pdf/parser.ts`

#### Change 1: Removed FIN extraction from PDF text (line ~200)
```typescript
// OLD CODE (REMOVED):
const finPattern = /(\d{4}\s+\d{4}\s+\d{4})(?!\s+\d)/;
const finMatch = text.match(finPattern);
if (finMatch) {
  data.fin = finMatch[1];
} else {
  // If no separate FIN found, generate from FCN (LAST 12 digits, not first!)
  const fcnDigits = data.fcn.replace(/\s/g, '');
  if (fcnDigits.length >= 12) {
    const finDigits = fcnDigits.substring(fcnDigits.length - 12);
    data.fin = `${finDigits.substring(0,4)} ${finDigits.substring(4,8)} ${finDigits.substring(8,12)}`;
  }
}

// NEW CODE:
// FIN extraction is ONLY done via OCR from back card image (image 4)
// Do NOT extract FIN from PDF text - it's unreliable
// Leave data.fin empty here, will be filled by OCR extraction
data.fin = '';
```

#### Change 2: Updated final FIN assignment to use ONLY OCR (line ~870)
```typescript
// OLD CODE:
const finalFin = backCardData.fin || parsed.fin; // Had fallback to parsed.fin

// NEW CODE:
const finalFin = backCardData.fin; // ONLY from OCR, no fallback to parsed.fin

// Warn if FIN was not extracted via OCR
if (!finalFin) {
  logger.warn('FIN was not extracted from back card image (OCR failed). FIN will be empty.');
}
```

## How FIN Extraction Works Now

1. **PDF is uploaded** → 4 images are extracted:
   - Image 1: Photo
   - Image 2: QR code
   - Image 3: Front card (for expiry dates)
   - **Image 4: Back card (for FIN extraction)** ✓

2. **OCR runs on image 4** (back card):
   - Preprocesses image (resize to 2000px, normalize, sharpen)
   - Runs Tesseract OCR with English language
   - Extracts FIN using pattern matching:
     - Strategy 1: Look for "FIN" keyword followed by 12 digits
     - Strategy 2: Find first occurrence of three consecutive 4-digit groups

3. **FIN is assigned** from OCR result only:
   - No fallback to PDF text extraction
   - If OCR fails, FIN will be empty (with warning logged)

## Issue Date Extraction (Confirmed Correct)
The issue date extraction logic is already correct and was NOT changed:
- **First date found = Ethiopian calendar**
- **Second date found = Gregorian calendar**

This is the expected behavior and matches the PDF format.

## Testing
Test with the Hgigat Aregawi Hagos PDF:
1. Upload PDF through Telegram bot
2. Check FIN field in result
3. FIN should be the actual FIN from the back card (extracted via OCR from image 4)
4. FIN should NOT be a subset of FCN

## Impact
- ✓ FIN now extracted correctly from back card image via OCR
- ✓ No more FCN subset confusion
- ✓ More reliable FIN extraction
- ✓ Clear warning if OCR fails to extract FIN
- ✓ Issue date order confirmed correct (Ethiopian first, Gregorian second)

## Files Modified
- `src/services/pdf/parser.ts` - Removed FIN extraction from PDF text, use OCR only
- `src/services/generator/pdfGenerator.ts` - Removed footer warning text (separate fix)

## Status: READY FOR TESTING ✓
