"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const bot_1 = require("./bot");
const database_1 = require("./utils/database");
const queue_1 = require("./services/queue");
const pdf_1 = require("./services/pdf");
const generator_1 = require("./services/generator");
const payment_1 = require("./services/payment");
const delivery_1 = require("./services/delivery");
const shutdown_1 = require("./utils/shutdown");
const logger_1 = __importDefault(require("./utils/logger"));
const config_1 = __importDefault(require("./config"));
async function main() {
    try {
        logger_1.default.info('Starting eFayda ID Generator Bot...');
        logger_1.default.info(`Node.js version: ${process.version}`);
        logger_1.default.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        // Connect to MongoDB
        logger_1.default.info('Connecting to MongoDB...');
        await (0, database_1.connectDatabase)();
        logger_1.default.info('MongoDB connected successfully');
        // Create bot instance
        logger_1.default.info('Creating bot instance...');
        const bot = (0, bot_1.createBot)(config_1.default.telegramBotToken);
        logger_1.default.info('Bot instance created');
        // Initialize services
        logger_1.default.info('Initializing services...');
        const pdfService = new pdf_1.PDFService();
        const idGenerator = new generator_1.IDGeneratorService();
        const walletService = new payment_1.WalletService();
        const deliveryService = new delivery_1.FileDeliveryService(bot);
        logger_1.default.info('Services initialized');
        // Initialize job queue (in-memory, no Redis needed)
        logger_1.default.info('Initializing job queue...');
        (0, queue_1.initializeJobQueue)({
            pdfService,
            idGenerator,
            walletService,
            onComplete: async (job, files) => {
                const { chatId } = job.data;
                try {
                    const JobModel = (await Promise.resolve().then(() => __importStar(require('./models/Job')))).default;
                    const jobDoc = await JobModel.findById(job.data.jobId);
                    const userName = jobDoc?.extractedData?.fullNameEnglish || 'User';
                    await deliveryService.deliverFiles(chatId, {
                        colorMirroredPng: files[0],
                        grayscaleMirroredPng: files[1],
                        colorMirroredPdf: files[2],
                        grayscaleMirroredPdf: files[3]
                    }, userName);
                    // Cleanup files after 1 minute
                    setTimeout(async () => {
                        await deliveryService.cleanupJobFiles({
                            colorMirroredPng: files[0],
                            grayscaleMirroredPng: files[1],
                            colorMirroredPdf: files[2],
                            grayscaleMirroredPdf: files[3]
                        });
                    }, 60000);
                }
                catch (error) {
                    logger_1.default.error('File delivery failed:', error);
                }
            },
            onFailed: async (job, error) => {
                const { chatId } = job.data;
                try {
                    await bot.telegram.sendMessage(chatId, `❌ Sorry, we couldn't process your document. Your wallet has been refunded.\n\nError: ${error.message}`);
                }
                catch (notifyError) {
                    logger_1.default.error('Failed to notify user of job failure:', notifyError);
                }
            }
        });
        logger_1.default.info('Job queue initialized');
        // Start file cleanup scheduler
        deliveryService.startCleanupScheduler(60 * 60 * 1000);
        logger_1.default.info('File cleanup scheduler started');
        // Register shutdown handlers
        (0, shutdown_1.registerShutdownHandlers)(async () => {
            logger_1.default.info('Shutting down...');
            await (0, bot_1.stopBot)(bot);
            (0, queue_1.shutdownJobQueue)();
            await (0, database_1.disconnectDatabase)();
            logger_1.default.info('Shutdown complete');
        });
        logger_1.default.info('Shutdown handlers registered');
        // Start the bot
        logger_1.default.info('Starting Telegram bot...');
        await (0, bot_1.startBot)(bot);
        logger_1.default.info('✅ eFayda ID Generator Bot is running successfully!');
        logger_1.default.info(`Environment: ${config_1.default.nodeEnv}`);
        logger_1.default.info(`Bot token: ${config_1.default.telegramBotToken.substring(0, 10)}...`);
    }
    catch (error) {
        logger_1.default.error('❌ Failed to start bot:', error);
        logger_1.default.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
        process.exit(1);
    }
}
main();
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger_1.default.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger_1.default.error('Uncaught Exception:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map