/**
 * Optimized Fayda Captcha with Browser Reuse
 * Keeps one browser instance open and reuses it for all requests
 * Includes concurrency control and tab management
 */
import logger from '../../utils/logger';
import type { Browser } from 'puppeteer';

export const FAYDA_SITE_KEY = '6LcSAIwqAAAAAGsZElBPqf63_0fUtp17idU-SQYC';

// Configuration - More reasonable limits
const MAX_CONCURRENT_PAGES = 25; // Increased from 10
const MAX_PAGES_BEFORE_RESTART = 100; // Increased from 50
const PAGE_TIMEOUT = 45000; // 45 seconds (reduced from 60)
const MAX_QUEUE_SIZE = 500; // Increased from 100 - much more flexible

let sharedBrowser: Browser | null = null;
let browserInitializing = false;
let activePages = 0;
let totalPagesCreated = 0;
let failedRequests = 0;
let successfulRequests = 0;

// Adaptive concurrency - adjusts based on performance
let currentMaxConcurrent = MAX_CONCURRENT_PAGES;
let lastPerformanceCheck = Date.now();

// Check and adjust concurrency based on performance
function adjustConcurrency() {
  const now = Date.now();
  if (now - lastPerformanceCheck < 60000) return; // Check every minute
  
  lastPerformanceCheck = now;
  const totalRequests = successfulRequests + failedRequests;
  
  if (totalRequests === 0) return;
  
  const successRate = successfulRequests / totalRequests;
  const memUsage = process.memoryUsage();
  const memUsageMB = memUsage.rss / 1024 / 1024;
  
  // If success rate is high and memory is OK, increase concurrency
  if (successRate > 0.95 && memUsageMB < 1500 && currentMaxConcurrent < MAX_CONCURRENT_PAGES) {
    currentMaxConcurrent = Math.min(currentMaxConcurrent + 5, MAX_CONCURRENT_PAGES);
    logger.info(`📈 Increased concurrency to ${currentMaxConcurrent} (success rate: ${(successRate * 100).toFixed(1)}%)`);
  }
  
  // If success rate is low or memory is high, decrease concurrency
  if (successRate < 0.85 || memUsageMB > 1800) {
    currentMaxConcurrent = Math.max(currentMaxConcurrent - 5, 10);
    logger.warn(`📉 Decreased concurrency to ${currentMaxConcurrent} (success rate: ${(successRate * 100).toFixed(1)}%, mem: ${memUsageMB.toFixed(0)}MB)`);
  }
  
  // Reset counters
  successfulRequests = 0;
  failedRequests = 0;
}

// Queue for pending requests
interface QueuedRequest {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

const requestQueue: QueuedRequest[] = [];
let processingQueue = false;

async function getOrCreateBrowser(): Promise<Browser> {
  // If browser exists and is connected, return it
  if (sharedBrowser && sharedBrowser.isConnected()) {
    // Check if we should restart browser (memory cleanup)
    if (totalPagesCreated >= MAX_PAGES_BEFORE_RESTART) {
      logger.info(`Browser reached ${totalPagesCreated} pages, restarting for memory cleanup...`);
      await closeBrowser();
    } else {
      return sharedBrowser;
    }
  }

  // If another request is already initializing, wait for it
  if (browserInitializing) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return getOrCreateBrowser();
  }

  browserInitializing = true;
  
  try {
    const puppeteer = await import('puppeteer');
    logger.info('Initializing shared browser instance...');
    
    sharedBrowser = await puppeteer.default.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Reduce RAM usage
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // Use single process to save RAM
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-default-browser-check',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection' // Allow more concurrent requests
      ]
    });

    // Handle browser disconnect
    sharedBrowser.on('disconnected', () => {
      logger.warn('Browser disconnected, will recreate on next request');
      sharedBrowser = null;
      activePages = 0;
      totalPagesCreated = 0;
    });

    totalPagesCreated = 0;
    logger.info('Shared browser initialized');
    return sharedBrowser;
  } finally {
    browserInitializing = false;
  }
}

async function processQueue() {
  if (processingQueue || requestQueue.length === 0) {
    return;
  }

  processingQueue = true;

  while (requestQueue.length > 0 && activePages < currentMaxConcurrent) {
    const request = requestQueue.shift();
    if (!request) break;

    // Check if request is too old (timeout)
    const age = Date.now() - request.timestamp;
    if (age > PAGE_TIMEOUT) {
      logger.warn(`Request timed out in queue (${age}ms)`);
      request.reject(new Error('Request timed out in queue'));
      continue;
    }

    // Process request without awaiting (parallel processing)
    generateTokenInternal()
      .then(request.resolve)
      .catch(request.reject);
  }

  processingQueue = false;
}

async function generateTokenInternal(): Promise<string> {
  // Check concurrency limit (use adaptive limit)
  if (activePages >= currentMaxConcurrent) {
    throw new Error('Too many concurrent requests');
  }

  activePages++;
  totalPagesCreated++;
  
  logger.info(`Generating token (active: ${activePages}/${currentMaxConcurrent}, total: ${totalPagesCreated}, queue: ${requestQueue.length})`);
  
  const browser = await getOrCreateBrowser();
  const page = await browser.newPage();
  
  // Set timeout for this page
  const timeoutId = setTimeout(async () => {
    logger.warn('Page timeout, closing...');
    try {
      await page.close();
    } catch (e) {
      // Ignore
    }
  }, PAGE_TIMEOUT);
  
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.goto('https://resident.fayda.et/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for reCAPTCHA to load
    await page.waitForTimeout(5000);
    
    // Execute reCAPTCHA
    const token = await page.evaluate((siteKey) => {
      return new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('reCAPTCHA timeout'));
        }, 30000);
        
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
    successfulRequests++;
    adjustConcurrency(); // Check if we should adjust limits
    return token;
    
  } catch (error) {
    failedRequests++;
    adjustConcurrency(); // Check if we should adjust limits
    throw error;
  } finally {
    clearTimeout(timeoutId);
    activePages--;
    
    // Close the page
    try {
      await page.close();
    } catch (e) {
      logger.warn('Error closing page:', e);
    }
    
    // Process next item in queue
    setImmediate(() => processQueue());
  }
}

export async function generateOptimizedFaydaToken(): Promise<string> {
  // Check queue size
  if (requestQueue.length >= MAX_QUEUE_SIZE) {
    throw new Error(`Service is busy. Please try again in a moment. (Queue: ${requestQueue.length}/${MAX_QUEUE_SIZE})`);
  }

  // If under concurrency limit, process immediately
  if (activePages < currentMaxConcurrent) {
    return generateTokenInternal();
  }

  // Otherwise, add to queue
  logger.info(`Request queued (queue: ${requestQueue.length + 1}/${MAX_QUEUE_SIZE}, active: ${activePages}/${currentMaxConcurrent})`);
  
  return new Promise<string>((resolve, reject) => {
    requestQueue.push({
      resolve,
      reject,
      timestamp: Date.now()
    });
    
    // Try to process queue
    processQueue();
  });
}

// Get statistics
export function getBrowserStats() {
  return {
    activePages,
    totalPagesCreated,
    queueSize: requestQueue.length,
    currentMaxConcurrent,
    maxConcurrent: MAX_CONCURRENT_PAGES,
    maxQueue: MAX_QUEUE_SIZE,
    browserConnected: sharedBrowser?.isConnected() || false,
    successRate: successfulRequests + failedRequests > 0 
      ? (successfulRequests / (successfulRequests + failedRequests) * 100).toFixed(1) + '%'
      : 'N/A'
  };
}

// Cleanup function for graceful shutdown
export async function closeBrowser(): Promise<void> {
  if (sharedBrowser) {
    logger.info('Closing shared browser...');
    try {
      await sharedBrowser.close();
    } catch (e) {
      logger.warn('Error closing browser:', e);
    }
    sharedBrowser = null;
    activePages = 0;
    totalPagesCreated = 0;
  }
}
