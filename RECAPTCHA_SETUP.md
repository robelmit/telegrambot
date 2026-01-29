# reCAPTCHA Setup for National ID Feature

## Overview
The National ID PDF generation feature requires reCAPTCHA verification to obtain a valid captcha token for the Fayda API.

## How It Works

1. User sends `/id` command and enters their FCN/FAN number
2. Bot generates a unique verification session and sends a link
3. User clicks the link and completes reCAPTCHA in their browser
4. After successful verification, user returns to Telegram and enters OTP
5. Bot uses the reCAPTCHA token to call Fayda API and download the PDF

## Setup Instructions

### 1. Get reCAPTCHA Keys

1. Go to [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Register a new site:
   - **Label**: eFayda ID Bot
   - **reCAPTCHA type**: reCAPTCHA v2 ("I'm not a robot" checkbox)
   - **Domains**: Add your server domain (e.g., `yourdomain.com`)
3. Copy the **Site Key** and **Secret Key**

### 2. Configure Environment Variables

Add these to your `.env` file:

```env
# reCAPTCHA Configuration
RECAPTCHA_SITE_KEY=your-site-key-here
RECAPTCHA_SECRET_KEY=your-secret-key-here
BOT_WEBHOOK_URL=https://yourdomain.com
```

**Important**: 
- `BOT_WEBHOOK_URL` should be your public server URL (without port if using standard ports)
- For local testing, you can use `ngrok` to create a public URL

### 3. Using ngrok for Local Testing

If testing locally:

```bash
# Install ngrok
npm install -g ngrok

# Start ngrok tunnel
ngrok http 3000

# Copy the https URL (e.g., https://abc123.ngrok.io)
# Add it to .env as BOT_WEBHOOK_URL
```

### 4. Update reCAPTCHA Domain

Go back to reCAPTCHA admin and add your ngrok domain (e.g., `abc123.ngrok.io`) to the allowed domains list.

## User Flow

1. User: `/id`
2. Bot: "Please enter your FCN/FAN number:"
3. User: `4287130746806479`
4. Bot: "Please verify reCAPTCHA:" [Button: 🔐 Verify reCAPTCHA]
5. User clicks button → Opens browser → Completes reCAPTCHA
6. Browser: "✅ Verification successful! Return to Telegram"
7. Bot (in Telegram): "✅ reCAPTCHA verified! Please enter your OTP code"
8. User: `883015`
9. Bot: Downloads and sends PDF

## Architecture

```
User (Telegram) → Bot → Express Server (port 3000)
                          ↓
                    reCAPTCHA Page
                          ↓
                    Google reCAPTCHA API
                          ↓
                    Verify Token
                          ↓
                    Store in Session
                          ↓
                    Notify User in Telegram
                          ↓
User enters OTP → Bot uses captcha token → Fayda API → PDF
```

## Security Notes

- Sessions expire after 10 minutes
- Each reCAPTCHA token is single-use
- Captcha tokens are stored in memory (use Redis in production)
- All API calls are logged for debugging

## Troubleshooting

### "Invalid or expired session"
- Session may have expired (10 min timeout)
- Start over with `/id`

### "Please verify reCAPTCHA first"
- User tried to enter OTP before completing reCAPTCHA
- Click the verification link first

### reCAPTCHA not loading
- Check `RECAPTCHA_SITE_KEY` is correct
- Verify domain is added to reCAPTCHA admin
- Check browser console for errors

### "Verification failed"
- Check `RECAPTCHA_SECRET_KEY` is correct
- Ensure server can reach Google's API
- Check server logs for detailed error

## Production Deployment

For production:

1. Use a proper domain with SSL (HTTPS required for reCAPTCHA)
2. Replace in-memory session storage with Redis
3. Set up proper error monitoring
4. Configure rate limiting
5. Use environment-specific reCAPTCHA keys

## Alternative: Direct API Integration

If you have access to Fayda's API documentation and they provide a way to generate captcha tokens programmatically, you can modify the `idHandler.ts` to use that method instead of reCAPTCHA.
