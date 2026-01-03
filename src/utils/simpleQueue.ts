import { EventEmitter } from 'events';
import logger from './logger';

export interface QueueJob<T> {
  id: string;
  data: T;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  createdAt: Date;
  processedAt?: Date;
}

export interface QueueOptions {
  concurrency?: number;
  maxAttempts?: number;
  retryDelay?: number;
}

/**
 * Simple in-memory job queue (no Redis required)
 */
export class SimpleQueue<T> extends EventEmitter {
  private jobs: Map<string, QueueJob<T>> = new Map();
  private pending: string[] = [];
  private processing: Set<string> = new Set();
  private processor?: (job: QueueJob<T>) => Promise<void>;
  private concurrency: number;
  private maxAttempts: number;
  private retryDelay: number;
  private isProcessing: boolean = false;

  constructor(options: QueueOptions = {}) {
    super();
    this.concurrency = options.concurrency || 3;
    this.maxAttempts = options.maxAttempts || 3;
    this.retryDelay = options.retryDelay || 5000;
  }

  /**
   * Add a job to the queue
   */
  async add(id: string, data: T): Promise<QueueJob<T>> {
    const job: QueueJob<T> = {
      id,
      data,
      attempts: 0,
      maxAttempts: this.maxAttempts,
      status: 'pending',
      createdAt: new Date()
    };

    this.jobs.set(id, job);
    this.pending.push(id);
    
    logger.info(`Job added to queue: ${id}`);
    this.emit('added', job);
    
    // Start processing if not already
    this.processNext();
    
    return job;
  }

  /**
   * Register job processor
   */
  process(processor: (job: QueueJob<T>) => Promise<void>): void {
    this.processor = processor;
    this.processNext();
  }

  /**
   * Process next jobs in queue
   */
  private async processNext(): Promise<void> {
    if (!this.processor || this.isProcessing) return;
    
    this.isProcessing = true;

    while (this.pending.length > 0 && this.processing.size < this.concurrency) {
      const jobId = this.pending.shift();
      if (!jobId) continue;

      const job = this.jobs.get(jobId);
      if (!job || job.status !== 'pending') continue;

      this.processing.add(jobId);
      this.processJob(job);
    }

    this.isProcessing = false;
  }

  /**
   * Process a single job
   */
  private async processJob(job: QueueJob<T>): Promise<void> {
    job.status = 'processing';
    job.attempts++;
    job.processedAt = new Date();

    logger.info(`Processing job ${job.id}, attempt ${job.attempts}/${job.maxAttempts}`);
    this.emit('processing', job);

    try {
      await this.processor!(job);
      
      job.status = 'completed';
      this.processing.delete(job.id);
      
      logger.info(`Job ${job.id} completed`);
      this.emit('completed', job);
    } catch (error) {
      const errorMessage = (error as Error).message;
      job.error = errorMessage;
      
      logger.error(`Job ${job.id} failed: ${errorMessage}`);

      if (job.attempts < job.maxAttempts) {
        // Retry after delay
        job.status = 'pending';
        this.processing.delete(job.id);
        
        setTimeout(() => {
          this.pending.push(job.id);
          this.processNext();
        }, this.retryDelay);
        
        this.emit('retry', job);
      } else {
        // Max attempts reached
        job.status = 'failed';
        this.processing.delete(job.id);
        
        logger.error(`Job ${job.id} permanently failed after ${job.attempts} attempts`);
        this.emit('failed', job, new Error(errorMessage));
      }
    }

    // Process next job
    this.processNext();
  }

  /**
   * Get job by ID
   */
  getJob(id: string): QueueJob<T> | undefined {
    return this.jobs.get(id);
  }

  /**
   * Get queue stats
   */
  getStats(): { pending: number; processing: number; completed: number; failed: number } {
    let completed = 0;
    let failed = 0;

    for (const job of this.jobs.values()) {
      if (job.status === 'completed') completed++;
      if (job.status === 'failed') failed++;
    }

    return {
      pending: this.pending.length,
      processing: this.processing.size,
      completed,
      failed
    };
  }

  /**
   * Clear completed/failed jobs older than specified age
   */
  cleanup(maxAgeMs: number = 60 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, job] of this.jobs) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        now - job.createdAt.getTime() > maxAgeMs
      ) {
        this.jobs.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get max attempts setting
   */
  getMaxAttempts(): number {
    return this.maxAttempts;
  }
}

export default SimpleQueue;
