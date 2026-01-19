# How to Test the Optimized OCR

## Quick Test Instructions

### Step 1: Place Your PDF File

1. Locate your **eFayda Abel PDF** file
2. Copy it to the `template/` folder
3. Rename it to something simple like: `efayda-abel.pdf`

### Step 2: Update Test Script

Open `test-efayda-pdf.ts` and update line 13:

```typescript
const pdfFileName = 'efayda-abel.pdf'; // Change this to your actual PDF filename
```

### Step 3: Run the Test

```bash
# Option 1: Run with ts-node (faster for testing)
npx ts-node test-efayda-pdf.ts

# Option 2: Build and run
npm run build
node dist/test-efayda-pdf.js
```

### Step 4: Check Results

The test will show:
- ⏱️  **Processing time** (should be ~5-7 seconds with PaddleOCR)
- 📊 **All extracted data** (name, FIN, address, etc.)
- ✅ **Validation checks** (what worked, what didn't)
- 🔍 **Address extraction status**

## Expected Output

```
======================================================================
🚀 Testing eFayda PDF Processing with Optimized OCR
======================================================================

📁 Loading PDF: efayda-abel.pdf
✅ PDF loaded: 245.67 KB

⏱️  Starting OCR processing...
   (Using optimized PaddleOCR - should take ~5-7 seconds)

======================================================================
✅ PDF Processing Complete!
======================================================================

⏱️  PERFORMANCE METRICS:
   Total Processing Time: 5234ms (5.23s)
   Status: ⚡ EXCELLENT! (Using optimized OCR)

📊 EXTRACTED DATA:
──────────────────────────────────────────────────────────────────────

👤 Personal Information:
   Name (English):  Abel Tesfaye Gebru
   Name (Amharic):  አቤል ተስፋዬ ገብሩ
   Sex:             Male (ወንድ)
   DOB (Gregorian): 15/03/1995
   DOB (Ethiopian): 1987/07/07

📱 Contact & Location:
   Phone Number:    0912345678
   Region:          ትግራይ / Tigray
   Zone/City:       መቐለ / Mekelle
   Woreda/Subcity:  ቀይሕ ተኽሊ / Qeyih Tekli

🆔 ID Numbers:
   FIN (12 digits): 1234 5678 9012
   FCN/FAN:         1234 5678 9012 3456
   Serial Number:   87654321

📅 Dates:
   Issue Date:      2026/01/19 (Gregorian)
   Issue Date:      2018/01/19 (Ethiopian)
   Expiry Date:     2056/03/15 (Gregorian)
   Expiry Date:     2048/07/07 (Ethiopian)

🖼️  Images:
   Photo:           ✅ Extracted
   QR Code:         ✅ Extracted
   Barcode:         ❌ Not found

======================================================================

🔍 VALIDATION CHECKS:
──────────────────────────────────────────────────────────────────────
   ✅ Name (English)        - OK
   ✅ Name (Amharic)        - OK
   ✅ FIN                   - OK
   ✅ Phone Number          - OK
   ✅ Region                - OK
   ✅ Zone/City             - OK
   ✅ Woreda/Subcity        - OK
   ✅ Photo                 - OK
   ✅ QR Code               - OK

──────────────────────────────────────────────────────────────────────
   Summary: 9 passed, 0 failed, 0 warnings
   Result: ✅ ALL CRITICAL CHECKS PASSED!

======================================================================

✅ ADDRESS EXTRACTION: Working correctly!
   Full Address: ቀይሕ ተኽሊ, መቐለ, ትግራይ

💡 TIPS:
   - Processing speed is good!
   - For even faster processing, enable Google Vision API

======================================================================
```

## What to Look For

### ✅ Good Results:
- Processing time: **5-7 seconds** (down from 15 seconds!)
- All critical fields extracted
- Address shows correctly (Region, Zone, Woreda)
- FIN is 12 digits
- Phone number starts with 09

### ⚠️ Issues to Check:
- If processing time > 10 seconds: OCR might not be optimized
- If address is missing: PDF format might be different
- If FIN is wrong: OCR quality issue

## Alternative: Test via Telegram Bot

If you prefer to test through the actual bot:

1. Start the bot:
   ```bash
   npm run build
   npm start
   ```

2. Send the PDF to your Telegram bot

3. Check the console logs for:
   ```
   [INFO] paddle OCR completed in 2341ms, confidence: 0.92
   [INFO] Extracted FIN from back card: 1234 5678 9012
   [INFO] Extracted region from back card: ትግራይ / Tigray
   ```

## Troubleshooting

### "File not found" error
- Make sure PDF is in `template/` folder
- Check filename matches in script
- Use forward slashes in path

### "OCR failed" error
- Check if PDF is valid
- Try with a different PDF
- Check logs for detailed error

### Slow processing (>10s)
- PaddleOCR might not be working
- Check if `ppu-paddle-ocr` is installed
- Try: `npm install ppu-paddle-ocr`

### Address not extracted
- This is the issue we're fixing!
- Check logs to see what was extracted
- Share the output with me for debugging

## Need Help?

If you encounter issues:
1. Share the test output
2. Share any error messages
3. Let me know what data is missing or incorrect
