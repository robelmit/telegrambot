# National ID PDF Validation Fix

## Problem
PDFs downloaded from the National ID feature (`/id` command) were being rejected by the bot when users tried to upload them for ID card generation.

## Root Cause
The PDF validator was checking for specific text markers and ID number patterns that were present in regular eFayda PDFs but formatted differently in National ID PDFs from the Fayda API.

### Differences Between PDF Types

**Regular eFayda PDF markers:**
- Contains: "eFayda", "FIN", "FAN"
- ID format: `FIN: 1234 5678 9012` (inline)

**National ID PDF markers:**
- Contains: "Ethiopian Digital ID Card", "National ID", "FCN"
- ID format: `FCN:` on one line, number `3852 7647 9026 9825` on next line

## Solution

### 1. Updated EFAYDA_MARKERS (`src/services/pdf/types.ts`)
Added "FCN" to the list of required text markers:

```typescript
REQUIRED_TEXT: [
  'Ethiopian Digital ID Card',
  'National ID',
  'eFayda',
  'FIN',
  'FAN',
  'FCN'  // Added for National ID PDFs
]
```

### 2. Updated ID Number Pattern Matching (`src/services/pdf/validator.ts`)
Enhanced the regex patterns to support:
- FCN label (even if number is on next line)
- 16-digit ID numbers with spaces (e.g., `3852 7647 9026 9825`)

```typescript
const hasIdentifiers = 
  /FIN\s*[:\s]*\d{4}\s*\d{4}\s*\d{4}/i.test(text) ||
  /FAN\s*[:\s]*\d+/i.test(text) ||
  /FCN\s*[:]/i.test(text) || // FCN label (number may be on next line)
  /\d{4}\s*\d{4}\s*\d{4}\s*\d{4}/.test(text) || // 16-digit ID with spaces
  /\d{10,20}/.test(text); // Long number sequences
```

## Testing
Tested with actual National ID PDF downloaded from Fayda API:
- ✅ File extension validation: PASS
- ✅ PDF structure validation: PASS
- ✅ eFayda document validation: PASS

## Result
National ID PDFs are now accepted by the bot and can be processed for ID card generation, just like regular eFayda PDFs.

## Files Modified
1. `src/services/pdf/types.ts` - Added "FCN" to EFAYDA_MARKERS
2. `src/services/pdf/validator.ts` - Enhanced ID number pattern matching
