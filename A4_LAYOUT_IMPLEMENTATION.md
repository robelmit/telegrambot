# A4 Paper Layout Implementation

## Summary
Updated the ID card image generation to place cards on A4 paper layout instead of just side-by-side images, making them easier to edit and print.

## Changes Made

### File Modified
- `src/services/generator/cardVariantGenerator.ts`

### Key Changes

#### Before
- Cards were placed side-by-side with minimal padding
- Canvas size was just large enough to fit both cards
- Not standard paper size

#### After
- Cards are placed on standard A4 paper (210mm × 297mm)
- A4 dimensions at 300 DPI: **2480 × 3508 pixels**
- Cards are centered horizontally
- Cards positioned at 15% from top for better layout
- Plenty of white space around cards for editing

## Technical Details

### A4 Paper Specifications
- **Width**: 2480 pixels (210mm at 300 DPI)
- **Height**: 3508 pixels (297mm at 300 DPI)
- **Resolution**: 300 DPI (print quality)
- **Format**: PNG with sRGB color space

### Card Positioning
- Cards placed side-by-side (back | front)
- 80px gap between cards
- Centered horizontally on A4 canvas
- Positioned at 15% from top (approx. 526px)
- Each card includes 35px bleed on all edges

### File Sizes
- Normal layout: ~761KB
- Mirrored layout: ~763KB
- High-quality PNG with compression level 9

## Benefits

### ✅ Print-Ready Format
- Standard A4 paper size recognized by all printers
- 300 DPI ensures high-quality printing
- Professional layout suitable for printing services

### ✅ Easy Editing
- Plenty of white space around cards
- Users can add notes, crop marks, or instructions
- Easy to edit in photo editing software

### ✅ Convenient Cutting
- Cards clearly positioned with space between them
- Easy to see cutting lines
- Centered layout makes alignment simple

### ✅ Universal Compatibility
- Works with any standard printer
- Compatible with all photo editing software
- Standard paper size available everywhere

### ✅ Professional Appearance
- Clean, organized layout
- Looks professional for printing services
- Easy to handle and store

## Test Results

```
=== A4 Layout Results ===
Normal Image:
  Size: 2480 × 3508 pixels
  DPI: 300
  Format: png
  File size: 761KB

Mirrored Image:
  Size: 2480 × 3508 pixels
  DPI: 300
  Format: png
  File size: 763KB

=== Dimension Verification ===
Expected A4 at 300 DPI: 2480 × 3508
Normal: ✅ CORRECT
Mirrored: ✅ CORRECT
```

## Usage

The A4 layout is automatically applied to all generated images:
- Normal PNG: Cards in standard orientation
- Mirrored PNG: Cards flipped for double-sided printing
- Both PDFs: Already use A4 format

## Visual Layout

```
┌─────────────────────────────────────┐
│                                     │ ← Top margin (15% of A4)
│                                     │
│     ┌──────┐  gap  ┌──────┐       │
│     │ BACK │  80px │FRONT │       │ ← Cards centered
│     │ CARD │       │ CARD │       │
│     └──────┘       └──────┘       │
│                                     │
│                                     │
│                                     │
│                                     │ ← Plenty of white space
│                                     │
│                                     │
└─────────────────────────────────────┘
        A4 Paper (210mm × 297mm)
```

## Implementation Status
- ✅ Source code updated
- ✅ Build process verified
- ✅ Dimensions tested and confirmed
- ✅ File sizes optimized
- ✅ Print quality maintained
- ✅ Backward compatible

## Notes
- The server folder needs to be manually synchronized if deployed separately
- PDF generation already uses A4 format, so no changes needed there
- The layout maintains all existing features (bleed, mirroring, etc.)