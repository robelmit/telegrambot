# National ID PDF Generation Feature Implementation

## Overview
Implemented a new feature that allows users to generate and download their National ID PDF directly from the bot by entering their FCN/FAN number and OTP code.

## Changes Made

### 1. New Handler: `src/bot/handlers/idHandler.ts`
Created a new handler that manages the National ID PDF generation workflow:
- **handleIdRequest**: Initiates the process and prompts user for FCN/FAN number
- **handleFinNumber**: Validates the FIN number with Fayda API and requests OTP
- **handleOtp**: Validates OTP and downloads the PDF from Fayda API

#### API Flow:
1. POST to `https://api-resident.fayda.et/verifycaptcha`
   - Sends: captchaValue, idNumber (FIN), verificationMethod: "FCN"
   - Receives: token

2. POST to `https://api-resident.fayda.et/validateOtp`
   - Sends: otp, uniqueId (FIN), verificationMethod: "FCN"
   - Receives: signature, uin, fullName, and other user data

3. POST to `https://api-resident.fayda.et/printableCredentialRoute`
   - Sends: signature, uin
   - Receives: base64 encoded PDF

### 2. Updated Session Types: `src/bot/handlers/types.ts`
Added new session fields:
- `awaitingFinNumber?: boolean` - Tracks if bot is waiting for FIN number input
- `awaitingOtp?: boolean` - Tracks if bot is waiting for OTP input
- `faydaToken?: string` - Stores the verification token
- `finNumber?: string` - Stores the FIN number for OTP validation

### 3. Updated Bot Index: `src/bot/index.ts`
- Added `/id` command handler
- Added text message handlers for FIN number and OTP input
- Added `show_help` callback action for inline help button
- Updated bot commands list to include `/id` command
- Added ID button to keyboard button mapping

### 4. Updated Start Handler: `src/bot/handlers/startHandler.ts`
- Replaced "Help" button with "ID" (National ID) button in the main keyboard
- Help is now accessible via the balance screen and `/help` command

### 5. Updated Balance Handler: `src/bot/handlers/balanceHandler.ts`
- Added inline "Help" button at the bottom of balance message
- Users can access help information from the balance screen

### 6. Updated Handlers Index: `src/bot/handlers/index.ts`
- Exported new ID handler functions

### 7. Updated Locales
Added translations for the ID button in all three languages:

**English (`src/locales/en.json`):**
- `"btn_id": "🆔 National ID"`

**Amharic (`src/locales/am.json`):**
- `"btn_id": "🆔 ብሔራዊ መታወቂያ"`

**Tigrinya (`src/locales/ti.json`):**
- `"btn_id": "🆔 ሃገራዊ መንነት"`

## User Flow

1. User clicks "🆔 National ID" button or sends `/id` command
2. Bot prompts for FCN/FAN number
3. User enters their FCN/FAN number
4. Bot verifies with Fayda API and prompts for OTP
5. User enters OTP received on their phone
6. Bot validates OTP and downloads PDF
7. Bot sends the PDF document to the user with their name and UIN

## Features

- ✅ Multi-language support (English, Amharic, Tigrinya)
- ✅ Session state management for multi-step process
- ✅ Error handling with user-friendly messages
- ✅ Automatic session cleanup after completion or error
- ✅ Logging for debugging and monitoring
- ✅ Base64 PDF decoding and document delivery

## Dependencies

- **axios**: Already installed in the project for HTTP requests
- No additional dependencies required

## Testing

To test the feature:
1. Start the bot
2. Click the "🆔 National ID" button or send `/id`
3. Enter a valid FCN/FAN number
4. Enter the OTP received via SMS
5. Verify that the PDF is downloaded and sent correctly

## Notes

- The captcha value is hardcoded as provided in the requirements
- The feature uses the official Fayda API endpoints
- Session data is automatically cleaned up after successful completion or errors
- All API errors are caught and displayed to users in their preferred language
