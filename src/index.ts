import dotenv from 'dotenv';
dotenv.config();

import { createBot, startBot, stopBot } from './bot';
import { connectDatabase, disconnectDatabase } from './utils/database';
import { connectRedis, disconnectRedis } from './utils/redis';
import { initializeJobQueue, shutdownJobQueue } from './services/queue';
import { PDFService } from './services/pdf';
import { IDGeneratorService } from './services/generator';
import { WalletService, FileDeliveryService } from './services/payment';
import { registerShutdownHandlers } from './utils/shutdown';
import logger from './utils/logger';
import config from './config';

async function main() {
  logger.info('Starting eFayda ID Generator Bot...');

  try {
    // Connect to databases
    logger.info('Connecting to MongoDB...');
    await connectDatabase();
    
    logger.info('Connecting to Redis...');
    await connectRedis();

    // Create bot instance
    const bot = createBot(config.telegramBotToken);

    // Initialize services
    const pdfService = new PDFService();
    const idGenerator = new IDGeneratorService();
    const walletService = new WalletService();
    const deliveryService = new FileDeliveryService(bot);

    // Initialize job queue with processor
    const { queue } = initializeJobQueue({
      pdfService,
      idGenerator,
      walletService,
      onComplete: async (job, files) => {
        // Deliver files to user
        const { chatId, telegramId } = job.data;
        
        try {
          // Get extracted data for filename
          const JobModel = (await import('./models/Job')).default;
          const jobDoc = await JobModel.findById(job.data.jobId);
          const userName = jobDoc?.extractedData?.fullNameEnglish || 'User';

          await deliveryService.deliverFiles(chatId, {
            colorMirroredPng: files[0],
            grayscaleMirroredPng: files[1],
            colorMirroredPdf: files[2],
            grayscaleMirroredPdf: files[3]
          }, userName);

          // Cleanup files after delivery
          setTimeout(async () => {
            await deliveryService.cleanupJobFiles({
              colorMirroredPng: files[0],
              grayscaleMirroredPng: files[1],
              colorMirroredPdf: files[2],
              grayscaleMirroredPdf: files[3]
            });
          }, 60000); // Cleanup after 1 minute
        } catch (error) {
          logger.error('File delivery failed:', error);
        }
      },
      onFailed: async (job, error) => {
        // Notify user of failure
        const { chatId } = job.data;
        try {
          await bot.telegram.sendMessage(
            chatId,
            `❌ Sorry, we couldn't process your document. Your wallet has been refunded.\n\nError: ${error.message}`
          );
        } catch (notifyError) {
          logger.error('Failed to notify user of job failure:', notifyError);
        }
      }
    });

    // Start file cleanup scheduler
    deliveryService.startCleanupScheduler(60 * 60 * 1000); // Every hour

    // Register shutdown handlers
    registerShutdownHandlers(async () => {
      logger.info('Shutting down...');
      await stopBot(bot);
      await shutdownJobQueue();
      await disconnectRedis();
      await disconnectDatabase();
      logger.info('Shutdown complete');
    });

    // Start the bot
    await startBot(bot);
    
    logger.info('eFayda ID Generator Bot is running!');
    logger.info(`Environment: ${config.nodeEnv}`);
  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

main();
