/**
 * Test different API endpoint variations
 */
import axios from 'axios';

const TEST_TOKEN = '0cAFcWeA6qgx-O3NvUUtP1qCcF9zIt1pQL4NmsxBsag4gXEuHh';
const TEST_FIN = '4287130746806479';

const endpoints = [
  'https://api-resident.fayda.et/verifycaptcha',
  'https://api-resident.fayda.et/verify-captcha',
  'https://api-resident.fayda.et/api/verifycaptcha',
  'https://api-resident.fayda.et/api/verify-captcha',
  'https://resident.fayda.et/api/verifycaptcha',
  'https://resident.fayda.et/api/verify-captcha',
  'https://api.fayda.et/verifycaptcha',
  'https://api.fayda.et/verify-captcha',
];

async function testEndpoints() {
  console.log('🧪 Testing different API endpoint variations...\n');
  
  for (const endpoint of endpoints) {
    console.log(`Testing: ${endpoint}`);
    try {
      const response = await axios.post(endpoint, {
        captchaValue: TEST_TOKEN,
        idNumber: TEST_FIN,
        verificationMethod: 'FCN'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Origin': 'https://resident.fayda.et',
          'Referer': 'https://resident.fayda.et/'
        },
        timeout: 10000
      });
      
      console.log(`✅ SUCCESS! Status: ${response.status}`);
      console.log('Response:', JSON.stringify(response.data, null, 2));
      console.log('\n---\n');
      break;
      
    } catch (error: any) {
      if (error.response) {
        console.log(`❌ ${error.response.status} - ${error.response.statusText}`);
        if (error.response.status !== 404) {
          console.log('Response data:', JSON.stringify(error.response.data, null, 2));
        }
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`❌ Connection refused`);
      } else if (error.code === 'ETIMEDOUT') {
        console.log(`❌ Timeout`);
      } else {
        console.log(`❌ ${error.message}`);
      }
    }
    console.log('');
  }
}

testEndpoints();
