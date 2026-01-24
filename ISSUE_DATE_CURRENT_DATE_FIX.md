# Issue Date Fix: Current Date Implementation

## Summary
Updated the issue date fallback logic to use the current date instead of "DOB + 18 years" for both Gregorian and Ethiopian calendars.

## Changes Made

### 1. Library Installation
- Installed `ethiopian-calendar-new` package for accurate calendar conversion
- Added to both root and server `package.json`

### 2. Source Code Updates

#### `src/services/pdf/parser.ts`
- Added import for `toEthiopian` from `ethiopian-calendar-new`
- Updated `calculateIssueDateEthiopian()` method:
  - **OLD**: Used `dobYear + 18` when DOB available
  - **NEW**: Always uses current date converted to Ethiopian calendar
  - Maintains fallback logic for error cases

#### `server/services/pdf/parser.ts`
- Added import for `toEthiopian` from `ethiopian-calendar-new`
- Updated `calculateIssueDateEthiopian()` method:
  - **OLD**: Simple `currentYear - 8` approximation
  - **NEW**: Accurate conversion using Ethiopian calendar library
  - Maintains fallback logic for error cases

### 3. Current Date Results (January 24, 2026)
- **Gregorian Issue Date**: `2026/01/24`
- **Ethiopian Issue Date**: `2018/05/16`

## Benefits

### ✅ Accuracy
- Uses proper Ethiopian calendar conversion library
- No more approximations or manual calculations

### ✅ Consistency
- All cards generated on the same day have the same issue date
- Independent of DOB accuracy or availability

### ✅ Realism
- Issue date reflects actual card generation date
- More appropriate for ID card systems

### ✅ Reliability
- Fallback logic maintained for error cases
- No breaking changes to existing functionality

## Comparison Examples

| DOB (Ethiopian) | OLD Logic (DOB + 18) | NEW Logic (Current) | Difference |
|-----------------|----------------------|---------------------|------------|
| 2000/03/15      | 2018/03/15          | 2018/05/16         | +2 months  |
| 1990/07/22      | 2008/07/22          | 2018/05/16         | +10 years  |
| 1980/12/05      | 1998/12/05          | 2018/05/16         | +20 years  |

## Implementation Status
- ✅ Source code updated and tested
- ✅ Server code updated and tested
- ✅ Build process verified
- ✅ No breaking changes
- ✅ Backward compatibility maintained

## Technical Details

### Ethiopian Calendar Library
- Package: `ethiopian-calendar-new@1.0.8`
- Handles leap years automatically
- Supports the 13th month (Pagumē)
- Accurate bidirectional conversion

### Error Handling
- Library conversion wrapped in try-catch
- Fallback to manual calculation if library fails
- Logging for debugging purposes

## Testing
The changes have been verified to:
1. Compile without errors
2. Maintain existing functionality
3. Produce accurate Ethiopian calendar dates
4. Handle edge cases gracefully