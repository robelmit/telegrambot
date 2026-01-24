/**
 * Test issue date extraction from both PDF files
 */
import fs from 'fs';
import { pdfParser } from './src/services/pdf/parser';

async function testIssueDates() {
  const files = [
    'template/efayda_Eset Tsegay Gebremeskel.pdf',
    'template/efayda_Mulu Kidanu Haylu.pdf'
  ];

  for (const file of files) {
    console.log('\n' + '='.repeat(80));
    console.log(file);
    console.log('='.repeat(80));

    try {
      const buffer = fs.readFileSync(file);
      const data = await pdfParser.parse(buffer);
      
      console.log('\nExtracted Dates:');
      console.log('  DOB (Gregorian):', data.dateOfBirthGregorian);
      console.log('  DOB (Ethiopian):', data.dateOfBirthEthiopian);
      console.log('  Issue Date (Gregorian):', data.issueDate);
      console.log('  Issue Date (Ethiopian):', data.issueDateEthiopian);
      console.log('  Expiry Date (Gregorian):', data.expiryDate);
      console.log('  Expiry Date (Ethiopian):', data.expiryDateEthiopian);
      
      // Check if dates are calculated or extracted
      const currentYear = new Date().getFullYear();
      const issueYear = data.issueDate ? parseInt(data.issueDate.split('/')[0]) : 0;
      
      if (issueYear === currentYear) {
        console.log('\n⚠️  Issue date appears to be CALCULATED (current year)');
      } else {
        console.log('\n✅ Issue date appears to be EXTRACTED from PDF');
      }
      
      // Check Ethiopian calendar
      const ethIssueYear = data.issueDateEthiopian ? parseInt(data.issueDateEthiopian.split('/')[0]) : 0;
      const expectedEthYear = currentYear - 8; // Ethiopian calendar is ~7-8 years behind
      
      if (ethIssueYear === expectedEthYear) {
        console.log('⚠️  Ethiopian issue date appears to be CALCULATED');
      } else {
        console.log('✅ Ethiopian issue date appears to be EXTRACTED');
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
    }
  }
}

testIssueDates().catch(console.error);
