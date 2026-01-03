import { SimpleQueue, QueueJob } from '../../utils/simpleQueue';
import { PDFService } from '../pdf';
import { IDGeneratorService } from '../generator';
import { WalletService } from '../payment';
import JobModel from '../../models/Job';
import logger from '../../utils/logger';

export interface IDGenerationJobData {
  jobId: string;
  userId: string;
  telegramId: number;
  pdfPath: string;
  chatId: number;
}

export interface JobProcessorDependencies {
  pdfService: PDFService;
  idGenerator: IDGeneratorService;
  walletService: WalletService;
  onComplete?: (job: QueueJob<IDGenerationJobData>, files: string[]) => Promise<void>;
  onFailed?: (job: QueueJob<IDGenerationJobData>, error: Error) => Promise<void>;
}

// Singleton queue instance
let jobQueue: SimpleQueue<IDGenerationJobData> | null = null;

/**
 * Initialize the job queue system
 */
export function initializeJobQueue(
  deps: JobProcessorDependencies,
  concurrency: number = 3
): SimpleQueue<IDGenerationJobData> {
  const servicePrice = parseInt(process.env.SERVICE_PRICE || '50', 10);

  jobQueue = new SimpleQueue<IDGenerationJobData>({
    concurrency,
    maxAttempts: 3,
    retryDelay: 5000
  });

  // Register processor
  jobQueue.process(async (job) => {
    const { jobId, userId, pdfPath } = job.data;
    
    logger.info(`Processing job ${jobId} for user ${job.data.telegramId}`);

    // Update job status to processing
    await JobModel.findByIdAndUpdate(jobId, { 
      status: 'processing',
      startedAt: new Date()
    });

    // Read PDF file
    const fs = await import('fs/promises');
    const pdfBuffer = await fs.readFile(pdfPath);

    // Parse PDF and extract data
    const parseResult = await deps.pdfService.parseAndExtract(pdfBuffer);
    
    if (!parseResult.isValid || !parseResult.data) {
      throw new Error(parseResult.errors?.join(', ') || 'Failed to parse PDF');
    }

    // Store extracted data
    await JobModel.findByIdAndUpdate(jobId, {
      extractedData: parseResult.data
    });

    // Generate ID cards
    const generatedFiles = await deps.idGenerator.generateAll(parseResult.data, jobId);

    // Verify all files exist
    const filesExist = await deps.idGenerator.verifyFiles(generatedFiles);
    if (!filesExist) {
      throw new Error('Generated files verification failed');
    }

    // Update job with output files
    await JobModel.findByIdAndUpdate(jobId, {
      status: 'completed',
      outputFiles: generatedFiles,
      completedAt: new Date()
    });

    logger.info(`Job ${jobId} completed successfully`);
  });

  // Handle completed jobs
  jobQueue.on('completed', async (job: QueueJob<IDGenerationJobData>) => {
    if (deps.onComplete) {
      try {
        const jobDoc = await JobModel.findById(job.data.jobId);
        if (jobDoc?.outputFiles) {
          const files = [
            jobDoc.outputFiles.colorMirroredPng,
            jobDoc.outputFiles.grayscaleMirroredPng,
            jobDoc.outputFiles.colorMirroredPdf,
            jobDoc.outputFiles.grayscaleMirroredPdf
          ];
          await deps.onComplete(job, files);
        }
      } catch (error) {
        logger.error('Error in onComplete callback:', error);
      }
    }
  });

  // Handle failed jobs
  jobQueue.on('failed', async (job: QueueJob<IDGenerationJobData>, error: Error) => {
    const { jobId, userId } = job.data;

    // Update job status
    await JobModel.findByIdAndUpdate(jobId, {
      status: 'failed',
      lastError: error.message,
      attempts: job.attempts
    });

    // Refund user
    try {
      await deps.walletService.refund(userId, servicePrice, jobId);
      logger.info(`Refunded ${servicePrice} ETB to user ${userId} for failed job ${jobId}`);
    } catch (refundError) {
      logger.error(`Failed to refund user ${userId}:`, refundError);
    }

    // Call failure callback
    if (deps.onFailed) {
      try {
        await deps.onFailed(job, error);
      } catch (callbackError) {
        logger.error('Error in onFailed callback:', callbackError);
      }
    }
  });

  logger.info('Job queue initialized (in-memory)');
  return jobQueue;
}

/**
 * Get the job queue instance
 */
export function getJobQueue(): SimpleQueue<IDGenerationJobData> {
  if (!jobQueue) {
    throw new Error('Job queue not initialized. Call initializeJobQueue first.');
  }
  return jobQueue;
}

/**
 * Add a job to the queue
 */
export async function addJob(data: IDGenerationJobData): Promise<QueueJob<IDGenerationJobData>> {
  const queue = getJobQueue();
  return queue.add(data.jobId, data);
}

/**
 * Get job status
 */
export function getJobStatus(jobId: string): string | undefined {
  const queue = getJobQueue();
  const job = queue.getJob(jobId);
  return job?.status;
}

/**
 * Shutdown the job queue
 */
export function shutdownJobQueue(): void {
  if (jobQueue) {
    // Queue will stop processing when the process exits
    jobQueue = null;
    logger.info('Job queue shut down');
  }
}
