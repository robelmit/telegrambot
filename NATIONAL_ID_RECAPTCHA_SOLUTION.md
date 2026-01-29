# National ID Feature - reCAPTCHA Solution

## Problem
The Fayda API endpoint `/verifycaptcha` was returning 404 errors because it requires a valid reCAPTCHA token, not a hardcoded captcha value.

## Solution
Implemented a web-based reCAPTCHA verification flow that integrates with the Telegram bot.

## Implementation

### 1. Architecture
```
User → Telegram Bot → Express Server (port 3000)
                           ↓
                    reCAPTCHA Web Page
                           ↓
                    Google reCAPTCHA API
                           ↓
                    Store Token in Session
                           ↓
                    Notify User in Telegram
                           ↓
User enters OTP → Bot uses reCAPTCHA token → Fayda API → PDF
```

### 2. New Components

**`src/bot/handlers/idHandler.ts`** (Updated)
- Generates unique session IDs for each verification
- Creates verification URLs with session tokens
- Stores sessions in memory (Map)
- Waits for reCAPTCHA completion before accepting OTP

**`src/services/captcha/captchaServer.ts`** (New)
- Express server for reCAPTCHA verification
- Serves HTML page with Google reCAPTCHA widget
- Verifies reCAPTCHA tokens with Google API
- Stores valid tokens in session
- Notifies users in Telegram when verification succeeds

**`src/index.ts`** (Updated)
- Initializes Express server on port 3000
- Sets up reCAPTCHA routes
- Runs alongside Telegram bot

### 3. User Flow

1. User sends `/id` command
2. Bot asks for FCN/FAN number
3. User enters: `4287130746806479`
4. Bot sends verification link with inline button
5. User clicks "🔐 Verify reCAPTCHA" button
6. Browser opens with reCAPTCHA challenge
7. User completes reCAPTCHA
8. Page shows: "✅ Verification successful!"
9. Bot sends Telegram message: "✅ reCAPTCHA verified! Enter your OTP"
10. User enters OTP code
11. Bot uses reCAPTCHA token to call Fayda API
12. Bot downloads and sends PDF

### 4. Configuration Required

Add to `.env`:
```env
RECAPTCHA_SITE_KEY=your-site-key-from-google
RECAPTCHA_SECRET_KEY=your-secret-key-from-google
BOT_WEBHOOK_URL=https://yourdomain.com
```

### 5. Setup Steps

1. **Get reCAPTCHA Keys**:
   - Visit https://www.google.com/recaptcha/admin
   - Register new site (reCAPTCHA v2)
   - Copy Site Key and Secret Key

2. **Configure Domain**:
   - Add your server domain to reCAPTCHA admin
   - For local testing, use ngrok: `ngrok http 3000`

3. **Update .env**:
   - Add reCAPTCHA keys
   - Set BOT_WEBHOOK_URL to your public URL

4. **Restart Bot**:
   - Bot will start Express server on port 3000
   - reCAPTCHA verification will be available

### 6. Security Features

- ✅ Sessions expire after 10 minutes
- ✅ Each reCAPTCHA token is single-use
- ✅ Tokens verified with Google before use
- ✅ Session IDs are cryptographically random
- ✅ All API calls are logged

### 7. Files Changed

- `src/bot/handlers/idHandler.ts` - Implemented reCAPTCHA flow
- `src/bot/handlers/types.ts` - Added session fields
- `src/services/captcha/captchaServer.ts` - New reCAPTCHA server
- `src/index.ts` - Integrated Express server
- `.env` - Added reCAPTCHA configuration
- `RECAPTCHA_SETUP.md` - Detailed setup guide

### 8. Testing

**Local Testing with ngrok**:
```bash
# Terminal 1: Start ngrok
ngrok http 3000

# Copy the https URL (e.g., https://abc123.ngrok.io)
# Add to .env as BOT_WEBHOOK_URL

# Terminal 2: Start bot
npm start

# Test in Telegram
/id
# Enter FAN number
# Click reCAPTCHA link
# Complete verification
# Enter OTP
```

### 9. Production Deployment

For production:
1. Use proper domain with SSL (HTTPS required)
2. Replace in-memory sessions with Redis
3. Set up monitoring and logging
4. Configure rate limiting
5. Use production reCAPTCHA keys

### 10. Troubleshooting

**404 on /verifycaptcha**:
- This is expected - the endpoint requires valid reCAPTCHA token
- Make sure user completes reCAPTCHA first

**"Invalid or expired session"**:
- Session timeout (10 min)
- Start over with `/id`

**reCAPTCHA not loading**:
- Check RECAPTCHA_SITE_KEY
- Verify domain in reCAPTCHA admin
- Check browser console

**"Please verify reCAPTCHA first"**:
- User tried OTP before reCAPTCHA
- Click verification link first

## Next Steps

1. Get reCAPTCHA keys from Google
2. Configure `.env` with keys and webhook URL
3. Test the flow end-to-end
4. Deploy to production with proper domain

## Alternative Solutions

If reCAPTCHA is not suitable:
1. Contact Fayda API team for alternative authentication
2. Use their official SDK if available
3. Implement custom captcha solution
