/**
 * Fayda reCAPTCHA Token Generator
 * Reverse engineered from official Fayda website: https://resident.fayda.et/
 */
import axios from 'axios';
import logger from '../../utils/logger';

/**
 * Inspect the Fayda website to find the reCAPTCHA site key
 * This should be run once to discover the site key
 */
export async function inspectFaydaWebsite(): Promise<{ siteKey: string; version: string }> {
  const puppeteer = await import('puppeteer');
  
  logger.info('Inspecting Fayda website for reCAPTCHA configuration...');
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Navigate to Fayda website
    logger.info('Loading https://resident.fayda.et/...');
    await page.goto('https://resident.fayda.et/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for page to fully load
    await page.waitForTimeout(3000);
    
    // Extract reCAPTCHA configuration from the page
    const recaptchaInfo = await page.evaluate(() => {
      // Method 1: Look for data-sitekey attribute
      const recaptchaElement = document.querySelector('[data-sitekey]');
      if (recaptchaElement) {
        return {
          siteKey: recaptchaElement.getAttribute('data-sitekey'),
          version: 'v2',
          method: 'data-sitekey attribute'
        };
      }
      
      // Method 2: Look for grecaptcha.render calls in scripts
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const script of scripts) {
        const content = script.textContent || '';
        const siteKeyMatch = content.match(/sitekey['":\s]+['"]([^'"]+)['"]/i);
        if (siteKeyMatch) {
          return {
            siteKey: siteKeyMatch[1],
            version: content.includes('grecaptcha.execute') ? 'v3' : 'v2',
            method: 'script content'
          };
        }
      }
      
      // Method 3: Check for reCAPTCHA script tags
      const recaptchaScript = Array.from(document.querySelectorAll('script[src*="recaptcha"]'));
      if (recaptchaScript.length > 0) {
        const src = recaptchaScript[0].getAttribute('src') || '';
        const renderMatch = src.match(/render=([^&]+)/);
        if (renderMatch) {
          return {
            siteKey: renderMatch[1],
            version: 'v3',
            method: 'script src'
          };
        }
      }
      
      // Method 4: Check window object
      if ((window as any).___grecaptcha_cfg) {
        const cfg = (window as any).___grecaptcha_cfg;
        const clients = cfg.clients || {};
        const firstClient = Object.values(clients)[0] as any;
        if (firstClient && firstClient.sitekey) {
          return {
            siteKey: firstClient.sitekey,
            version: 'v3',
            method: 'grecaptcha config'
          };
        }
      }
      
      return null;
    });
    
    if (recaptchaInfo) {
      logger.info('Found reCAPTCHA configuration:', recaptchaInfo);
      return {
        siteKey: recaptchaInfo.siteKey,
        version: recaptchaInfo.version
      };
    }
    
    // If not found, take a screenshot for debugging
    await page.screenshot({ path: 'fayda-debug.png', fullPage: true });
    logger.warn('Could not find reCAPTCHA configuration. Screenshot saved to fayda-debug.png');
    
    throw new Error('reCAPTCHA configuration not found on Fayda website');
    
  } finally {
    await browser.close();
  }
}

/**
 * Generate reCAPTCHA token by automating the Fayda website
 * This mimics exactly what a real user would do
 */
export async function generateFaydaCaptchaToken(finNumber?: string): Promise<string> {
  const puppeteer = await import('puppeteer');
  
  logger.info('Generating Fayda reCAPTCHA token...');
  const browser = await puppeteer.default.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });
  
  try {
    const page = await browser.newPage();
    
    // Make it look more like a real browser
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Remove automation indicators
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    
    // Navigate to Fayda website
    logger.info('Loading Fayda website...');
    await page.goto('https://resident.fayda.et/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // If FIN number provided, fill it in
    if (finNumber) {
      logger.info('Filling in FIN number...');
      try {
        // Try different possible selectors
        const selectors = [
          'input[name="idNumber"]',
          'input[placeholder*="FCN"]',
          'input[placeholder*="FAN"]',
          'input[type="text"]',
          '#idNumber',
          '.id-input'
        ];
        
        for (const selector of selectors) {
          const element = await page.$(selector);
          if (element) {
            await element.type(finNumber, { delay: 100 });
            logger.info(`Filled FIN using selector: ${selector}`);
            break;
          }
        }
      } catch (e) {
        logger.warn('Could not fill FIN number:', e);
      }
    }
    
    // Wait for reCAPTCHA to be ready
    await page.waitForTimeout(2000);
    
    // Try to get the reCAPTCHA token
    logger.info('Attempting to get reCAPTCHA token...');
    
    const token = await page.evaluate(() => {
      return new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('reCAPTCHA token generation timeout'));
        }, 30000);
        
        // Check if grecaptcha is loaded
        if (typeof (window as any).grecaptcha === 'undefined') {
          clearTimeout(timeout);
          reject(new Error('grecaptcha not loaded'));
          return;
        }
        
        // Try to get existing token first
        const existingToken = (window as any).grecaptcha.getResponse?.();
        if (existingToken) {
          clearTimeout(timeout);
          resolve(existingToken);
          return;
        }
        
        // Execute reCAPTCHA
        (window as any).grecaptcha.ready(() => {
          // Get site key from the page
          const siteKey = document.querySelector('[data-sitekey]')?.getAttribute('data-sitekey') ||
                         (window as any).___grecaptcha_cfg?.clients?.[Object.keys((window as any).___grecaptcha_cfg.clients)[0]]?.sitekey;
          
          if (!siteKey) {
            clearTimeout(timeout);
            reject(new Error('Site key not found'));
            return;
          }
          
          (window as any).grecaptcha.execute(siteKey, { action: 'submit' })
            .then((token: string) => {
              clearTimeout(timeout);
              resolve(token);
            })
            .catch((error: any) => {
              clearTimeout(timeout);
              reject(error);
            });
        });
      });
    });
    
    logger.info('reCAPTCHA token generated successfully');
    logger.info(`Token length: ${token.length} characters`);
    
    return token;
    
  } catch (error) {
    logger.error('Failed to generate reCAPTCHA token:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Alternative: Intercept the actual captcha token from network requests
 * This captures the exact token that the website sends to the API
 */
export async function interceptFaydaCaptchaToken(finNumber: string): Promise<string> {
  const puppeteer = await import('puppeteer');
  
  logger.info('Intercepting Fayda captcha token from network...');
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    let captchaToken: string | null = null;
    
    // Intercept network requests
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      // Log API calls
      if (request.url().includes('verifycaptcha')) {
        logger.info('Intercepted verifycaptcha request');
        const postData = request.postData();
        if (postData) {
          try {
            const data = JSON.parse(postData);
            if (data.captchaValue) {
              captchaToken = data.captchaValue;
              logger.info('Captured captcha token!');
              logger.info(`Token preview: ${captchaToken.substring(0, 50)}...`);
            }
          } catch (e) {
            // Ignore
          }
        }
      }
      request.continue();
    });
    
    // Navigate and interact
    await page.goto('https://resident.fayda.et/', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(3000);
    
    // Fill form and submit
    try {
      await page.type('input[name="idNumber"]', finNumber, { delay: 100 });
      await page.click('input[value="FCN"]');
      await page.waitForTimeout(1000);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
    } catch (e) {
      logger.warn('Form interaction failed:', e);
    }
    
    if (!captchaToken) {
      throw new Error('Failed to intercept captcha token');
    }
    
    return captchaToken;
    
  } finally {
    await browser.close();
  }
}

