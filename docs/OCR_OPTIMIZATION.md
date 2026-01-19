# OCR Optimization Guide

## Overview

The eFayda ID Generator uses intelligent OCR (Optical Character Recognition) to extract data from PDF documents. The system supports multiple OCR engines with automatic fallback for optimal speed and accuracy.

## OCR Engines

### 1. PaddleOCR (Default - FAST)
- **Speed**: ~2-3 seconds per image
- **Accuracy**: High (90-95%)
- **Cost**: Free
- **Setup**: No configuration needed (already included)
- **Best for**: Production use with good balance of speed and accuracy

### 2. Google Vision API (Premium - FASTEST)
- **Speed**: ~1-2 seconds per image
- **Accuracy**: Very High (95-98%)
- **Cost**: Paid (first 1000 requests/month free)
- **Setup**: Requires Google Cloud account and API key
- **Best for**: High-volume production with budget for API costs

### 3. Tesseract (Fallback - SLOWER)
- **Speed**: ~5-8 seconds per image
- **Accuracy**: Medium (80-85%)
- **Cost**: Free
- **Setup**: No configuration needed (already included)
- **Best for**: Automatic fallback when other engines fail

## Performance Comparison

| Engine | Speed | Accuracy | Cost | Setup Complexity |
|--------|-------|----------|------|------------------|
| Google Vision | ⚡⚡⚡ | ⭐⭐⭐⭐⭐ | 💰💰 | Medium |
| PaddleOCR | ⚡⚡ | ⭐⭐⭐⭐ | Free | Easy |
| Tesseract | ⚡ | ⭐⭐⭐ | Free | Easy |

## Setup Instructions

### Using PaddleOCR (Default - Recommended)

No setup required! PaddleOCR is already configured and will be used by default.

```bash
# Already installed in package.json
npm install
```

### Using Google Vision API (Optional - For Best Performance)

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable Vision API**
   - Navigate to "APIs & Services" > "Library"
   - Search for "Cloud Vision API"
   - Click "Enable"

3. **Create Service Account**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Download the JSON key file

4. **Install Google Vision Package**
   ```bash
   npm install @google-cloud/vision
   ```

5. **Configure Environment Variables**
   ```bash
   # In your .env file
   GOOGLE_VISION_ENABLED=true
   GOOGLE_VISION_KEY_PATH=./google-vision-credentials.json
   ```

6. **Place Credentials File**
   - Save the downloaded JSON key as `google-vision-credentials.json` in your project root
   - Make sure it's added to `.gitignore` (already configured)

## Configuration

The OCR service automatically selects the best available engine:

1. **Google Vision** (if enabled and configured)
2. **PaddleOCR** (default)
3. **Tesseract** (fallback)

### Environment Variables

```env
# Enable Google Vision API (optional)
GOOGLE_VISION_ENABLED=false
GOOGLE_VISION_KEY_PATH=./google-vision-credentials.json
```

## Usage

The OCR service is used automatically by the PDF parser. No code changes needed!

```typescript
// Automatic OCR selection
const result = await ocrService.extractText(imageBuffer);
console.log(`Extracted text using ${result.method} in ${result.processingTime}ms`);
```

## Troubleshooting

### Slow Processing (>10 seconds)

**Problem**: OCR is taking too long

**Solutions**:
1. Check if PaddleOCR is installed: `npm list ppu-paddle-ocr`
2. Enable Google Vision API for faster processing
3. Check system resources (CPU/Memory)

### Low Accuracy

**Problem**: Extracted text is incorrect

**Solutions**:
1. Enable Google Vision API for better accuracy
2. Check image quality (should be at least 300 DPI)
3. Ensure proper lighting in source images

### Google Vision API Errors

**Problem**: "Google Vision API not configured" or authentication errors

**Solutions**:
1. Verify `GOOGLE_VISION_ENABLED=true` in `.env`
2. Check credentials file path is correct
3. Ensure service account has Vision API permissions
4. Verify API is enabled in Google Cloud Console

## Cost Estimation

### Google Vision API Pricing

- **Free Tier**: 1,000 requests/month
- **After Free Tier**: $1.50 per 1,000 requests

**Example Costs**:
- 100 PDFs/day = 3,000 requests/month = $3/month
- 500 PDFs/day = 15,000 requests/month = $21/month
- 1,000 PDFs/day = 30,000 requests/month = $43.50/month

### PaddleOCR (Free)

- **Cost**: $0 (completely free)
- **Unlimited requests**
- **Recommended for most use cases**

## Recommendations

### For Development
- Use **PaddleOCR** (default) - free and fast enough

### For Production (Low Volume < 1000/month)
- Use **PaddleOCR** (default) - free and reliable

### For Production (High Volume > 1000/month)
- Use **Google Vision API** - fastest and most accurate
- Budget: ~$1.50 per 1,000 PDFs processed

### For Production (Budget Constrained)
- Use **PaddleOCR** (default) - excellent free alternative

## Monitoring

Check OCR performance in logs:

```
[INFO] paddle OCR completed in 2341ms, confidence: 0.92
[INFO] google-vision OCR completed in 1523ms, confidence: 0.96
[INFO] tesseract OCR completed in 6789ms, confidence: 0.85
```

## Support

For issues or questions:
- Check logs for detailed error messages
- Verify environment variables are set correctly
- Ensure all dependencies are installed
- Contact support: @efayda_support
