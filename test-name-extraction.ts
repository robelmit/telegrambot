/**
 * Test name extraction from the two fayda PDF files
 * Diagnose if it's a cropping, OCR, or file issue
 */
import fs from 'fs';
import path from 'path';
import { pdfParser } from './src/services/pdf/parser';
import pdfParse from 'pdf-parse';

async function testNameExtraction() {
  const pdfFiles = [
    'template/efayda_Eset Tsegay Gebremeskel.pdf',
    'template/efayda_Mulu Kidanu Haylu.pdf'
  ];

  for (const pdfFile of pdfFiles) {
    console.log('\n' + '='.repeat(80));
    console.log(`Testing: ${pdfFile}`);
    console.log('='.repeat(80));

    try {
      const buffer = fs.readFileSync(pdfFile);
      
      // Step 1: Extract raw PDF text
      console.log('\n--- STEP 1: Raw PDF Text Extraction ---');
      const pdfData = await pdfParse(buffer);
      const rawText = pdfData.text;
      console.log('Raw PDF Text Length:', rawText.length);
      console.log('\nFirst 1000 characters:');
      console.log(rawText.substring(0, 1000));
      console.log('\n...\n');
      console.log('Last 500 characters:');
      console.log(rawText.substring(Math.max(0, rawText.length - 500)));

      // Step 2: Look for name patterns
      console.log('\n--- STEP 2: Name Pattern Analysis ---');
      
      // English name pattern
      const englishNamePattern = /([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)/g;
      const englishMatches = [...rawText.matchAll(englishNamePattern)];
      console.log('\nEnglish name candidates (3 words):');
      englishMatches.forEach((match, idx) => {
        console.log(`  ${idx + 1}. "${match[0]}" at position ${match.index}`);
      });

      // Amharic name pattern
      const amharicPattern = /([\u1200-\u137F]+(?:\s+[\u1200-\u137F]+){1,3})/g;
      const amharicMatches = [...rawText.matchAll(amharicPattern)];
      console.log('\nAmharic text sequences (2-4 words):');
      amharicMatches.slice(0, 20).forEach((match, idx) => {
        console.log(`  ${idx + 1}. "${match[0]}" at position ${match.index}`);
      });

      // Step 3: Parse using the parser
      console.log('\n--- STEP 3: Parser Extraction ---');
      const parsedData = await pdfParser.parse(buffer);
      
      console.log('\nExtracted Names:');
      console.log('  English Name:', parsedData.fullNameEnglish || '(NOT FOUND)');
      console.log('  Amharic Name:', parsedData.fullNameAmharic || '(NOT FOUND)');
      
      console.log('\nOther Extracted Data:');
      console.log('  Sex:', parsedData.sex);
      console.log('  DOB (Gregorian):', parsedData.dateOfBirthGregorian);
      console.log('  DOB (Ethiopian):', parsedData.dateOfBirthEthiopian);
      console.log('  Phone:', parsedData.phoneNumber);
      console.log('  Region:', parsedData.region);
      console.log('  FCN:', parsedData.fcn);
      console.log('  FIN:', parsedData.fin);

      // Step 4: Analyze what went wrong
      console.log('\n--- STEP 4: Diagnosis ---');
      
      const expectedEnglishName = path.basename(pdfFile, '.pdf').replace('efayda_', '');
      console.log('Expected Name:', expectedEnglishName);
      console.log('Extracted Name:', parsedData.fullNameEnglish || '(NONE)');
      
      if (!parsedData.fullNameEnglish) {
        console.log('\n❌ ISSUE: English name not extracted');
        console.log('Possible causes:');
        console.log('  1. Name pattern not matching (check if name has 3 words)');
        console.log('  2. Name being filtered out by exclusion list');
        console.log('  3. PDF text structure different than expected');
      } else if (parsedData.fullNameEnglish !== expectedEnglishName) {
        console.log('\n⚠️  WARNING: Extracted name differs from expected');
        console.log('Difference:', {
          expected: expectedEnglishName,
          extracted: parsedData.fullNameEnglish
        });
      } else {
        console.log('\n✅ SUCCESS: Name extracted correctly');
      }

      if (!parsedData.fullNameAmharic) {
        console.log('\n❌ ISSUE: Amharic name not extracted');
        console.log('Possible causes:');
        console.log('  1. Amharic text not found near English name');
        console.log('  2. Amharic text being filtered out by exclusion list');
        console.log('  3. PDF text structure different than expected');
      }

      // Step 5: Check if images are extracted
      console.log('\n--- STEP 5: Image Extraction ---');
      console.log('Photo extracted:', parsedData.photo ? `Yes (${parsedData.photo.length} bytes)` : 'No');
      console.log('QR Code extracted:', parsedData.qrCode ? `Yes (${parsedData.qrCode.length} bytes)` : 'No');

      // Save extracted photo for visual inspection
      if (parsedData.photo) {
        const photoPath = `test-output/${path.basename(pdfFile, '.pdf')}_photo.jpg`;
        fs.mkdirSync('test-output', { recursive: true });
        fs.writeFileSync(photoPath, parsedData.photo);
        console.log(`Photo saved to: ${photoPath}`);
      }

    } catch (error) {
      console.error('Error processing PDF:', error);
    }
  }
}

// Run the test
testNameExtraction().catch(console.error);
