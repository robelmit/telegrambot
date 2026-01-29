/**
 * Test Fayda API directly with a known working token
 * This will help us understand if the API works without Puppeteer
 */
import axios from 'axios';

const FAYDA_API_BASE = 'https://api-resident.fayda.et';

// Use a simple test token (this will likely fail, but we'll see the error)
const TEST_TOKEN = 'test-token-12345';
const TEST_FIN = '4287130746806479';

async function testFaydaAPI() {
  console.log('🧪 Testing Fayda API directly...\n');
  
  try {
    console.log('Step 1: Testing /verifycaptcha endpoint');
    console.log(`FIN: ${TEST_FIN}`);
    console.log(`Token: ${TEST_TOKEN.substring(0, 20)}...\n`);
    
    const response = await axios.post(`${FAYDA_API_BASE}/verifycaptcha`, {
      captchaValue: TEST_TOKEN,
      idNumber: TEST_FIN,
      verificationMethod: 'FCN'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error: any) {
    console.log('❌ Error occurred:');
    console.log('Status:', error.response?.status);
    console.log('Status Text:', error.response?.statusText);
    console.log('Error Data:', JSON.stringify(error.response?.data, null, 2));
    console.log('\nFull Error:', error.message);
  }
}

testFaydaAPI();
