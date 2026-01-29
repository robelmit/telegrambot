/**
 * Debug script to capture actual network requests from Fayda website
 */
import puppeteer from 'puppeteer';

async function debugFaydaNetwork() {
  console.log('🔍 Debugging Fayda website network requests...\n');
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser so we can see what's happening
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Log all network requests
    page.on('request', (request) => {
      if (request.url().includes('fayda') || request.url().includes('captcha')) {
        console.log('📤 REQUEST:', request.method(), request.url());
      }
    });
    
    page.on('response', async (response) => {
      if (response.url().includes('fayda') || response.url().includes('captcha')) {
        console.log('📥 RESPONSE:', response.status(), response.url());
        try {
          const text = await response.text();
          if (text.length < 500) {
            console.log('   Body:', text.substring(0, 200));
          }
        } catch (e) {
          // Ignore
        }
      }
    });
    
    console.log('Loading https://resident.fayda.et/...');
    await page.goto('https://resident.fayda.et/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    console.log('\n✅ Page loaded. Waiting 10 seconds to observe...');
    console.log('👀 Watch the browser window and check the console for network requests\n');
    
    await page.waitForTimeout(10000);
    
    // Try to find form elements
    console.log('\n🔍 Looking for form elements...');
    const inputs = await page.evaluate(() => {
      const allInputs = Array.from(document.querySelectorAll('input'));
      return allInputs.map(input => ({
        type: input.type,
        name: input.name,
        id: input.id,
        placeholder: input.placeholder,
        className: input.className
      }));
    });
    
    console.log('Found inputs:', JSON.stringify(inputs, null, 2));
    
    const buttons = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      return allButtons.map(btn => ({
        text: btn.textContent?.trim(),
        type: btn.type,
        className: btn.className
      }));
    });
    
    console.log('\nFound buttons:', JSON.stringify(buttons, null, 2));
    
    console.log('\n⏸️  Keeping browser open for 30 more seconds...');
    await page.waitForTimeout(30000);
    
  } finally {
    await browser.close();
  }
}

debugFaydaNetwork().catch(console.error);
