# National ID PDF FCN Extraction Fix

## Problem
National ID PDFs downloaded from Fayda API were failing to process with error "We couldn't process your document". The issue was that the FCN (16-digit number) was not being extracted.

## Root Cause
The parser was looking for FCN in the format with spaces: `\d{4}\s+\d{4}\s+\d{4}\s+\d{4}` (e.g., "4287 1307 4680 6479")

However, National ID PDFs from Fayda have the FCN as a **continuous 16-digit number without spaces**: `4287130746806479`

## PDF Format Differences

### Regular eFayda PDF:
```
FCN: 4287 1307 4680 6479
```
(FCN appears with spaces right after the label)

### National ID PDF from Fayda:
```
FCN:
[other text...]
4287130746806479
```
(FCN appears as continuous digits, far from the label)

## Solution
Updated the FCN extraction pattern to handle both formats:

```typescript
// Before:
const fcnPattern = /(\d{4}\s+\d{4}\s+\d{4}\s+\d{4})/;

// After:
const fcnPattern = /(\d{4}\s+\d{4}\s+\d{4}\s+\d{4}|\d{16})/;
```

The parser now:
1. Looks for FCN with spaces OR without spaces
2. Normalizes the format to include spaces for consistency
3. Extracts: `4287130746806479` → `4287 1307 4680 6479`

## Test Results

### Before Fix:
```
FCN: (empty)
FIN: 7813 7540 3253
❌ Processing failed - FCN required
```

### After Fix:
```
FCN: 4287 1307 4680 6479
FIN: 7813 7540 3253
✅ PDF processed successfully!
```

## Files Modified
- `src/services/pdf/parser.ts` - Updated FCN extraction pattern

## Impact
- ✅ National ID PDFs from `/id` command now process correctly
- ✅ Regular eFayda PDFs still work (backward compatible)
- ✅ Both formats (with/without spaces) are supported
- ✅ FCN is normalized to consistent format with spaces

## Testing
Tested with actual National ID PDF (`fayda_id_781375403253.pdf`):
- ✅ Validation: PASS
- ✅ FCN Extraction: PASS (4287 1307 4680 6479)
- ✅ FIN Extraction: PASS (7813 7540 3253)
- ✅ Name Extraction: PASS
- ✅ Photo Extraction: PASS
- ✅ QR Code Extraction: PASS
- ✅ Full Processing: SUCCESS

## Build Status
✅ TypeScript compilation: Success
✅ Build completed: Success
✅ Bot restarted: Success
✅ Fix active: Ready to use

## User Experience

### Before:
```
User: [uploads National ID PDF]
Bot: ✅ Your request has been received!
     ❌ We couldn't process your document.
```

### After:
```
User: [uploads National ID PDF]
Bot: ✅ Your request has been received!
     ✅ [Sends 4 ID card files]
```

National ID PDFs downloaded from the `/id` command now work perfectly for ID card generation!
