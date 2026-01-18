/**
 * Test multiple OCR preprocessing techniques for Mahtot FIN extraction
 */
import fs from 'fs';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';

async function testMahtotOCREnhanced() {
  console.log('=== Testing Enhanced OCR for Mahtot FIN ===\n');

  const pdfPath = './template/efayda_Mahtot Tsehaye Kurabachew.pdf';
  const pdfBuffer = fs.readFileSync(pdfPath);

  // Extract back card image
  const jpegStart = Buffer.from([0xFF, 0xD8, 0xFF]);
  const jpegEnd = Buffer.from([0xFF, 0xD9]);

  const images: Buffer[] = [];
  let startIndex = 0;

  while (startIndex < pdfBuffer.length) {
    const start = pdfBuffer.indexOf(jpegStart, startIndex);
    if (start === -1) break;

    const end = pdfBuffer.indexOf(jpegEnd, start + 3);
    if (end === -1) break;

    const imageBuffer = pdfBuffer.slice(start, end + 2);
    if (imageBuffer.length > 500) {
      images.push(imageBuffer);
    }
    startIndex = end + 2;
  }

  if (images.length >= 4) {
    const backCardImage = images[3];
    console.log(`Back card image size: ${backCardImage.length} bytes\n`);

    // Get image dimensions
    const metadata = await sharp(backCardImage).metadata();
    console.log(`Original dimensions: ${metadata.width}x${metadata.height}\n`);

    // Crop to FIN area (top portion of back card where phone/FIN are)
    const cropHeight = Math.floor(metadata.height! * 0.3); // Top 30%
    const croppedImage = await sharp(backCardImage)
      .extract({
        left: 0,
        top: 0,
        width: metadata.width!,
        height: cropHeight
      })
      .toBuffer();

    console.log(`Cropped to FIN area: ${metadata.width}x${cropHeight}\n`);
    fs.writeFileSync('./test-output/mahtot-fin-area-cropped.jpg', croppedImage);

    // Test different preprocessing approaches
    const approaches = [
      {
        name: '1. Original Cropped',
        process: async (img: Buffer) => img
      },
      {
        name: '2. Grayscale + Normalize',
        process: async (img: Buffer) =>
          await sharp(img)
            .grayscale()
            .normalize()
            .toBuffer()
      },
      {
        name: '3. High Contrast + Sharpen',
        process: async (img: Buffer) =>
          await sharp(img)
            .grayscale()
            .normalize()
            .linear(1.8, -(128 * 0.8))
            .sharpen({ sigma: 2 })
            .toBuffer()
      },
      {
        name: '4. Threshold (Binary)',
        process: async (img: Buffer) =>
          await sharp(img)
            .grayscale()
            .normalize()
            .threshold(140)
            .toBuffer()
      },
      {
        name: '5. Upscale 2x + Sharpen',
        process: async (img: Buffer) => {
          const meta = await sharp(img).metadata();
          return await sharp(img)
            .resize(meta.width! * 2, meta.height! * 2, { kernel: 'lanczos3' })
            .grayscale()
            .normalize()
            .sharpen({ sigma: 1.5 })
            .toBuffer();
        }
      },
      {
        name: '6. Adaptive Threshold',
        process: async (img: Buffer) =>
          await sharp(img)
            .grayscale()
            .normalize()
            .linear(2.0, -128)
            .toBuffer()
      },
      {
        name: '7. Median Filter + Threshold',
        process: async (img: Buffer) =>
          await sharp(img)
            .grayscale()
            .median(3)
            .normalize()
            .threshold(130)
            .toBuffer()
      }
    ];

    const expectedFIN = '9258 7316 0852';
    let bestMatch = { name: '', fin: '', score: 0 };

    for (const approach of approaches) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`Testing: ${approach.name}`);
      console.log('='.repeat(70));

      try {
        const processedImage = await approach.process(croppedImage);
        
        // Save processed image
        const filename = `./test-output/mahtot-fin-${approach.name.substring(0, 1)}.jpg`;
        fs.writeFileSync(filename, processedImage);

        // Run OCR with English only (better for numbers)
        const ocrResult = await Tesseract.recognize(processedImage, 'eng', {
          logger: () => {} // Suppress progress
        });

        const ocrText = ocrResult.data.text;
        console.log(`OCR extracted ${ocrText.length} characters`);

        // Look for FIN patterns
        const patterns = [
          /\d{4}\s+\d{4}\s+\d{4}(?!\s+\d)/g,  // XXXX XXXX XXXX
          /\d{12}(?!\d)/g,                     // XXXXXXXXXXXX
          /\d{4}[\s-]\d{4}[\s-]\d{4}/g        // XXXX-XXXX-XXXX or mixed
        ];

        let foundFIN = '';
        for (const pattern of patterns) {
          const matches = [...ocrText.matchAll(pattern)];
          if (matches.length > 0) {
            foundFIN = matches[0][0];
            // Normalize spacing
            const digits = foundFIN.replace(/\D/g, '');
            if (digits.length === 12) {
              foundFIN = `${digits.substring(0, 4)} ${digits.substring(4, 8)} ${digits.substring(8, 12)}`;
            }
            break;
          }
        }

        if (foundFIN) {
          console.log(`✅ Found FIN: ${foundFIN}`);
          console.log(`Expected:    ${expectedFIN}`);
          const match = foundFIN === expectedFIN;
          console.log(`Match: ${match ? '✓ CORRECT!' : '✗ Incorrect'}`);
          
          if (match) {
            bestMatch = { name: approach.name, fin: foundFIN, score: 100 };
          }
        } else {
          // Try to find partial matches
          const digitGroups = ocrText.match(/\d{4}/g) || [];
          console.log(`Found ${digitGroups.length} 4-digit groups: ${digitGroups.join(', ')}`);
          
          if (digitGroups.length >= 2) {
            const partialFIN = digitGroups.slice(0, 3).join(' ');
            console.log(`Partial FIN: ${partialFIN}`);
            
            // Check if first 8 digits match
            if (partialFIN.startsWith('9258 7316')) {
              console.log(`✓ First 8 digits match! Missing: 0852`);
              if (bestMatch.score < 80) {
                bestMatch = { name: approach.name, fin: partialFIN, score: 80 };
              }
            }
          } else {
            console.log(`❌ No FIN pattern found`);
          }
        }

        // Show first few lines of OCR
        const lines = ocrText.split('\n').filter(l => l.trim().length > 0);
        if (lines.length > 0) {
          console.log(`\nFirst 5 lines of OCR:`);
          lines.slice(0, 5).forEach((line, i) => {
            console.log(`  ${i + 1}. "${line}"`);
          });
        }

      } catch (error) {
        console.error(`Error: ${error}`);
      }
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log('SUMMARY');
    console.log('='.repeat(70));
    console.log(`Expected FIN: ${expectedFIN}`);
    if (bestMatch.score === 100) {
      console.log(`\n✅ SUCCESS! Best approach: ${bestMatch.name}`);
      console.log(`   Extracted FIN: ${bestMatch.fin}`);
    } else if (bestMatch.score > 0) {
      console.log(`\n⚠️  PARTIAL SUCCESS: ${bestMatch.name}`);
      console.log(`   Extracted: ${bestMatch.fin}`);
      console.log(`   Score: ${bestMatch.score}%`);
    } else {
      console.log(`\n❌ FAILED: Could not extract FIN with any approach`);
    }

  } else {
    console.log('Not enough images found in PDF');
  }
}

testMahtotOCREnhanced().catch(console.error);
