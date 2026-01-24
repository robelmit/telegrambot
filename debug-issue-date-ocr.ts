/**
 * Debug issue date OCR extraction
 */
import fs from 'fs';
import pdfParse from 'pdf-parse';

async function debugIssueDates() {
  const buffer = fs.readFileSync('template/efayda_Eset Tsegay Gebremeskel.pdf');
  const pdfData = await pdfParse(buffer);
  const text = pdfData.text;
  
  console.log('='.repeat(80));
  console.log('Searching for Issue Date in PDF Text');
  console.log('='.repeat(80));
  
  // Look for "Issue" keyword
  const issueKeywords = ['Issue', 'issue', 'Date of Issue', 'Issue Date'];
  
  issueKeywords.forEach(keyword => {
    const index = text.indexOf(keyword);
    if (index !== -1) {
      console.log(`\n✅ Found "${keyword}" at position ${index}`);
      const context = text.substring(Math.max(0, index - 50), Math.min(text.length, index + 200));
      console.log('Context:');
      console.log(context);
    }
  });
  
  // Look for all dates in the PDF
  console.log('\n' + '='.repeat(80));
  console.log('All Dates in PDF');
  console.log('='.repeat(80));
  
  // Gregorian dates (DD/MM/YYYY)
  const gregorianDates = text.match(/\d{2}\/\d{2}\/\d{4}/g) || [];
  console.log('\nGregorian dates (DD/MM/YYYY):');
  gregorianDates.forEach((date, idx) => {
    console.log(`  ${idx + 1}. ${date}`);
  });
  
  // Ethiopian dates (YYYY/MM/DD)
  const ethiopianDates = text.match(/\d{4}\/\d{2}\/\d{2}/g) || [];
  console.log('\nEthiopian dates (YYYY/MM/DD):');
  ethiopianDates.forEach((date, idx) => {
    console.log(`  ${idx + 1}. ${date}`);
  });
  
  // Dates with month names (YYYY/Mon/DD)
  const monthNameDates = text.match(/\d{4}\/[A-Za-z]{3,9}\/\d{1,2}/g) || [];
  console.log('\nDates with month names (YYYY/Mon/DD):');
  monthNameDates.forEach((date, idx) => {
    console.log(`  ${idx + 1}. ${date}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('Analysis');
  console.log('='.repeat(80));
  console.log('\nExpected pattern:');
  console.log('  1st date = DOB');
  console.log('  2nd date = Issue Date (Ethiopian)');
  console.log('  3rd date = Issue Date (Gregorian)');
  console.log('  4th date = Expiry Date (Ethiopian)');
  console.log('  5th date = Expiry Date (Gregorian)');
}

debugIssueDates().catch(console.error);
