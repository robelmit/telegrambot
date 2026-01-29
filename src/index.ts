import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createBot, startBot, stopBot } from './bot';
import { connectDatabase, disconnectDatabase } from './utils/database';
import { initializeJobQueue, shutdownJobQueue } from './services/queue';
import { PDFService } from './services/pdf';
import { IDGeneratorService } from './services/generator';
import { WalletService } from './services/payment';
import { FileDeliveryService } from './services/delivery';
import { registerShutdownHandlers } from './utils/shutdown';
import { closeBrowser } from './services/captcha/optimizedCaptcha';
// import { setupCaptchaRoutes } from './services/captcha/captchaServer';
// import { preWarmBackgroundRemoval } from './services/generator/cardRenderer';
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

    // Create Express app for reCAPTCHA verification
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Create bot instance
    logger.info('Creating bot instance...');
    const bot = createBot(config.telegramBotToken);
    logger.info('Bot instance created');

    // Setup reCAPTCHA routes (disabled - using Puppeteer automation instead)
    // logger.info('Setting up reCAPTCHA verification server...');
    // setupCaptchaRoutes(app, bot);
    // const port = process.env.PORT || 3000;
    // app.listen(port, () => {
    //   logger.info(`reCAPTCHA server listening on port ${port}`);
    // });

    // Initialize services
    logger.info('Initializing services...');
    const pdfService = new PDFService();
    const idGenerator = new IDGeneratorService();
    const walletService = new WalletService();
    const deliveryService = new FileDeliveryService(bot);
    logger.info('Services initialized');

    // Pre-warm AI background removal pipeline (loads model before first request)
    // Temporarily disabled due to ONNX runtime issues on Windows
    // logger.info('Pre-warming AI model...');
    // await preWarmBackgroundRemoval();
    // logger.info('AI model ready');
    logger.info('Skipping AI model pre-warming (disabled for testing)');

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
          // Check if this is the final combined PDFs (batchIndex = -1)
          const isFinalCombined = batchIndex === -1;
          
          if (isFinalCombined) {
            logger.info(`Delivering FINAL combined PDFs (${combinedFiles.length} files) to chat ${chatId}`);
          } else {
            logger.info(`Delivering batch ${batchIndex + 1} PDFs (${combinedFiles.length} files) to chat ${chatId}`);
          }
          
          // Send combined PDFs to user (normal and mirrored)
          const fs = await import('fs');
          
          for (let i = 0; i < combinedFiles.length; i++) {
            const filePath = combinedFiles[i];
            const isNormal = i === 0;
            const fileType = isNormal ? 'Normal' : 'Mirrored';
            
            if (!fs.existsSync(filePath)) {
              logger.error(`File not found: ${filePath}`);
              continue;
            }
            
            try {
              if (isFinalCombined) {
                // Final combined PDFs with ALL cards
                await bot.telegram.sendDocument(chatId, {
                  source: filePath,
                  filename: `ALL_IDs_${fileType.toLowerCase()}.pdf`
                }, {
                  caption: `📦 **ALL ID Cards Combined** (${fileType})\n\n` +
                    `✅ This PDF contains ALL your ID cards in one file!\n` +
                    (isNormal 
                      ? `📄 Normal orientation for viewing and reference.`
                      : `🖨️ Mirrored for printing - flip paper to print back side.`) +
                    `\n\n💡 Print at 100% scale for correct size.\n` +
                    `📏 4 cards per page for efficient printing.`,
                  parse_mode: 'Markdown'
                });
                
                logger.info(`Delivered FINAL combined ${fileType} PDF to chat ${chatId}`);
              } else {
                // Regular batch PDFs
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
              }
              
              // Cleanup after 2 minutes
              setTimeout(async () => {
                try {
                  await fs.promises.unlink(filePath);
                  logger.info(`Cleaned up bulk PDF: ${filePath}`);
                } catch (e) {
                  // Ignore cleanup errors
                }
              }, 120000);
            } catch (fileError) {
              logger.error(`Failed to send file ${filePath}:`, fileError);
              throw fileError; // Re-throw to trigger outer catch
            }
          }
        } catch (error) {
          logger.error(`Bulk ${batchIndex === -1 ? 'final combined' : `batch ${batchIndex + 1}`} delivery failed:`, error);
          try {
            await bot.telegram.sendMessage(chatId, 
              `❌ Failed to deliver ${batchIndex === -1 ? 'final combined PDFs' : `batch ${batchIndex + 1}`}. Please contact support.`
            );
          } catch (e) {
            logger.error('Failed to send error notification:', e);
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
      await closeBrowser(); // Close shared Puppeteer browser
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
