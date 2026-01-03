import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

interface Config {
  // Telegram
  telegramBotToken: string;
  
  // MongoDB
  mongodbUri: string;
  
  // Redis
  redisUri: string;
  
  // Payment - Telebirr
  telebirrMerchantPhone: string;
  telebirrMerchantName: string;
  
  // Payment - CBE
  cbeMerchantAccount: string;
  cbeMerchantName: string;
  
  // Service
  serviceFee: number;
  nodeEnv: string;
  
  // Rate Lim