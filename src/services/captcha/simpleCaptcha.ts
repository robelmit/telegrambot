/**
 * Simplified Fayda Captcha Token Generator
 * Uses a more reliable approach: wait for reCAPTCHA to load, then execute it
 */
import logger from '../../utils/logger';

export const FAYDA_SITE_KEY = '6LcSAIwqAAAAAGsZElBPqf63_0fUtp17idU-SQYC';

export async function generateSimpleFaydaToken(): Promise<string> {
  const puppeteer = await import('puppeteer');
  
  logger.info('Generating Fayda captcha token (simple method)...');
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    logger.info('Loading Fayda website...');
    await page.goto('https://resident.fayda.et/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for reCAPTCHA to load
    logger.info('Waiting for reCAPTCHA to load...');
    await page.waitForTimeout(5000);
    
    // Execute reCAPTCHA v3 (invisible)
    logger.info('Executing reCAPTCHA...');
    const token = await page.evaluate((siteKey) => {
      return new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('reCAPTCHA timeout'));
        }, 30000);
        
        // Wait for grecaptcha to be ready
        const checkReady = setInterval(() => {
          if (typeof (window as any).grecaptcha !== 'undefined' && 
              typeof (window as any).grecaptcha.execute === 'function') {
            clearInterval(checkReady);
            
            (window as any).grecaptcha.ready(() => {
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
          }
        }, 500);
        
        // Fallback timeout for checkReady
        setTimeout(() => {
          clearInterval(checkReady);
          if (timeout) {
            clearTimeout(timeout);
            reject(new Error('grecaptcha not loaded'));
          }
        }, 15000);
      });
    }, FAYDA_SITE_KEY);
    
    logger.info(`Token generated: ${token.substring(0, 50)}...`);
    return token;
    
  } finally {
    await browser.close();
  }
}
