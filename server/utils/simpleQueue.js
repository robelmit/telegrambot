"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleQueue = void 0;
const events_1 = require("events");
const logger_1 = __importDefault(require("./logger"));
/**
 * Simple in-memory job queue (no Redis required)
 */
class SimpleQueue extends events_1.EventEmitter {
    jobs = new Map();
    pending = [];
    processing = new Set();
    processor;
    concurrency;
    maxAttempts;
    retryDelay;
    isProcessing = false;
    constructor(options = {}) {
        super();
        this.concurrency = options.concurrency || 3;
        this.maxAttempts = options.maxAttempts || 3;
        this.retryDelay = options.retryDelay || 5000;
    }
    /**
     * Add a job to the queue
     */
    async add(id, data) {
        const job = {
            id,
            data,
            attempts: 0,
            maxAttempts: this.maxAttempts,
            status: 'pending',
            createdAt: new Date()
        };
        this.jobs.set(id, job);
        this.pending.push(id);
        logger_1.default.info(`Job added to queue: ${id}`);
        this.emit('added', job);
        // Start processing if not already
        this.processNext();
        return job;
    }
    /**
     * Register job processor
     */
    process(processor) {
        this.processor = processor;
        this.processNext();
    }
    /**
     * Process next jobs in queue
     */
    async processNext() {
        if (!this.processor || this.isProcessing)
            return;
        this.isProcessing = true;
        while (this.pending.length > 0 && this.processing.size < this.concurrency) {
            const jobId = this.pending.shift();
            if (!jobId)
                continue;
            const job = this.jobs.get(jobId);
            if (!job || job.status !== 'pending')
                continue;
            this.processing.add(jobId);
            this.processJob(job);
        }
        this.isProcessing = false;
    }
    /**
     * Process a single job
     */
    async processJob(job) {
        job.status = 'processing';
        job.attempts++;
        job.processedAt = new Date();
        logger_1.default.info(`Processing job ${job.id}, attempt ${job.attempts}/${job.maxAttempts}`);
        this.emit('processing', job);
        try {
            await this.processor(job);
            job.status = 'completed';
            this.processing.delete(job.id);
            logger_1.default.info(`Job ${job.id} completed`);
            this.emit('completed', job);
        }
        catch (error) {
            const errorMessage = error.message;
            job.error = errorMessage;
            logger_1.default.error(`Job ${job.id} failed: ${errorMessage}`);
            if (job.attempts < job.maxAttempts) {
                // Retry after delay
                job.status = 'pending';
                this.processing.delete(job.id);
                setTimeout(() => {
                    this.pending.push(job.id);
                    this.processNext();
                }, this.retryDelay);
                this.emit('retry', job);
            }
            else {
                // Max attempts reached
                job.status = 'failed';
                this.processing.delete(job.id);
                logger_1.default.error(`Job ${job.id} permanently failed after ${job.attempts} attempts`);
                this.emit('failed', job, new Error(errorMessage));
            }
        }
        // Process next job
        this.processNext();
    }
    /**
     * Get job by ID
     */
    getJob(id) {
        return this.jobs.get(id);
    }
    /**
     * Get queue stats
     */
    getStats() {
        let completed = 0;
        let failed = 0;
        for (const job of this.jobs.values()) {
            if (job.status === 'completed')
                completed++;
            if (job.status === 'failed')
                failed++;
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
    cleanup(maxAgeMs = 60 * 60 * 1000) {
        const now = Date.now();
        let cleaned = 0;
        for (const [id, job] of this.jobs) {
            if ((job.status === 'completed' || job.status === 'failed') &&
                now - job.createdAt.getTime() > maxAgeMs) {
                this.jobs.delete(id);
                cleaned++;
            }
        }
        return cleaned;
    }
    /**
     * Get max attempts setting
     */
    getMaxAttempts() {
        return this.maxAttempts;
    }
}
exports.SimpleQueue = SimpleQueue;
exports.default = SimpleQueue;
//# sourceMappingURL=simpleQueue.js.map