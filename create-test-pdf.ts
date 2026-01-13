/**
 * Create a simple test PDF with sample Ethiopian ID data
 */

import fs from 'fs';
import PDFDocument from 'pdfkit';

function createTestPdf() {
  const doc = new PDFDocument();
  const outputPath = 'temp/sample.pdf';
  
  // Pipe to file
  doc.pipe(fs.createWriteStream(outputPath));
  
  // Add sample Ethiopian ID data
  doc.fontSize(16)
     .text('Ethiopian Digital National ID', 50, 50);
  
  doc.fontSize(12)
     .text('ፀጋ ገብረስላሴ ገብረሂወት', 50, 100)  // Amharic name
     .text('Tsega Gebreslasie Gebrehiwot', 50, 120)  // English name
     .text('21/08/1973', 50, 140)  // DOB Gregorian
     .text('1981/Apr/29', 50, 160)  // DOB Ethiopian
     .text('ሴት', 50, 180)  // Sex Amharic
     .text('Female', 80, 180)  // Sex English
     .text('0913687923', 50, 200)  // Phone
     .text('ትግራይ', 50, 220)  // Region Amharic
     .text('Tigray', 50, 240)  // Region English
     .text('መቐለ', 50, 260)  // Zone Amharic
     .text('Mekelle', 50, 280)  // Zone English
     .text('ሓድነት ክ/ከተማ', 50, 300)  // Woreda Amharic
     .text('Hadnet Sub City', 50, 320)  // Woreda English
     .text('3092 7187 9089 3152', 50, 340)  // FCN
     .text('4189 2798 1057', 50, 360)  // FIN
     .text('5479474', 50, 380);  // Serial Number
  
  // Finalize the PDF
  doc.end();
  
  console.log(`✓ Created test PDF: ${outputPath}`);
}

createTestPdf();