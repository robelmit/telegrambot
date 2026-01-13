import dotenv from 'dotenv';
dotenv.config();

import { createBot, startBot, stopBot } from './bot';
import { connectDatabase, disconnectDatabase } from './utils/database';
import { initializeJobQueue, shutdownJobQueue } from './services/queue';
import { PDFService } from './services/pdf';
import { IDGeneratorService } from './services/generator';
import { WalletService } from './services/payment';
import { FileDeliveryService } from './services/delivery';
import { registerShutdownHandlers } from './utils/shutdown';
import { preWarmBackgroundRemoval } from './services/generator/cardRenderer';
import logger from './utils/logger';
import config from './config';

async function main() {
  try {
    logger.info('Starting eFayda ID Generator Bot...');
    logger.info(`Node.js version: ${process.version}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

    // Connect to MongoDB
    logger.info('Connecting to MongoDB...');
    await connectDatabase();
    logger.info('MongoDB connected successfully');

    // Create bot instance
    logger.info('Creating bot instance...');
    const bot = createBot(config.telegramBotToken);
    logger.info('Bot instance created');

    // Initialize services
    logger.info('Initializing services...');
    const pdfService = new PDFService();
    const idGenerator = new IDGeneratorService();
    const walletService = new WalletService();
    const deliveryService = new FileDeliveryService(bot);
    logger.info('Services initialized');

    // Pre-warm AI background removal pipeline (loads model before first request)
    logger.info('Pre-warming AI model...');
    await preWarmBackgroundRemoval();
    logger.info('AI model ready');

    // Initialize job queue (in-memory, no Redis needed)
    logger.info('Initializing job queue...');
    initializeJobQueue({
      pdfService,
      idGenerator,
      walletService,
      onComplete: async (job, files) => {
        const { chatId } = job.data;
        
        try {
          const JobModel = (await import('./models/Job')).default;
          const jobDoc = await JobModel.findById(job.data.jobId);
          const userName = jobDoc?.extractedData?.fullNameEnglish || 'User';

          await deliveryService.deliverFiles(chatId, {
            colorNormalPng: files[0],
            colorMirroredPng: files[1],
            colorNormalPdf: files[2],
            colorMirroredPdf: files[3]
          }, userName);

          // Cleanup files after 1 minute
          setTimeout(async () => {
            await deliveryService.cleanupJobFiles({
              colorNormalPng: files[0],
              colorMirroredPng: files[1],
              colorNormalPdf: files[2],
              colorMirroredPdf: files[3]
            });
          }, 60000);
        } catch (error) {
          logger.error('File delivery failed:', error);
        }
      },
      onBulkBatchComplete: async (_bulkGroupId, batchIndex, combinedFiles, chatId, _telegramId) => {
        try {
          // Send combined PDFs to user (normal and mirrored)
          const fs = await import('fs');
          
          for (let i = 0; i < combinedFiles.length; i++) {
            const filePath = combinedFiles[i];
            const isNormal = i === 0;
            const fileType = isNormal ? 'Normal' : 'Mirrored';
            
            if (fs.existsSync(filePath)) {
              await bot.telegram.sendDocument(chatId, {
                source: filePath,
                filename: `bulk_ids_batch_${batchIndex + 1}_${fileType.toLowerCase()}.pdf`
              }, {
                caption: `📄 Bulk ID Cards - Batch ${batchIndex + 1} (${fileType})\n\n` +
                  (isNormal 
                    ? `Normal orientation for viewing.`
                    : `Mirrored for printing - flip paper to print back side.`) +
                  `\nPrint at 100% scale for correct size.`
              });
              
              logger.info(`Delivered bulk batch ${batchIndex + 1} (${fileType}) to chat ${chatId}`);
              
              // Cleanup after 2 minutes
              setTimeout(async () => {
                try {
                  await fs.promises.unlink(filePath);
                  logger.info(`Cleaned up bulk PDF: ${filePath}`);
                } catch (e) {
                  // Ignore cleanup errors
                }
              }, 120000);
            }
          }
        } catch (error) {
          logger.error('Bulk batch delivery failed:', error);
          try {
            await bot.telegram.sendMessage(chatId, 
              `❌ Failed to deliver batch ${batchIndex + 1}. Please contact support.`
            );
          } catch (e) {
            // Ignore notification errors
          }
        }
      },
      onFailed: async (job, error) => {
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
    logger.info('Job queue initialized');

    // Start file cleanup scheduler
    deliveryService.startCleanupScheduler(60 * 60 * 1000);
    logger.info('File cleanup scheduler started');

    // Register shutdown handlers
    registerShutdownHandlers(async () => {
      logger.info('Shutting down...');
      await stopBot(bot);
      shutdownJobQueue();
      await disconnectDatabase();
      logger.info('Shutdown complete');
    });
    logger.info('Shutdown handlers registered');

    // Start the bot
    logger.info('Starting Telegram bot...');
    await startBot(bot);
    
    logger.info('✅ eFayda ID Generator Bot is running successfully!');
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(`Bot token: ${config.telegramBotToken.substring(0, 10)}...`);
  } catch (error) {
    logger.error('❌ Failed to start bot:', error);
    logger.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    process.exit(1);
  }
}

main();

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});
