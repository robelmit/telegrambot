# FIN Extraction Issue

## Problem

From the mahtot result image, we can see:
- **FCN (FAN)**: `5795 4976 0359 1430` (16 digits)
- **FIN**: `4976 0359 1430` (12 digits)

The FIN is the **LAST 12 digits** of the FCN, not the first 12!

## Current Logic (WRONG)

```typescript
// Extract FIN (12 digits with spaces)
const finPattern = /(\d{4}\s+\d{4}\s+\d{4})(?!\s+\d)/;
const finMatch = text.match(finPattern);
if (finMatch) {
  data.fin = finMatch[1];
} else {
  // Generate from FCN (first 12 digits) ← WRONG!
  const fcnDigits = data.fcn.replace(/\s/g, '');
  if (fcnDigits.length >= 12) {
    const finDigits = fcnDigits.substring(0, 12); // ← Takes FIRST 12
    data.fin = `${finDigits.substring(0,4)} ${finDigits.substring(4,8)} ${finDigits.substring(8,12)}`;
  }
}
```

## The Issue

The pattern `(?!\s+\d)` tries to ensure we don't match part of a longer number, but:
1. If FIN appears separately in text, it should match ✓
2. If FIN doesn't appear separately, we generate from FCN
3. **BUT** we're taking the FIRST 12 digits instead of LAST 12 digits ✗

## Correct Logic

FIN should be the **LAST 12 digits** of FCN:

```typescript
// Extract FIN (12 digits with spaces) - look for separate FIN field
const finPattern = /(\d{4}\s+\d{4}\s+\d{4})(?!\s+\d)/;
const finMatch = text.match(finPattern);
if (finMatch) {
  data.fin = finMatch[1];
} else {
  // If no separate FIN found, generate from FCN (LAST 12 digits)
  const fcnDigits = data.fcn.replace(/\s/g, '');
  if (fcnDigits.length >= 12) {
    const finDigits = fcnDigits.substring(fcnDigits.length - 12); // ← Take LAST 12
    data.fin = `${finDigits.substring(0,4)} ${finDigits.substring(4,8)} ${finDigits.substring(8,12)}`;
  }
}
```

## Example

FCN: `5795 4976 0359 1430` → `5795497603591430` (16 digits)

**Current (WRONG)**:
- First 12 digits: `579549760359`
- Formatted: `5795 4976 0359` ✗

**Correct**:
- Last 12 digits: `497603591430`
- Formatted: `4976 0359 1430` ✓

## Woreda Issue

The woreda pattern is looking for text before "FCN:" or a number starting with 6:

```typescript
const woredaPattern = /\s*([\u1200-\u137F\s]+?)\s*\n\s*([A-Za-z\s']+?)\s*\n\s*(?:FCN:|6\d{3})/;
```

This should work, but the issue might be:
1. The Amharic text `ቐ/ወያነ` has special characters
2. The pattern might not be matching correctly

Expected:
- Amharic: `ቐ/ወያነ ክ/ከተማ` or `ወያነ ክ/ከተማ`
- English: `Kedamay Weyane Sub City` or `Weyane Sub City`

The pattern should be updated to handle the special character `ቐ` (which is U+1250).

## Fix Required

1. Change FIN extraction to use LAST 12 digits of FCN
2. Update woreda pattern to handle special characters like `ቐ` and `/`
