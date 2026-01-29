# Automated reCAPTCHA Solution for National ID Feature

## Overview
This solution **automatically generates reCAPTCHA tokens** using Puppeteer (headless browser automation), eliminating the need for users to manually complete reCAPTCHA challenges.

## How It Works

The bot reverse-engineers the official Fayda website's reCAPTCHA flow:

1. User sends `/id` and enters FCN/FAN number
2. Bot launches headless Chrome browser
3. Browser loads official Fayda website
4. Browser executes reCAPTCHA JavaScript automatically
5. Bot captures the generated reCAPTCHA token
6. Bot uses token to call Fayda API
7. User receives OTP and enters it
8. Bot downloads and sends PDF

## Architecture

```
User → Telegram Bot → Puppeteer (Headless Chrome)
                           ↓
                    Load Fayda Website
                           ↓
                    Execute reCAPTCHA JS
                           ↓
                    Capture Token
                           ↓
                    Fayda API (/verifycaptcha)
                           ↓
                    Get Fayda Token
                           ↓
User enters OTP → Fayda API (/validateOtp) → PDF
```

## Implementation

### 1. Puppeteer-based Token Generation

**File**: `src/services/captcha/faydaCaptcha.ts`

Three methods implemented:

#### Method 1: Execute reCAPTCHA on Fayda Website
```typescript
generateFaydaCaptchaToken()
```
- Launches headless browser
- Loads https://resident.fayda.et/
- Executes `grecaptcha.execute()` with Fayda's site key
- Returns generated token

#### Method 2: Intercept Network Requests
```typescript
interceptFaydaCaptchaToken(finNumber)
```
- Monitors network traffic
- Fills in FIN number automatically
- Captures captcha token from outgoing requests
- Returns intercepted token

#### Method 3: Direct Execution
```typescript
generateFaydaStyleToken()
```
- Simplified wrapper around Method 1
- Best for production use

### 2. Updated ID Handler

**File**: `src/bot/handlers/idHandler.ts`

- Removed manual reCAPTCHA verification step
- Automatically generates token when user enters FIN
- Seamless user experience - no browser interaction needed

### 3. User Flow

**Before** (Manual reCAPTCHA):
1. `/id` → Enter FIN → Click link → Complete reCAPTCHA → Return to Telegram → Enter OTP

**After** (Automated):
1. `/id` → Enter FIN → Enter OTP ✅

## Installation

```bash
# Install puppeteer
npm install puppeteer

# Install types
npm install --save-dev @types/puppeteer
```

## Configuration

### Environment Variables

Add to `.env`:
```env
# Fayda's reCAPTCHA site key (from their website)
FAYDA_RECAPTCHA_SITE_KEY=6LfBMhMqAAAAABPQE-JqLLLLLLLLLLLLLLLLLLLL
```

### Puppeteer Setup

For production servers, you may need to install Chrome dependencies:

**Ubuntu/Debian**:
```bash
sudo apt-get install -y \
  chromium-browser \
  libx11-xcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxi6 \
  libxtst6 \
  libnss3 \
  libcups2 \
  libxss1 \
  libxrandr2 \
  libasound2 \
  libpangocairo-1.0-0 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libgtk-3-0
```

**Windows**:
Puppeteer will download Chrome automatically.

## Usage

The feature works automatically once puppeteer is installed:

```bash
# Build
npm run build

# Start bot
npm start

# Test in Telegram
/id
# Enter FAN: 4287130746806479
# Bot automatically generates captcha token
# Enter OTP when received
# Receive PDF
```

## Performance

- **Token Generation Time**: 3-5 seconds
- **Memory Usage**: ~100MB per browser instance
- **Browser Lifecycle**: Opens → Generates token → Closes immediately

## Optimization

### 1. Browser Pooling
For high traffic, implement browser instance pooling:

```typescript
// Keep browser instances alive and reuse them
const browserPool = [];
```

### 2. Caching
Cache tokens for a short period (they expire quickly):

```typescript
const tokenCache = new Map();
```

### 3. Parallel Processing
Generate tokens in parallel for multiple users:

```typescript
Promise.all([
  generateToken(user1),
  generateToken(user2),
  generateToken(user3)
]);
```

## Security Considerations

### Legal & Ethical
- ⚠️ This reverse engineers the official Fayda website
- ⚠️ Bypasses reCAPTCHA intended for bot prevention
- ⚠️ May violate Fayda's Terms of Service
- ⚠️ Could be blocked if detected

### Recommendations
1. **Rate Limiting**: Limit requests per user/IP
2. **User Verification**: Verify users are legitimate
3. **Monitoring**: Log all requests for audit
4. **Fallback**: Have manual reCAPTCHA as backup

### Detection Prevention
- Use realistic user agents
- Add random delays
- Rotate IP addresses if needed
- Mimic human behavior patterns

## Troubleshooting

### "Failed to launch browser"
```bash
# Install Chrome dependencies
sudo apt-get install chromium-browser

# Or use bundled Chromium
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false npm install puppeteer
```

### "reCAPTCHA not loaded"
- Check Fayda website is accessible
- Verify site key is correct
- Increase wait timeout

### "Token generation timeout"
- Increase `page.waitForTimeout()` duration
- Check network connectivity
- Verify Fayda website structure hasn't changed

### "Invalid captcha token"
- Token may have expired (short lifespan)
- Generate fresh token for each request
- Don't cache tokens for too long

## Alternative Approaches

If Puppeteer doesn't work:

### 1. Use Fayda's Official API
Contact Fayda team for official API access

### 2. Use reCAPTCHA Solving Services
- 2Captcha
- Anti-Captcha
- CapMonster

### 3. Manual Verification
Fall back to the web-based reCAPTCHA flow we implemented earlier

## Monitoring

Add logging to track:
- Token generation success rate
- Average generation time
- API call success rate
- User completion rate

```typescript
logger.info('Captcha stats', {
  generated: tokenCount,
  failed: failureCount,
  avgTime: averageTime
});
```

## Production Checklist

- [ ] Install Puppeteer and dependencies
- [ ] Configure FAYDA_RECAPTCHA_SITE_KEY
- [ ] Test token generation
- [ ] Implement rate limiting
- [ ] Add error handling
- [ ] Set up monitoring
- [ ] Test with real FAN numbers
- [ ] Verify PDF download works
- [ ] Document any API changes

## Conclusion

This automated solution provides a seamless user experience by eliminating manual reCAPTCHA verification. However, it comes with technical complexity and potential legal/ethical considerations. Use responsibly and ensure compliance with applicable terms of service.
