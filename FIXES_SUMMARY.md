# Card Rendering Fixes Summary

## Issues Fixed

### 1. Name Detection Issue
**Problem**: Parser was incorrectly extracting address text (e.g., "ቀይሕ ተኽሊ") as the Amharic name instead of the actual name.

**Solution**: 
- Updated name extraction to look for Amharic text immediately before the English name in the PDF structure
- Added more exclusion words to filter out address-related terms
- Improved pattern matching to find the correct name position in the PDF text flow

**Result**: Now correctly extracts "ደገፍ ወለደአብዝጊ ገብረወልድ" as the Amharic name.

---

### 2. Address Detection Issue
**Problem**: Parser was mixing up regions (showing "ትግራይ Tigray" with "አዲስ አበባ Addis Ababa") and not extracting zone/woreda correctly.

**Solution**:
- Rewrote address extraction to follow the structured format in the PDF
- Extract address fields sequentially after phone number: Region → Zone → Woreda
- Each field has Amharic line followed by English line
- Pattern matching now correctly identifies the boundaries between fields

**Result**: Now correctly extracts:
- Region: ትግራይ / Tigray
- Zone: ማዕከላዊ ዞን / Central Zone  
- Woreda: ቀይሕ ተኽሊ / Qeyh tekl'i

---

### 3. Ethiopian Calendar Date Issue
**Problem**: Expiry dates were being extracted with month names (e.g., "2034/Jan/16") instead of numeric format.

**Solution**:
- Added `normalizeEthiopianDate()` function to convert month names to numbers
- Handles various month name formats (Jan, January, Oct, 0ct for OCR misreads)
- Applied normalization to all Ethiopian date extractions

**Result**: Now correctly formats as "2034/01/16" instead of "2034/Jan/16".

---

### 4. Expiry Date Calculation
**Problem**: The calculated expiry dates may not match the actual expiry dates from the ID card.

**Current Behavior**:
- Parser first attempts to extract expiry dates from OCR of the card image
- Falls back to calculated dates (DOB + 30 years) if OCR fails
- OCR-extracted dates take priority over calculated dates

**Note**: The expiry date "2026/05/08" from OCR seems unusually soon (only ~4 years from DOB 1992). This might be:
- A renewal date rather than original expiry
- An error in the source PDF
- Correct if this is a short-term ID

---

## Files Modified

1. **src/services/pdf/parser.ts**
   - Fixed name extraction logic
   - Fixed address extraction (region, zone, woreda)
   - Added `normalizeEthiopianDate()` function
   - Improved pattern matching for structured data

2. **src/services/generator/cardRenderer.ts**
   - No changes needed (rendering logic was already correct)

3. **src/config/cardLayout.json**
   - No changes needed (layout configuration was already correct)

---

## Testing

Run the test script to verify the fixes:

```bash
npx ts-node test-template-pdf.ts
```

Expected output:
- Full Name (Amharic): ደገፍ ወለደአብዝጊ ገብረወልድ
- Full Name (English): Degef Weldeabzgi Gebreweld
- Region: ትግራይ / Tigray
- Zone: ማዕከላዊ ዞን / Central Zone
- Woreda: ቀይሕ ተኽሊ / Qeyh tekl'i
- Expiry Date (Ethiopian): 2034/01/16
- Expiry Date (Gregorian): 2026/05/08

To render and view the cards:

```bash
npx ts-node test-render-card.ts
```

Check the output in `test-output/rendered-front.png` and `test-output/rendered-back.png`.

---

## Recommendations

1. **Verify Expiry Dates**: Check if the OCR-extracted expiry dates match the actual dates on the physical ID cards. If there are discrepancies, the OCR cropping area or date extraction logic may need adjustment.

2. **Test with More PDFs**: Test the parser with additional PDF samples to ensure the fixes work across different ID card formats and layouts.

3. **Monitor Edge Cases**: Watch for PDFs with:
   - Different address formats (e.g., Addis Ababa subcities)
   - Names with unusual character combinations
   - Different date formats

4. **Production Deployment**: After testing, copy the fixed files to the server directory:
   ```bash
   copy src\services\pdf\parser.ts server\services\pdf\parser.ts
   ```

---

## Date Format Reference

### Ethiopian Calendar
- Format: YYYY/MM/DD
- Example: 2034/01/16
- Approximately 7-8 years behind Gregorian calendar

### Gregorian Calendar  
- Format: DD/MM/YYYY or YYYY/MM/DD
- Example: 08/05/2026 or 2026/05/08
- Standard international calendar

---

## Additional Notes

- The parser now correctly handles both structured PDF text and OCR-extracted data
- Background removal for photos uses AI (Transformers.js) with flood-fill fallback
- All fonts are properly registered for Amharic, English, and special characters
- The rendering pipeline maintains color accuracy using sRGB color space normalization
