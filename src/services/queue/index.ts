export { JobQueue, IDGenerationJobData, JobQueueConfig } from './jobQueue';
export { JobProcessor, JobProcessorDependencies } from './jobProcessor';

import { JobQueue } from './jobQueue';
import { JobProcessor, JobProcessorDependencies } from './jobProcessor';
import { Job } from 'bull';
import { IDGenerationJobData } from './jobQueue';
import logger from '../../utils/logger';

// Singleton instances
let jobQueueInstance: JobQueue | null = null;
let jobProcessorInstance: JobProcessor | null = null;

/**
 * Initialize the job queue system
 */
export function initializeJobQueue(
  processorDeps: JobProcessorDependencies,
  concurrency: number = 5
): { queue: JobQueue; processor: JobProcessor } {
  // Create queue
  jobQueueInstance = new JobQueue('id-generation', {
    maxRetries: 3,
    retryDelay: 5000,
    timeout: 30000
  });

  // Create processor
  jobProcessorInstance = new JobProcessor(processorDeps);

  // Register processor with queue
  jobQueueInstance.process(
    jobProcessorInstance.createProcessor(),
    concurrency
  );

  logger.info('Job queue system initialized');

  return {
    queue: jobQueueInstance,
    processor: jobProcessorInstance
  };
}

/**
 * Get the job queue instance
 */
export function getJobQueue(): JobQueue {
  if (!jobQueueInstance) {
    throw new Error('Job queue not initialized. Call initializeJobQueue first.');
  }
  return jobQueueInstance;
}

/**
 * Get the job processor instance
 */
export function getJobProcessor(): JobProcessor {
  if (!jobProcessorInstance) {
    throw new Error('Job processor not initialized. Call initializeJobQueue first.');
  }
  return jobProcessorInstance;
}

/**
 * Shutdown the job queue system
 */
export async function shutdownJobQueue(): Promise<void> {
  if (jobQueueInstance) {
    await jobQueueInstance.close();
    jobQueueInstance = null;
    jobProcessorInstance = null;
    logger.info('Job queue system shut down');
  }
}
