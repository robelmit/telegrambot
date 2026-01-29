# National ID Pricing & Free Access Implementation

## Overview
Implemented a pricing system for National ID downloads and an admin feature to grant free access to selected users.

## Features Implemented

### 1. National ID Download Pricing
- **Price**: 10 birr per download (configurable via `NATIONAL_ID_PRICE` env variable)
- **Process**: 
  1. User initiates `/id` command
  2. Bot checks user balance
  3. If insufficient, shows error and prompts to top up
  4. If sufficient, proceeds with FCN/FAN verification
  5. After successful OTP validation and PDF download, charges 10 birr
  6. User receives PDF with charge confirmation

### 2. Free Fayda Access (Admin Feature)
- **Admin Command**: `/admin` → "🆓 Free Fayda" button
- **Purpose**: Grant free National ID downloads to selected users
- **Important**: Users with free access still pay for ID card generation (rendering service)
- **Process**:
  1. Admin clicks "🆓 Free Fayda" in admin panel
  2. Admin enters target user's Telegram ID
  3. User's `faydaFree` flag is set to `true`
  4. User is notified of free access
  5. User can download National ID PDFs without charge
  6. User still pays 30 birr for ID card generation from PDFs

### 3. Separation of Services
- **National ID Download** (10 birr or free): Download PDF from Fayda API
- **ID Card Generation** (30 birr, always charged): Generate physical ID card from PDF

## Technical Implementation

### Database Changes
**User Model** (`src/models/User.ts`):
```typescript
faydaFree: {
  type: Boolean,
  default: false
}
```

### Environment Variables
Added to `.env` and `server/.env`:
```
NATIONAL_ID_PRICE=10
```

### Modified Files

1. **src/models/User.ts**
   - Added `faydaFree` boolean field

2. **src/bot/handlers/idHandler.ts**
   - Added balance check in `handleIdRequest()`
   - Added charging logic in `handleOtp()`
   - Shows price info to users
   - Skips charging for users with `faydaFree: true`

3. **src/bot/handlers/adminHandler.ts**
   - Added "🆓 Free Fayda" button to admin panel
   - Added `handleAdminFreeFayda()` function
   - Added `free_fayda` case in `handleAdminTextInput()`

4. **src/bot/handlers/types.ts**
   - Added `'free_fayda'` to `adminAction` type

5. **src/bot/handlers/index.ts**
   - Exported `handleAdminFreeFayda`

6. **src/bot/index.ts**
   - Registered `admin_free_fayda` callback handler
   - Imported `handleAdminFreeFayda`

## User Experience

### Regular User (No Free Access)
```
User: /id
Bot: 💰 National ID download costs 10 birr.
     Your balance: 50 birr
     
     🆔 Please enter your FCN/FAN number:

User: [enters FCN]
Bot: ⏳ Verifying...
     📱 Please enter your OTP code:

User: [enters OTP]
Bot: ⏳ Validating OTP...
     ✅ Your National ID PDF!
     
     👤 Name: Abel Tesfaye
     🆔 UIN: 3852764790269825
     💰 Charged: 10 birr
     
     📄 You can now send this PDF to generate your ID card!
```

### User with Free Access
```
User: /id
Bot: ✅ You have free National ID download access!
     🆔 Please enter your FCN/FAN number:

User: [enters FCN and OTP]
Bot: ✅ Your National ID PDF!
     
     👤 Name: Abel Tesfaye
     🆔 UIN: 3852764790269825
     ✨ Free
     
     📄 You can now send this PDF to generate your ID card!
```

### Admin Granting Free Access
```
Admin: /admin → 🆓 Free Fayda
Bot: 🆓 Free Fayda Access
     
     Send the Telegram ID of the user to grant free National ID downloads:
     
     💡 They will still pay for ID card generation (rendering service).

Admin: 123456789
Bot: 🆓 User 123456789 now has free Fayda access.
     
     💡 They still pay for ID card generation.

[User 123456789 receives notification]
User: 🆓 You have been granted free National ID download access!
      
      ✨ You can now download National ID PDFs without charge.
      💡 ID card generation (rendering) still requires payment.
```

## Pricing Summary

| Service | Regular User | Free Fayda User |
|---------|-------------|-----------------|
| National ID Download | 10 birr | Free |
| ID Card Generation | 30 birr | 30 birr |
| **Total for Full Service** | **40 birr** | **30 birr** |

## Admin Commands

- `/admin` - Open admin panel
- Click "🆓 Free Fayda" - Grant free National ID downloads
- Enter Telegram ID - Target user receives free access

## Notes

- Free Fayda access only applies to National ID downloads
- All users must pay for ID card generation (rendering service)
- Balance is checked before starting the National ID download process
- Charging happens after successful PDF download
- If payment fails, user doesn't receive the PDF
- Admin can grant free access to any user by Telegram ID
