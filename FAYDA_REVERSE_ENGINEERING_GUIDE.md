# Fayda Website Reverse Engineering Guide

## Overview
This guide explains how to reverse engineer the official Fayda website (https://resident.fayda.et/) to automatically generate reCAPTCHA tokens for the National ID PDF feature.

## Step 1: Inspect the Fayda Website

Run the inspection script to discover the reCAPTCHA configuration:

```bash
# Install dependencies
npm install puppeteer

# Run inspection script
npx ts-node inspect-fayda-website.ts
```

This will:
1. Load the Fayda website in a headless browser
2. Extract the reCAPTCHA site key
3. Determine the reCAPTCHA version (v2 or v3)
4. Intercept an actual captcha token from form submission
5. Save a screenshot for debugging

**Expected Output:**
```
🔍 Inspecting Fayda website...

Step 1: Finding reCAPTCHA configuration...
✅ Found reCAPTCHA configuration:
   Site Key: 6LfBMhMqAAAAABPQE-JqLLLLLLLLLLLLLLLLLLLL
   Version: v3

Step 2: Intercepting captcha token...
✅ Captured captcha token:
   Length: 1500+ characters
   Preview: 0cAFcWeA7zXs5uGgw4NBLFlhqgkXGvMxM5udY_wLQzvp54SvHKkMQLPPEnllXV68...

📝 Save to .env:
   FAYDA_RECAPTCHA_SITE_KEY=6LfBMhMqAAAAABPQE-JqLLLLLLLLLLLLLLLLLLLL
```

## Step 2: Understanding the Flow

### Official Fayda Website Flow:
```
1. User visits https://resident.fayda.et/
2. Page loads reCAPTCHA JavaScript
3. User enters FCN/FAN number
4. User clicks "Verify" button
5. reCAPTCHA executes automatically (v3) or shows checkbox (v2)
6. JavaScript generates captcha token
7. Form submits to /verifycaptcha with token
8. API returns Fayda token
9. User enters OTP
10. API validates and returns PDF
```

### Our Bot's Flow:
```
1. User sends /id command
2. Bot launches headless Chrome
3. Bot loads https://resident.fayda.et/
4. Bot executes reCAPTCHA JavaScript
5. Bot captures generated token
6. Bot calls /verifycaptcha API with token
7. Bot receives Fayda token
8. User enters OTP in Telegram
9. Bot calls /validateOtp API
10. Bot downloads and sends PDF
```

## Step 3: Implementation Methods

### Method 1: Direct Token Generation (Recommended)
```typescript
import { generateFaydaCaptchaToken } from './services/captcha/faydaCaptcha';

// Generate token
const token = await generateFaydaCaptchaToken();

// Use token with API
const response = await axios.post('https://api-resident.fayda.et/verifycaptcha', {
  captchaValue: token,
  idNumber: finNumber,
  verificationMethod: 'FCN'
});
```

**Pros:**
- Fast (3-5 seconds)
- Reliable
- No form interaction needed

**Cons:**
- Requires correct site key
- Token may expire quickly

### Method 2: Network Interception (Most Accurate)
```typescript
import { interceptFaydaCaptchaToken } from './services/captcha/faydaCaptcha';

// Intercept token from actual form submission
const token = await interceptFaydaCaptchaToken(finNumber);

// Token is guaranteed to be valid
```

**Pros:**
- Captures exact token website uses
- Most accurate
- Works even if site key changes

**Cons:**
- Slower (5-10 seconds)
- Requires form interaction
- More complex

## Step 4: Configuration

Add to `.env`:
```env
# Discovered from inspection script
FAYDA_RECAPTCHA_SITE_KEY=6LfBMhMqAAAAABPQE-JqLLLLLLLLLLLLLLLLLLLL
```

## Step 5: Testing

### Test Token Generation:
```bash
# Test the captcha generation
npx ts-node -e "
import { generateFaydaCaptchaToken } from './src/services/captcha/faydaCaptcha';
generateFaydaCaptchaToken().then(token => {
  console.log('Token:', token.substring(0, 100) + '...');
  console.log('Length:', token.length);
});
"
```

### Test Full Flow:
```bash
# Start bot
npm start

# In Telegram:
/id
# Enter FAN: 4287130746806479
# Bot generates captcha automatically
# Enter OTP when received
# Receive PDF
```

## Step 6: Troubleshooting

### "reCAPTCHA not loaded"
**Cause:** Page didn't load completely
**Solution:** Increase wait timeout
```typescript
await page.waitForTimeout(5000); // Increase from 2000
```

### "Site key not found"
**Cause:** Website structure changed
**Solution:** Re-run inspection script
```bash
npx ts-node inspect-fayda-website.ts
```

### "Token generation failed"
**Cause:** reCAPTCHA detected automation
**Solution:** Add more realistic browser behavior
```typescript
// Add random mouse movements
await page.mouse.move(100, 100);
await page.mouse.move(200, 200);

// Add random delays
await page.waitForTimeout(Math.random() * 2000 + 1000);
```

### "Invalid captcha token" from API
**Cause:** Token expired or invalid
**Solution:** Use Method 2 (network interception)
```typescript
const token = await interceptFaydaCaptchaToken(finNumber);
```

## Step 7: Advanced Techniques

### Browser Fingerprinting Evasion
```typescript
await page.evaluateOnNewDocument(() => {
  // Remove webdriver flag
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
  
  // Add realistic plugins
  Object.defineProperty(navigator, 'plugins', {
    get: () => [1, 2, 3, 4, 5]
  });
  
  // Add realistic languages
  Object.defineProperty(navigator, 'languages', {
    get: () => ['en-US', 'en']
  });
});
```

### Token Caching
```typescript
const tokenCache = new Map<string, { token: string; timestamp: number }>();

function getCachedToken(finNumber: string): string | null {
  const cached = tokenCache.get(finNumber);
  if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute
    return cached.token;
  }
  return null;
}
```

### Parallel Token Generation
```typescript
// Generate tokens for multiple users simultaneously
const tokens = await Promise.all([
  generateFaydaCaptchaToken(),
  generateFaydaCaptchaToken(),
  generateFaydaCaptchaToken()
]);
```

## Step 8: Monitoring

Add logging to track success rates:

```typescript
let stats = {
  generated: 0,
  failed: 0,
  avgTime: 0
};

async function generateWithStats() {
  const start = Date.now();
  try {
    const token = await generateFaydaCaptchaToken();
    stats.generated++;
    stats.avgTime = (stats.avgTime * (stats.generated - 1) + (Date.now() - start)) / stats.generated;
    return token;
  } catch (error) {
    stats.failed++;
    throw error;
  }
}

// Log stats every hour
setInterval(() => {
  logger.info('Captcha stats:', stats);
}, 3600000);
```

## Step 9: Production Deployment

### Requirements:
- ✅ Puppeteer installed
- ✅ Chrome/Chromium available
- ✅ Sufficient memory (100MB per browser instance)
- ✅ Fast internet connection
- ✅ Rate limiting configured

### Optimization:
```typescript
// Use browser pooling
const browserPool = new BrowserPool({
  min: 2,
  max: 10,
  idleTimeout: 30000
});

// Reuse browser instances
const browser = await browserPool.acquire();
try {
  // Generate token
} finally {
  await browserPool.release(browser);
}
```

## Legal & Ethical Considerations

⚠️ **Important:**
- This reverse engineers the official Fayda website
- May violate Terms of Service
- Could be detected and blocked
- Use responsibly and ethically
- Consider getting official API access

## Alternative Solutions

If automation is blocked:

1. **Official API**: Contact Fayda for API access
2. **Manual Verification**: Use the web-based reCAPTCHA flow
3. **Captcha Solving Services**: Use 2Captcha, Anti-Captcha, etc.
4. **Hybrid Approach**: Automate when possible, fallback to manual

## Conclusion

This reverse engineering approach provides a seamless user experience but requires careful implementation and monitoring. Always respect the service's terms and consider official alternatives when available.
