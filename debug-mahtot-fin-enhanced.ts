/**
 * Enhanced OCR for Mahtot FIN with image preprocessing
 */
import fs from 'fs';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';

async function debugMahtotFINEnhanced() {
  console.log('=== Enhanced Mahtot FIN Extraction ===\n');

  const pdfPath = './template/efayda_Mahtot Tsehaye Kurabachew.pdf';
  const pdfBuffer = fs.readFileSync(pdfPath);

  // Extract images
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

    // Try different preprocessing approaches
    const approaches = [
      { name: 'Original', process: async (img: Buffer) => img },
      { 
        name: 'High Contrast', 
        process: async (img: Buffer) => 
          await sharp(img)
            .normalize()
            .linear(1.5, -(128 * 0.5))
            .toBuffer()
      },
      { 
        name: 'Grayscale + Threshold', 
        process: async (img: Buffer) => 
          await sharp(img)
            .grayscale()
            .normalize()
            .threshold(128)
            .toBuffer()
      },
      { 
        name: 'Sharpen', 
        process: async (img: Buffer) => 
          await sharp(img)
            .sharpen()
            .normalize()
            .toBuffer()
      }
    ];

    for (const approach of approaches) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Trying: ${approach.name}`);
      console.log('='.repeat(60));

      try {
        const processedImage = await approach.process(backCardImage);
        
        // Save processed image
        const filename = `./test-output/mahtot-back-${approach.name.toLowerCase().replace(/\s+/g, '-')}.jpg`;
        fs.writeFileSync(filename, processedImage);
        console.log(`Saved: ${filename}`);

        // Run OCR with English only (numbers)
        const ocrResult = await Tesseract.recognize(processedImage, 'eng', {
          logger: () => {} // Suppress progress
        });

        const ocrText = ocrResult.data.text;
        console.log(`\nExtracted ${ocrText.length} characters`);

        // Look for 12-digit patterns
        const patterns = [
          { name: 'With spaces (XXXX XXXX XXXX)', regex: /\d{4}\s+\d{4}\s+\d{4}(?!\s+\d)/g },
          { name: 'No spaces (XXXXXXXXXXXX)', regex: /\d{12}(?!\d)/g },
          { name: 'With dashes (XXXX-XXXX-XXXX)', regex: /\d{4}-\d{4}-\d{4}/g },
          { name: 'Flexible', regex: /\d{4}[\s-]?\d{4}[\s-]?\d{4}/g }
        ];

        let foundAny = false;
        for (const pattern of patterns) {
          const matches = [...ocrText.matchAll(pattern.regex)];
          if (matches.length > 0) {
            console.log(`\n${pattern.name}: Found ${matches.length} matches`);
            matches.forEach((match, i) => {
              console.log(`  Match ${i + 1}: "${match[0]}"`);
              foundAny = true;
            });
          }
        }

        if (!foundAny) {
          console.log('\n❌ No 12-digit patterns found');
          
          // Show all number sequences
          const allNumbers = ocrText.match(/\d+/g) || [];
          if (allNumbers.length > 0) {
            console.log('\nAll number sequences found:');
            allNumbers.forEach((num, i) => {
              console.log(`  ${i + 1}. "${num}" (${num.length} digits)`);
            });
          }
        }

      } catch (error) {
        console.error(`Error with ${approach.name}:`, error);
      }
    }

  } else {
    console.log('Not enough images found in PDF');
  }

  console.log('\n' + '='.repeat(60));
  console.log('Analysis complete');
  console.log('='.repeat(60));
}

debugMahtotFINEnhanced().catch(console.error);
