import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface Config {
  // Telegram
  telegramBotToken: string;
  
  // MongoDB
  mongodbUri: string;
  
  // Payment - Telebirr
  telebirrMerchantPhone: string;
  telebirrMerchantName: string;
  
  // Payment - CBE
  cbeMerchantAccount: string;
  cbeMerchantName: string;
  
  // Service
  serviceFee: number;
  nodeEnv: string;
  
  // Rate Limiting
  rateLimitMax: number;
  rateLimitWindowMs: number;
  
  // File Cleanup
  fileCleanupIntervalMs: number;
  fileMaxAgeMs: number;
  
  // Logging
  logLevel: string;
  
  // Temp directory
  tempDir: string;
}

function validateEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function validateEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value) {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error(`Environment variable ${key} must be a number`);
    }
    return parsed;
  }
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  throw new Error(`Missing required environment variable: ${key}`);
}

export const config: Config = {
  // Telegram
  telegramBotToken: validateEnv('TELEGRAM_BOT_TOKEN'),
  
  // MongoDB
  mongodbUri: validateEnv('MONGODB_URI', 'mongodb://localhost:27017/efayda'),
  
  // Payment - Telebirr
  telebirrMerchantPhone: validateEnv('TELEBIRR_MERCHANT_PHONE', ''),
  telebirrMerchantName: validateEnv('TELEBIRR_MERCHANT_NAME', 'eFayda ID Service'),
  
  // Payment - CBE
  cbeMerchantAccount: validateEnv('CBE_MERCHANT_ACCOUNT', ''),
  cbeMerchantName: validateEnv('CBE_MERCHANT_NAME', 'eFayda ID Service'),
  
  // Service
  serviceFee: validateEnvNumber('SERVICE_FEE', 50),
  nodeEnv: validateEnv('NODE_ENV', 'development'),
  
  // Rate Limiting
  rateLimitMax: validateEnvNumber('RATE_LIMIT_MAX', 10),
  rateLimitWindowMs: validateEnvNumber('RATE_LIMIT_WINDOW_MS', 60000),
  
  // File Cleanup
  fileCleanupIntervalMs: validateEnvNumber('FILE_CLEANUP_INTERVAL_MS', 3600000),
  fileMaxAgeMs: validateEnvNumber('FILE_MAX_AGE_MS', 3600000),
  
  // Logging
  logLevel: validateEnv('LOG_LEVEL', 'info'),
  
  // Temp directory
  tempDir: validateEnv('TEMP_DIR', './temp'),
};

export default config;
