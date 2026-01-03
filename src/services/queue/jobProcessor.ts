import { Job } from 'bull';
import { IDGenerationJobData } from './jobQueue';
import { PDFService } from '../pdf';
import { IDGeneratorService } from '../generator';
import { WalletService } from '../payment';
import JobModel from '../../models/Job';
import User from '../../models/User';
import logger from '../../utils/logger';
import fs from 'fs/promises';

export interface JobProcessorDependencies {
  pdfService: PDFService;
  idGenerator: IDGeneratorService;
  walletService: WalletService;
  onComplete?: (job: Job<IDGenerationJobData>, files: string[]) => Promise<void>;
  onFailed?: (job: Job<IDGenerationJobData>, error: Error) => Promise<void>;
}

export class JobProcessor {
  private pdfService: PDFService;
  private idGenerator: IDGeneratorService;
  private walletService: WalletService;
  private onComplete?: (job: Job<IDGenerationJobData>, files: string[]) => Promise<void>;
  private onFailed?: (job: Job<IDGenerationJobData>, error: Error) => Promise<void>;
  private servicePrice: number;

  constructor(deps: JobProcessorDependencies) {
    this.pdfService = deps.pdfService;
    this.idGenerator = deps.idGenerator;
    this.walletService = deps.walletService;
    this.onComplete = deps.onComplete;
    this.onFailed = deps.onFailed;
    this.servicePrice = parseInt(process.env.SERVICE_PRICE || '50', 10);
  }

  /**
   * Process a job
   */
  async process(job: Job<IDGenerationJobData>): Promise<void> {
    const { jobId, userId, pdfPath, telegramId, chatId } = job.data;
    
    logger.info(`Processing job ${jobId} for user ${telegramId}`);

    try {
      // Update job status to processing
      await this.updateJobStatus(jobId, 'processing');
      job.progress(10);

      // Step 1: Read and validate PDF
      const pdfBuffer = await fs.readFile(pdfPath);
      job.progress(20);

      // Step 2: Parse PDF and extract data
      const parseResult = await this.pdfService.parseAndExtract(pdfBuffer);
      
      if (!parseResult.isValid || !parseResult.data) {
        throw new Error(parseResult.errors?.join(', ') || 'Failed to parse PDF');
      }
      job.progress(40);

      // Step 3: Store extracted data
      await JobModel.findByIdAndUpdate(jobId, {
        extractedData: parseResult.data
      });
      job.progress(50);

      // Step 4: Generate ID cards
      const generatedFiles = await this.idGenerator.generateAll(parseResult.data, jobId);
      job.progress(80);

      // Step 5: Verify all files exist
      const filesExist = await this.idGenerator.verifyFiles(generatedFiles);
      if (!filesExist) {
        throw new Error('Generated files verification failed');
      }
      job.progress(90);

      // Step 6: Update job with output files
      await JobModel.findByIdAndUpdate(jobId, {
        status: 'completed',
        outputFiles: generatedFiles,
        completedAt: new Date()
      });
      job.progress(100);

      // Step 7: Trigger delivery callback
      if (this.onComplete) {
        const filePaths = [
          generatedFiles.colorMirroredPng,
          generatedFiles.grayscaleMirroredPng,
          generatedFiles.colorMirroredPdf,
          generatedFiles.grayscaleMirroredPdf
        ];
        await this.onComplete(job, filePaths);
      }

      logger.info(`Job ${jobId} completed successfully`);
    } catch (error) {
      logger.error(`Job ${jobId} failed:`, error);
      
      // Update job status
      await this.updateJobStatus(jobId, 'failed', (error as Error).message);
      
      // Check if this is the final attempt
      if (job.attemptsMade >= (job.opts.attempts || 3) - 1) {
        // Refund the user on permanent failure
        await this.refundUser(userId, jobId);
        
        // Trigger failure callback
        if (this.onFailed) {
          await this.onFailed(job, error as Error);
        }
      }
      
      throw error;
    }
  }

  /**
   * Update job status in database
   */
  private async updateJobStatus(
    jobId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    error?: string
  ): Promise<void> {
    const update: any = { status };
    
    if (status === 'failed' && error) {
      update.$inc = { attempts: 1 };
      update.lastError = error;
    }
    
    if (status === 'processing') {
      update.startedAt = new Date();
    }
    
    await JobModel.findByIdAndUpdate(jobId, update);
  }

  /**
   * Refund user on permanent job failure
   */
  private async refundUser(userId: string, jobId: string): Promise<void> {
    try {
      await this.walletService.refund(userId, this.servicePrice, jobId);
      logger.info(`Refunded ${this.servicePrice} ETB to user ${userId} for failed job ${jobId}`);
    } catch (error) {
      logger.error(`Failed to refund user ${userId}:`, error);
    }
  }

  /**
   * Create processor function for Bull queue
   */
  createProcessor(): (job: Job<IDGenerationJobData>) => Promise<void> {
    return this.process.bind(this);
  }
}

export default JobProcessor;
