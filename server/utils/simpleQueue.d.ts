import { EventEmitter } from 'events';
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
export declare class SimpleQueue<T> extends EventEmitter {
    private jobs;
    private pending;
    private processing;
    private processor?;
    private concurrency;
    private maxAttempts;
    private retryDelay;
    private isProcessing;
    constructor(options?: QueueOptions);
    /**
     * Add a job to the queue
     */
    add(id: string, data: T): Promise<QueueJob<T>>;
    /**
     * Register job processor
     */
    process(processor: (job: QueueJob<T>) => Promise<void>): void;
    /**
     * Process next jobs in queue
     */
    private processNext;
    /**
     * Process a single job
     */
    private processJob;
    /**
     * Get job by ID
     */
    getJob(id: string): QueueJob<T> | undefined;
    /**
     * Get queue stats
     */
    getStats(): {
        pending: number;
        processing: number;
        completed: number;
        failed: number;
    };
    /**
     * Clear completed/failed jobs older than specified age
     */
    cleanup(maxAgeMs?: number): number;
    /**
     * Get max attempts setting
     */
    getMaxAttempts(): number;
}
export default SimpleQueue;
//# sourceMappingURL=simpleQueue.d.ts.map