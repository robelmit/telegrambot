import Bull, { Queue, Job, JobOptions } from 'bull';
import { getRedisClient } from '../../utils/redis';
import logger from '../../utils/logger';

export interface IDGenerationJobData {
  jobId: string;
  userId: string;
  telegramId: number;
  pdfPath: string;
  chatId: number;
}

export interface JobQueueConfig {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
}

const DEFAULT_CONFIG: JobQueueConfig = {
  maxRetries: 3,
  retryDelay: 5000,  // 5 seconds
  timeout: 30000     // 30 seconds (as per requirements)
};

export class JobQueue {
  private queue: Queue<IDGenerationJobData>;
  private config: JobQueueConfig;

  constructor(queueName: string = 'id-generation', config?: Partial<JobQueueConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    const redisUrl = process.env.REDIS_URI || 'redis://localhost:6379';
    
    this.queue = new Bull<IDGenerationJobData>(queueName, redisUrl, {
      defaultJobOptions: {
        attempts: this.config.maxRetries,
        backoff: {
          type: 'exponential',
          delay: this.config.retryDelay
        },
        timeout: this.config.timeout,
        removeOnComplete: 100,  // Keep last 100 completed jobs
        removeOnFail: 50        // Keep last 50 failed jobs
      }
    });

    this.setupEventHandlers();
  }

  /**
   * Add a job to the queue
   */
  async addJob(data: IDGenerationJobData, options?: JobOptions): Promise<Job<IDGenerationJobData>> {
    const job = await this.queue.add(data, {
      ...options,
      jobId: data.jobId
    });
    
    logger.info(`Job added to queue: ${data.jobId}`);
    return job;
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<Job<IDGenerationJobData> | null> {
    return await this.queue.getJob(jobId);
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<string | null> {
    const job = await this.getJob(jobId);
    if (!job) return null;
    
    const state = await job.getState();
    return state;
  }

  /**
   * Get job progress
   */
  async getJobProgress(jobId: string): Promise<number> {
    const job = await this.getJob(jobId);
    if (!job) return 0;
    return job.progress() as number;
  }

  /**
   * Get job attempt count
   */
  async getJobAttempts(jobId: string): Promise<number> {
    const job = await this.getJob(jobId);
    if (!job) return 0;
    return job.attemptsMade;
  }

  /**
   * Check if job has exceeded retry limit
   */
  async hasExceededRetryLimit(jobId: string): Promise<boolean> {
    const attempts = await this.getJobAttempts(jobId);
    return attempts >= this.config.maxRetries;
  }

  /**
   * Register job processor
   */
  process(
    processor: (job: Job<IDGenerationJobData>) => Promise<void>,
    concurrency: number = 5
  ): void {
    this.queue.process(concurrency, async (job) => {
      logger.info(`Processing job: ${job.id}, attempt: ${job.attemptsMade + 1}`);
      
      try {
        await processor(job);
        logger.info(`Job completed: ${job.id}`);
      } catch (error) {
        logger.error(`Job failed: ${job.id}`, error);
        throw error;
      }
    });
  }

  /**
   * Set up event handlers
   */
  private setupEventHandlers(): void {
    this.queue.on('completed', (job) => {
      logger.info(`Job ${job.id} completed successfully`);
    });

    this.queue.on('failed', (job, error) => {
      logger.error(`Job ${job?.id} failed:`, error);
    });

    this.queue.on('stalled', (job) => {
      logger.warn(`Job ${job.id} stalled`);
    });

    this.queue.on('progress', (job, progress) => {
      logger.debug(`Job ${job.id} progress: ${progress}%`);
    });

    this.queue.on('error', (error) => {
      logger.error('Queue error:', error);
    });
  }

  /**
   * Register event handlers
   */
  onCompleted(handler: (job: Job<IDGenerationJobData>, result: any) => void): void {
    this.queue.on('completed', handler);
  }

  onFailed(handler: (job: Job<IDGenerationJobData>, error: Error) => void): void {
    this.queue.on('failed', handler);
  }

  onProgress(handler: (job: Job<IDGenerationJobData>, progress: number) => void): void {
    this.queue.on('progress', handler);
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount()
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Pause the queue
   */
  async pause(): Promise<void> {
    await this.queue.pause();
    logger.info('Queue paused');
  }

  /**
   * Resume the queue
   */
  async resume(): Promise<void> {
    await this.queue.resume();
    logger.info('Queue resumed');
  }

  /**
   * Close the queue
   */
  async close(): Promise<void> {
    await this.queue.close();
    logger.info('Queue closed');
  }

  /**
   * Clean old jobs
   */
  async clean(grace: number = 24 * 60 * 60 * 1000): Promise<void> {
    await this.queue.clean(grace, 'completed');
    await this.queue.clean(grace, 'failed');
    logger.info('Queue cleaned');
  }

  /**
   * Get the underlying Bull queue
   */
  getQueue(): Queue<IDGenerationJobData> {
    return this.queue;
  }

  /**
   * Get max retries config
   */
  getMaxRetries(): number {
    return this.config.maxRetries;
  }
}

export default JobQueue;
