# Name Extraction Strategy - Detailed Explanation

## Overview

We extract names from the **raw PDF text** (not from images/OCR). The PDF contains structured text that we parse using pattern matching and positional logic.

## PDF Text Structure

When you extract text from an eFayda PDF, it looks like this:

```
የኢትዮጵያ ብሔራዊ መታወቂያ ፕሮግራም  |  ወሎሰፈር ቦሌ...
Ethiopian Digital ID Card
የኢትዮጵያ ዲጂታል መታወቂያ ካርድ
የትውልድ ቀን / Date of Birth
ፆታ / SEX
ዜግነት / Nationality
ስልክ / Phone Number
ክልል / Region
...
[lots of form labels and instructions]
...
18/04/1991
1998/12/27
ሴት
Female
ኢትዮጵያዊ
Ethiopian
0985479970
ትግራይ
Tigray
መቐለ
Mekelle
ዓዲ ሓቂ ክ/ከተማ
Adi-Haki Sub City
5792 0342 9763 7405    ← FCN (16 digits)
እሴት ፀጋይ ገብረመስቀል      ← Amharic name (ACTUAL DATA)
Eset Tsegay Gebremeskel  ← English name (ACTUAL DATA)
```

## The Challenge

The PDF contains:
1. **Form labels** in Amharic (like "ሙሉ ስም" = "Full Name", "ክልል" = "Region")
2. **Instructions** in Amharic (like "እዚህ ይቁረጡ" = "Cut here")
3. **Actual data** in Amharic (like "እሴት ፀጋይ ገብረመስቀል" = the person's name)

**Problem:** How do we distinguish between form labels and actual data?

## Our Extraction Strategy

### Step 1: Find the FCN (Anchor Point)
```typescript
const fcnPattern = /(\d{4}\s+\d{4}\s+\d{4}\s+\d{4})/;
const fcnMatch = text.match(fcnPattern);
```

The FCN (16-digit number) is a reliable anchor because:
- It's unique in the document
- It always appears in the same position
- The name appears immediately after it

### Step 2: Extract Amharic Name (After FCN)
```typescript
// Look in a 100-char window after FCN
const afterFcn = text.substring(fcnIndex + fcnLength, fcnIndex + fcnLength + 100);

// Match 2-4 Amharic words
const amharicPattern = /([\u1200-\u137F]+(?:\s+[\u1200-\u137F]+){1,3})/;
const amharicMatch = afterFcn.match(amharicPattern);
```

This finds the FIRST sequence of 2-4 Amharic words after the FCN.

### Step 3: Filter Out Form Labels (Exclusions)
```typescript
const excludeWords = [
  'ኢትዮጵያ',    // Ethiopia
  'ብሔራዊ',      // National
  'መታወቂያ',     // ID
  'ፕሮግራም',    // Program
  'ክልል',       // Region
  'ስም',        // Name
  'ወንድ',       // Male
  'አገልግሎት',   // Service
  'ብቻ',        // Only
  // ... etc
];

// Check if any word in the candidate matches exclusion list
const words = candidateName.split(/\s+/);
const isExcluded = words.some(word => excludeWords.includes(word));
```

### Step 4: Extract English Name
```typescript
// Match 3 capitalized words
const englishPattern = /([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)/g;
const matches = [...text.matchAll(englishPattern)];

// Iterate from END to find actual name (not headers like "Date Of Birth")
for (let i = matches.length - 1; i >= 0; i--) {
  const candidate = matches[i][0];
  if (!isFormLabel(candidate)) {
    return candidate; // Found it!
  }
}
```

We search from the end because:
- Form labels appear at the top
- Actual data appears at the bottom
- This avoids matching "Date Of Birth" or "Sub City Zone"

## Why We Need Exclusions

### Example Without Exclusions

If we didn't filter, we might extract:

```
❌ "የኢትዮጵያ ብሔራዊ መታወቂያ" (Ethiopian National ID) - form header
❌ "ክፍለ ከተማ ዞን" (Sub City Zone) - form label
❌ "አገልግሎት ብቻ" (Service Only) - disclaimer text
✅ "እሴት ፀጋይ ገብረመስቀል" (Eset Tsegay Gebremeskel) - actual name
```

### What Gets Excluded

**Form Labels:**
- `ስም` (Name)
- `ክልል` (Region)
- `ወረዳ` (Woreda)
- `ስልክ` (Phone)

**Instructions:**
- `እዚህ ይቁረጡ` (Cut here)
- `አገልግሎት ብቻ` (Service only)

**Headers:**
- `የኢትዮጵያ ብሔራዊ` (Ethiopian National)
- `ዲጂታል መታወቂያ` (Digital ID)

**Gender/Demographics:**
- `ወንድ` (Male) - as a standalone word
- Note: We DON'T exclude `ሴት` (Female) anymore because it can be part of names like "እሴት"

## Why Whole-Word Matching

### The Problem with Substring Matching

```typescript
// BAD: Substring matching
candidateName.includes('ሴት')  // Excludes "እሴት ፀጋይ" because it contains "ሴት"
```

The name "እሴት" (Eset) contains "ሴት" (female) as a substring, but it's NOT the word "female" - it's part of the name!

### The Solution: Whole-Word Matching

```typescript
// GOOD: Whole-word matching
const words = candidateName.split(/\s+/);
words.some(word => excludeWords.includes(word));
```

This only excludes if "ሴት" appears as a complete word, not as part of another word.

## Fallback Strategies

We have 3 levels of extraction:

### Level 1: FCN-Based (Primary)
```
FCN → Look after FCN → Find Amharic text → Filter exclusions
```
**Pros:** Most accurate, uses document structure
**Cons:** Requires FCN to be present

### Level 2: English-Name-Based (Fallback)
```
Find English name → Look 150 chars before → Find closest Amharic text → Filter exclusions
```
**Pros:** Works if FCN extraction fails
**Cons:** Less reliable positioning

### Level 3: Broad Search (Last Resort)
```
Search entire document → Find any Amharic 2-4 word sequence → Filter exclusions
```
**Pros:** Catches edge cases
**Cons:** Might pick up wrong text

## English Name Extraction

Similar strategy but simpler:

```typescript
// Pattern: 3 capitalized words
"Eset Tsegay Gebremeskel" ✅
"Date Of Birth" ❌ (excluded)
"Sub City Zone" ❌ (excluded)

// Exclusions for English
const excludeEnglish = [
  'Ethiopian', 'Digital', 'National', 'Date', 'Birth',
  'Phone', 'Number', 'Region', 'Woreda', 'City',
  'Male', 'Female', 'Sex', 'Nationality'
];
```

## Summary

**How we extract:**
1. Use FCN as anchor point
2. Look for text patterns (Amharic/English)
3. Filter out form labels using exclusion lists
4. Use positional logic (after FCN, from end of document)

**Why we use exclusions:**
- PDFs contain both form labels AND actual data
- Both use the same language (Amharic/English)
- Both match the same patterns (2-4 words)
- Exclusions help us distinguish labels from data

**Key insight:**
We're not doing OCR - we're parsing structured text. The challenge is separating metadata (form labels) from actual data (person's information).
