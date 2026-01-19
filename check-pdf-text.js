const pdfParse = require('pdf-parse');
const fs = require('fs');

pdfParse(fs.readFileSync('template/efayda_Abel Tesfaye Gebremedhim.pdf')).then(data => {
  console.log('='.repeat(70));
  console.log('PDF TEXT CONTENT:');
  console.log('='.repeat(70));
  console.log(data.text);
  console.log('='.repeat(70));
  
  // Look for woreda/subcity
  const lines = data.text.split('\n');
  console.log('\nLINES AFTER PHONE NUMBER:');
  let foundPhone = false;
  let count = 0;
  for (const line of lines) {
    if (line.includes('0966050177')) {
      foundPhone = true;
    }
    if (foundPhone && count < 15) {
      console.log(`Line ${count}: "${line}"`);
      count++;
    }
  }
});
