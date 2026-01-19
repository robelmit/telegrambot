import { SimpleQueue, QueueJob } from '../../utils/simpleQueue';
import { PDFService } from '../pdf';
import { IDGeneratorService } from '../generator';
import { WalletService } from '../payment';
import { PDFGenerator } from '../generator/pdfGenerator';
import JobModel from '../../models/Job';
import logger from '../../utils/logger';
import path from 'path';
import fs from 'fs/promises';

export type TemplateType = 'template0' | 'template1' | 'template2';

export interface IDGenerationJobData {
  jobId: string;
  userId: string;
  telegramId: number;
  pdfPath: string;
  chatId: number;
  template?: TemplateType;
  // Bulk processing fields
  isBulk?: boolean;
  bulkGroupId?: string;
  bulkBatchIndex?: number;
  bulkIndexInBatch?: number;
  bulkTotalFiles?: number;
  bulkFilesPerPdf?: number;
}

export interface JobProcessorDependencies {
  pdfService: PDFService;
  idGenerator: IDGeneratorService;
  walletService: WalletService;
  pdfGenerator?: PDFGenerator;
  onComplete?: (job: QueueJob<IDGenerationJobData>, files: string[]) => Promise<void>;
  onBulkBatchComplete?: (bulkGroupId: string, batchIndex: number, combinedFiles: string[], chatId: number, telegramId: number) => Promise<void>;
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

  // Initialize PDF generator if not provided
  if (!deps.pdfGenerator) {
    deps.pdfGenerator = new PDFGenerator();
  }

  jobQueue = new SimpleQueue<IDGenerationJobData>({
    concurrency,
    maxAttempts: 3,
    retryDelay: 5000
  });

  // Register processor
  jobQueue.process(async (job) => {
    const { jobId, pdfPath, template, isBulk, bulkGroupId, bulkBatchIndex, bulkTotalFiles, bulkFilesPerPdf } = job.data;
    
    logger.info(`Processing job ${jobId} for user ${job.data.telegramId} with template ${template || 'template0'}${isBulk ? ` (bulk: ${bulkGroupId})` : ''}`);

    // Update job status to processing
    await JobModel.findByIdAndUpdate(jobId, { 
      status: 'processing',
      startedAt: new Date()
    });

    // Read PDF file
    const pdfBuffer = await fs.readFile(pdfPath);

    // Parse PDF and extract data
    const parseResult = await deps.pdfService.processDocument(pdfBuffer, 'document.pdf');
    
    if (!parseResult.isValid || !parseResult.data) {
      throw new Error(parseResult.errors?.join(', ') || 'Failed to parse PDF');
    }

    // Store extracted data
    await JobModel.findByIdAndUpdate(jobId, {
      extractedData: parseResult.data
    });

    // Generate ID cards with selected template
    const generatedFiles = await deps.idGenerator.generateAll(parseResult.data, jobId, template);

    // Verify all files exist
    const filesExist = await deps.idGenerator.verifyFiles(generatedFiles);
    if (!filesExist) {
      throw new Error('Generated files verification failed');
    }

    // Update job with output files
    await JobModel.findByIdAndUpdate(jobId, {
      status: 'completed',
      outputFiles: [
        { type: 'colorNormalPng', path: generatedFiles.colorNormalPng },
        { type: 'colorMirroredPng', path: generatedFiles.colorMirroredPng },
        { type: 'colorNormalPdf', path: generatedFiles.colorNormalPdf },
        { type: 'colorMirroredPdf', path: generatedFiles.colorMirroredPdf }
      ],
      completedAt: new Date()
    });

    // Handle bulk job tracking
    if (isBulk && bulkGroupId && bulkBatchIndex !== undefined && bulkTotalFiles && bulkFilesPerPdf) {
      await trackBulkJobCompletion(
        bulkGroupId,
        bulkBatchIndex,
        bulkTotalFiles,
        bulkFilesPerPdf,
        generatedFiles.colorNormalPng,
        job.data.chatId,
        job.data.telegramId,
        deps,
        generatedFiles.colorMirroredPng  // Pass mirrored PNG path too
      );
    }

    logger.info(`Job ${jobId} completed successfully`);
  });

  // Handle completed jobs
  jobQueue.on('completed', async (job: QueueJob<IDGenerationJobData>) => {
    // Skip bulk jobs - they're handled by trackBulkJobCompletion
    if (job.data.isBulk) {
      return;
    }

    if (deps.onComplete) {
      try {
        const jobDoc = await JobModel.findById(job.data.jobId);
        if (jobDoc?.outputFiles && jobDoc.outputFiles.length > 0) {
          const files = jobDoc.outputFiles.map(f => f.path);
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

// Track bulk job files - stores both normal and mirrored PNG paths
const bulkJobFiles = new Map<string, {
  totalFiles: number;
  completedFiles: number;
  filesPerPdf: number;
  batches: Map<number, { normal: string[]; mirrored: string[] }>;
  allNormalPngs: string[];  // Track all normal PNGs for final combined PDF
  allMirroredPngs: string[];  // Track all mirrored PNGs for final combined PDF
  chatId: number;
  telegramId: number;
}>();

/**
 * Track bulk job completion and generate combined PDFs when batch is complete
 * Generates both normal and mirrored PDFs for each batch
 * Also generates final combined PDFs with ALL cards when all jobs complete
 */
async function trackBulkJobCompletion(
  bulkGroupId: string,
  batchIndex: number,
  totalFiles: number,
  filesPerPdf: number,
  colorNormalPngPath: string,
  chatId: number,
  telegramId: number,
  deps: JobProcessorDependencies,
  colorMirroredPngPath?: string
): Promise<void> {
  // Initialize tracker if needed
  if (!bulkJobFiles.has(bulkGroupId)) {
    bulkJobFiles.set(bulkGroupId, {
      totalFiles,
      completedFiles: 0,
      filesPerPdf,
      batches: new Map(),
      allNormalPngs: [],
      allMirroredPngs: [],
      chatId,
      telegramId
    });
  }

  const tracker = bulkJobFiles.get(bulkGroupId)!;
  tracker.completedFiles++;

  // Add to overall tracking for final combined PDFs
  tracker.allNormalPngs.push(colorNormalPngPath);
  if (colorMirroredPngPath) {
    tracker.allMirroredPngs.push(colorMirroredPngPath);
  }

  // Add to batch (both normal and mirrored)
  if (!tracker.batches.has(batchIndex)) {
    tracker.batches.set(batchIndex, { normal: [], mirrored: [] });
  }
  const batch = tracker.batches.get(batchIndex)!;
  batch.normal.push(colorNormalPngPath);
  if (colorMirroredPngPath) {
    batch.mirrored.push(colorMirroredPngPath);
  }

  logger.info(`Bulk ${bulkGroupId}: ${tracker.completedFiles}/${tracker.totalFiles} completed, batch ${batchIndex}`);

  // Check if batch is complete
  const filesInThisBatch = Math.min(filesPerPdf, totalFiles - (batchIndex * filesPerPdf));

  if (batch.normal.length === filesInThisBatch) {
    // Batch complete - generate combined PDFs (normal and mirrored)
    try {
      const outputDir = process.env.OUTPUT_DIR || 'temp';
      
      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });
      
      const normalPdfPath = path.join(outputDir, `${bulkGroupId}_batch${batchIndex + 1}_normal.pdf`);
      const mirroredPdfPath = path.join(outputDir, `${bulkGroupId}_batch${batchIndex + 1}_mirrored.pdf`);

      // Generate normal PDF
      await deps.pdfGenerator!.generateCombinedPDF(batch.normal, normalPdfPath, {
        title: `Bulk ID Cards - Batch ${batchIndex + 1} (Normal)`
      });
      logger.info(`Generated normal PDF for batch ${batchIndex + 1}: ${normalPdfPath}`);

      // Generate mirrored PDF if we have mirrored files
      const combinedFiles = [normalPdfPath];
      if (batch.mirrored.length === filesInThisBatch) {
        await deps.pdfGenerator!.generateCombinedPDF(batch.mirrored, mirroredPdfPath, {
          title: `Bulk ID Cards - Batch ${batchIndex + 1} (Mirrored for Printing)`
        });
        logger.info(`Generated mirrored PDF for batch ${batchIndex + 1}: ${mirroredPdfPath}`);
        combinedFiles.push(mirroredPdfPath);
      }

      // Notify via callback
      if (deps.onBulkBatchComplete) {
        await deps.onBulkBatchComplete(bulkGroupId, batchIndex, combinedFiles, chatId, telegramId);
      }
    } catch (error) {
      logger.error(`Failed to generate combined PDFs for batch ${batchIndex}:`, error);
    }
  }

  // Check if ALL jobs are complete - generate final combined PDFs
  if (tracker.completedFiles === tracker.totalFiles) {
    try {
      const outputDir = process.env.OUTPUT_DIR || 'temp';
      await fs.mkdir(outputDir, { recursive: true });
      
      const finalNormalPdfPath = path.join(outputDir, `${bulkGroupId}_ALL_NORMAL.pdf`);
      const finalMirroredPdfPath = path.join(outputDir, `${bulkGroupId}_ALL_MIRRORED.pdf`);

      // Generate final combined normal PDF with ALL cards
      await deps.pdfGenerator!.generateBulkNormalPDF(tracker.allNormalPngs, finalNormalPdfPath, {
        title: `All ID Cards - Normal (${tracker.totalFiles} cards)`
      });
      logger.info(`Generated FINAL combined normal PDF: ${finalNormalPdfPath}`);

      // Generate final combined mirrored PDF with ALL cards
      if (tracker.allMirroredPngs.length === tracker.totalFiles) {
        await deps.pdfGenerator!.generateBulkMirroredPDF(tracker.allMirroredPngs, finalMirroredPdfPath, {
          title: `All ID Cards - Mirrored for Printing (${tracker.totalFiles} cards)`
        });
        logger.info(`Generated FINAL combined mirrored PDF: ${finalMirroredPdfPath}`);
      }

      // Notify via callback with final combined files
      if (deps.onBulkBatchComplete) {
        const finalFiles = [finalNormalPdfPath];
        if (tracker.allMirroredPngs.length === tracker.totalFiles) {
          finalFiles.push(finalMirroredPdfPath);
        }
        await deps.onBulkBatchComplete(bulkGroupId, -1, finalFiles, chatId, telegramId);
      }
    } catch (error) {
      logger.error(`Failed to generate FINAL combined PDFs:`, error);
    }

    // Cleanup tracker when all files are done
    setTimeout(() => {
      bulkJobFiles.delete(bulkGroupId);
      logger.info(`Bulk job ${bulkGroupId} fully completed and cleaned up`);
    }, 5000);
  }
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
