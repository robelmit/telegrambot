# Template Default Changed to Template 3

## Summary

Changed the default template from Template 1 (template0) to **Template 3 (template2)** across the entire system.

---

## Your Question: What Happens to Existing Users on Server Restart?

### ✅ EXISTING USERS ARE SAFE

**Users who already selected Template 3 will keep it!**

Here's why:
1. **Database Persistence**: Template preferences are stored in MongoDB in the `User` model
2. **Survives Restarts**: MongoDB data persists across server restarts
3. **Priority System**: The system checks database first, then session, then default

### Priority Order (How Template is Selected):

```typescript
// 1. Database (PERSISTS across restarts) ← Existing users' choice
user.selectedTemplate

// 2. Session (Lost on restart) ← Temporary fallback
ctx.session.selectedTemplate

// 3. Default (Hardcoded) ← Only for NEW users
'template2'  // Changed from 'template0'
```

### What Happens on Server Restart:

| User Type | Before Restart | After Restart | Why |
|-----------|---------------|---------------|-----|
| **User with Template 3** | Template 3 | ✅ Template 3 | Stored in database |
| **User with Template 1** | Template 1 | ✅ Template 1 | Stored in database |
| **User with Template 2** | Template 2 | ✅ Template 2 | Stored in database |
| **New User (never selected)** | Template 1 (old default) | ✅ Template 3 (new default) | Uses new default |
| **User who never selected** | Template 1 (old default) | ✅ Template 3 (new default) | Uses new default |

### Key Points:

✅ **Existing users keep their choice** - Their preference is in the database
✅ **No data loss** - MongoDB persists across restarts
✅ **Only affects new users** - Users who never selected a template
✅ **Smooth transition** - No disruption to current users

---

## Changes Made

### Files Modified:

1. **src/bot/index.ts**
   - Session default: `'template0'` → `'template2'`

2. **src/bot/handlers/uploadHandler.ts**
   - Upload fallback: `'template0'` → `'template2'`

3. **src/bot/handlers/bulkHandler.ts**
   - Bulk upload fallback: `'template0'` → `'template2'`

4. **src/bot/handlers/templateHandler.ts**
   - Template selection fallback: `'template0'` → `'template2'`

5. **src/models/User.ts**
   - Database default: `'template0'` → `'template2'`

6. **src/models/Job.ts**
   - Job template default: `'template0'` → `'template2'`

7. **src/services/generator/cardRenderer.ts**
   - Render front default: `'template0'` → `'template2'`
   - Render back default: `'template0'` → `'template2'`
   - Get dimensions default: `'template0'` → `'template2'`

### Production Files Updated:

All changes copied to `server/` directory:
- ✅ server/bot/index.ts
- ✅ server/bot/handlers/uploadHandler.ts
- ✅ server/bot/handlers/bulkHandler.ts
- ✅ server/bot/handlers/templateHandler.ts
- ✅ server/models/User.ts
- ✅ server/models/Job.ts
- ✅ server/services/generator/cardRenderer.ts

### Compiled:
- ✅ TypeScript compiled to JavaScript
- ✅ All .js and .d.ts files updated

---

## Template Naming Reference

| Display Name | Code Name | Config File | Status |
|--------------|-----------|-------------|--------|
| Template 1 | `template0` | cardLayout.json | Old Default |
| Template 2 | `template1` | cardLayout1.json | Available |
| **Template 3** | **`template2`** | **cardLayout2.json** | **✅ New Default** |

---

## Testing

### Test New User Experience:

1. Create a new user (or clear a test user's template preference)
2. Upload a PDF without selecting a template
3. Verify it uses Template 3 (template2)

### Test Existing User Experience:

1. Use an existing user who selected Template 3
2. Restart the server
3. Upload a PDF
4. Verify it still uses Template 3 (from database)

### Verify Database Persistence:

```javascript
// Check a user's template preference in MongoDB
db.users.findOne({ telegramId: YOUR_TELEGRAM_ID })
// Should show: selectedTemplate: 'template2'
```

---

## Migration Notes

### No Migration Needed! ✅

**Why?**
- Existing users already have their preference in the database
- New default only affects users who never selected a template
- No breaking changes to existing data

### If You Want to Force All Users to Template 3:

**⚠️ NOT RECOMMENDED** - Users should keep their choice

But if needed, you can run this MongoDB command:

```javascript
// Update all users to Template 3 (use with caution!)
db.users.updateMany(
  {},
  { $set: { selectedTemplate: 'template2' } }
)
```

---

## Rollback Instructions

If you need to revert to Template 1 as default:

1. Change all `'template2'` back to `'template0'` in the files listed above
2. Copy to server directory
3. Compile TypeScript: `cd server && npx tsc`
4. Restart server

---

## Summary

✅ **Default changed from Template 1 to Template 3**
✅ **Existing users keep their preference** (stored in database)
✅ **Only new users get Template 3 by default**
✅ **No data loss on server restart**
✅ **Production ready**

---

**Date**: January 18, 2026, 7:20 PM
**Status**: ✅ COMPLETE - Template 3 is now the default
**Impact**: Only affects new users or users who never selected a template
**Existing Users**: ✅ Safe - Their preference is preserved in the database
