"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerShutdownCallback = registerShutdownCallback;
exports.gracefulShutdown = gracefulShutdown;
exports.setupShutdownHandlers = setupShutdownHandlers;
exports.registerShutdownHandlers = registerShutdownHandlers;
const database_1 = require("./database");
const logger_1 = require("./logger");
const shutdownCallbacks = [];
let isShuttingDown = false;
function registerShutdownCallback(callback) {
    shutdownCallbacks.push(callback);
}
async function gracefulShutdown(signal) {
    if (isShuttingDown) {
        logger_1.logger.info('Shutdown already in progress...');
        return;
    }
    isShuttingDown = true;
    logger_1.logger.info(`Received ${signal}. Starting graceful shutdown...`);
    // Set a timeout for forced shutdown
    const forceShutdownTimeout = setTimeout(() => {
        logger_1.logger.error('Forced shutdown due to timeout');
        process.exit(1);
    }, 30000); // 30 seconds timeout
    try {
        // Execute all registered shutdown callbacks
        for (const callback of shutdownCallbacks) {
            try {
                await callback();
            }
            catch (error) {
                logger_1.logger.error('Error in shutdown callback:', error);
            }
        }
        // Close database connection
        await (0, database_1.disconnectDatabase)();
        logger_1.logger.info('Database connection closed');
        clearTimeout(forceShutdownTimeout);
        logger_1.logger.info('Graceful shutdown completed');
        process.exit(0);
    }
    catch (error) {
        logger_1.logger.error('Error during graceful shutdown:', error);
        clearTimeout(forceShutdownTimeout);
        process.exit(1);
    }
}
function setupShutdownHandlers() {
    // Handle SIGTERM (Docker, Kubernetes)
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        logger_1.logger.error('Uncaught Exception:', error);
        gracefulShutdown('uncaughtException');
    });
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        logger_1.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        gracefulShutdown('unhandledRejection');
    });
}
function registerShutdownHandlers(callback) {
    registerShutdownCallback(callback);
    setupShutdownHandlers();
}
//# sourceMappingURL=shutdown.js.map