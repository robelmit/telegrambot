"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
function validateEnv(key, defaultValue) {
    const value = process.env[key] || defaultValue;
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}
function validateEnvNumber(key, defaultValue) {
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
exports.config = {
    // Telegram
    telegramBotToken: validateEnv('TELEGRAM_BOT_TOKEN'),
    // MongoDB
    mongodbUri: validateEnv('MONGODB_URI', 'mongodb://localhost:27017/efayda'),
    // Payment - Telebirr
    telebirrMerchantPhone: validateEnv('TELEBIRR_RECEIVER_PHONE', ''),
    telebirrMerchantName: validateEnv('PAYMENT_RECIPIENT_NAME', 'eFayda ID Service'),
    // Payment - CBE
    cbeMerchantAccount: validateEnv('CBE_RECEIVER_ACCOUNT', ''),
    cbeMerchantName: validateEnv('PAYMENT_RECIPIENT_NAME', 'eFayda ID Service'),
    // Service
    serviceFee: validateEnvNumber('SERVICE_PRICE', 50),
    nodeEnv: validateEnv('NODE_ENV', 'development'),
    // Agent/Referral
    agentCommissionPercent: validateEnvNumber('AGENT_COMMISSION_PERCENT', 40),
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
exports.default = exports.config;
//# sourceMappingURL=index.js.map