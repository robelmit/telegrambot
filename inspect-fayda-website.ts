/**
 * Script to inspect the Fayda website and discover reCAPTCHA configuration
 * Run this to find the site key and understand how they implement reCAPTCHA
 */
import { inspectFaydaWebsite, interceptFaydaCaptchaToken } from './src/services/captcha/faydaCaptcha';

async function main() {
  console.log('🔍 Inspecting Fayda website...\n');
  
  try {
    // Step 1: Inspect the website
    console.log('Step 1: Finding reCAPTCHA configuration...');
    const config = await inspectFaydaWebsite();
    console.log('\n✅ Found reCAPTCHA configuration:');
    console.log(`   Site Key: ${config.siteKey}`);
    console.log(`   Version: ${config.version}`);
    console.log('\n');
    
    // Step 2: Try to intercept a real token
    console.log('Step 2: Intercepting captcha token from actual form submission...');
    console.log('   (Using test FIN: 4287130746806479)');
    const token = await interceptFaydaCaptchaToken('4287130746806479');
    console.log('\n✅ Captured captcha token:');
    console.log(`   Length: ${token.length} characters`);
    console.log(`   Preview: ${token.substring(0, 100)}...`);
    console.log('\n');
    
    // Step 3: Save configuration
    console.log('📝 Save this configuration to your .env file:');
    console.log(`   FAYDA_RECAPTCHA_SITE_KEY=${config.siteKey}`);
    console.log('\n');
    
    console.log('✅ Inspection complete!');
    console.log('\nNext steps:');
    console.log('1. Add the site key to your .env file');
    console.log('2. Install puppeteer: npm install puppeteer');
    console.log('3. Test the bot with /id command');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    console.log('\nTroubleshooting:');
    console.log('- Make sure you have internet connection');
    console.log('- Check if https://resident.fayda.et/ is accessible');
    console.log('- Install puppeteer: npm install puppeteer');
    console.log('- Check the screenshot: fayda-debug.png');
  }
}

main();
