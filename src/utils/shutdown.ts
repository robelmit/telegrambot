import { disconnectDatabase } from './database';
import { closeRedisConnection } from './redis';
import { logger } from './logger';

type ShutdownCallback = () => Promise<void>;

const shutdownCallbacks: ShutdownCallback[] = [];
let isShuttingDown = false;

export function registerShutdownCallback(callback: ShutdownCallback): void {
  shutdownCallbacks.push(callback);
}

export async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.info('Shutdown already in progress...');
    return;
  }

  isShuttingDown = true;
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Set a timeout for forced shutdown
  const forceShutdownTimeout = setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 30000); // 30 seconds timeout

  try {
    // Execute all registered shutdown callbacks
    for (const callback of shutdownCallbacks) {
      try {
        await callback();
      } catch (error) {
        logger.error('Error in shutdown callback:', error);
      }
    }

    // Close database connection
    await disconnectDatabase();
    logger.info('Database connection closed');

    // Close Redis connection
    await closeRedisConnection();
    logger.info('Redis connection closed');

    clearTimeout(forceShutdownTimeout);
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    clearTimeout(forceShutdownTimeout);
    process.exit(1);
  }
}

export function setupShutdownHandlers(): void {
  // Handle SIGTERM (Docker, Kubernetes)
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  
  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
  });
}
