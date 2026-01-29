/**
 * Capture the actual API endpoint used by Fayda website
 */
import puppeteer from 'puppeteer';

async function captureAPIEndpoint() {
  console.log('🔍 Capturing actual Fayda API endpoint...\n');
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    const apiCalls: any[] = [];
    
    // Intercept all requests
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('api') || url.includes('fayda')) {
        console.log('📤 REQUEST:', request.method(), url);
        if (request.method() === 'POST') {
          const postData = request.postData();
          if (postData) {
            console.log('   POST Data:', postData.substring(0, 200));
          }
        }
      }
    });
    
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('api') || (url.includes('fayda') && response.request().method() === 'POST')) {
        console.log('📥 RESPONSE:', response.status(), url);
        
        if (response.request().method() === 'POST') {
          try {
            const text = await response.text();
            console.log('   Response:', text.substring(0, 300));
            
            apiCalls.push({
              method: response.request().method(),
              url: url,
              status: response.status(),
              postData: response.request().postData(),
              response: text.substring(0, 500)
            });
          } catch (e) {
            // Ignore
          }
        }
      }
    });
    
    console.log('Loading https://resident.fayda.et/...');
    await page.goto('https://resident.fayda.et/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    console.log('\n✅ Page loaded');
    console.log('👉 Now manually:');
    console.log('   1. Enter a FAN number: 4287130746806479');
    console.log('   2. Click Proceed');
    console.log('   3. Watch the console for API calls\n');
    console.log('⏸️  Keeping browser open for 60 seconds...\n');
    
    await page.waitForTimeout(60000);
    
    console.log('\n📊 Summary of API calls:');
    apiCalls.forEach((call, i) => {
      console.log(`\n${i + 1}. ${call.method} ${call.url}`);
      console.log(`   Status: ${call.status}`);
      if (call.postData) {
        console.log(`   POST Data: ${call.postData.substring(0, 100)}...`);
      }
    });
    
  } finally {
    await browser.close();
  }
}

captureAPIEndpoint().catch(console.error);
