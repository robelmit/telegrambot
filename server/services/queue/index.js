"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeJobQueue = initializeJobQueue;
exports.getJobQueue = getJobQueue;
exports.addJob = addJob;
exports.getJobStatus = getJobStatus;
exports.shutdownJobQueue = shutdownJobQueue;
const simpleQueue_1 = require("../../utils/simpleQueue");
const Job_1 = __importDefault(require("../../models/Job"));
const logger_1 = __importDefault(require("../../utils/logger"));
// Singleton queue instance
let jobQueue = null;
/**
 * Initialize the job queue system
 */
function initializeJobQueue(deps, concurrency = 3) {
    const servicePrice = parseInt(process.env.SERVICE_PRICE || '50', 10);
    jobQueue = new simpleQueue_1.SimpleQueue({
        concurrency,
        maxAttempts: 3,
        retryDelay: 5000
    });
    // Register processor
    jobQueue.process(async (job) => {
        const { jobId, pdfPath } = job.data;
        logger_1.default.info(`Processing job ${jobId} for user ${job.data.telegramId}`);
        // Update job status to processing
        await Job_1.default.findByIdAndUpdate(jobId, {
            status: 'processing',
            startedAt: new Date()
        });
        // Read PDF file
        const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
        const pdfBuffer = await fs.readFile(pdfPath);
        // Parse PDF and extract data
        const parseResult = await deps.pdfService.processDocument(pdfBuffer, 'document.pdf');
        if (!parseResult.isValid || !parseResult.data) {
            throw new Error(parseResult.errors?.join(', ') || 'Failed to parse PDF');
        }
        // Store extracted data
        await Job_1.default.findByIdAndUpdate(jobId, {
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
        await Job_1.default.findByIdAndUpdate(jobId, {
            status: 'completed',
            outputFiles: [
                { type: 'colorMirroredPng', path: generatedFiles.colorMirroredPng },
                { type: 'grayscaleMirroredPng', path: generatedFiles.grayscaleMirroredPng },
                { type: 'colorMirroredPdf', path: generatedFiles.colorMirroredPdf },
                { type: 'grayscaleMirroredPdf', path: generatedFiles.grayscaleMirroredPdf }
            ],
            completedAt: new Date()
        });
        logger_1.default.info(`Job ${jobId} completed successfully`);
    });
    // Handle completed jobs
    jobQueue.on('completed', async (job) => {
        if (deps.onComplete) {
            try {
                const jobDoc = await Job_1.default.findById(job.data.jobId);
                if (jobDoc?.outputFiles && jobDoc.outputFiles.length > 0) {
                    const files = jobDoc.outputFiles.map(f => f.path);
                    await deps.onComplete(job, files);
                }
            }
            catch (error) {
                logger_1.default.error('Error in onComplete callback:', error);
            }
        }
    });
    // Handle failed jobs
    jobQueue.on('failed', async (job, error) => {
        const { jobId, userId } = job.data;
        // Update job status
        await Job_1.default.findByIdAndUpdate(jobId, {
            status: 'failed',
            lastError: error.message,
            attempts: job.attempts
        });
        // Refund user
        try {
            await deps.walletService.refund(userId, servicePrice, jobId);
            logger_1.default.info(`Refunded ${servicePrice} ETB to user ${userId} for failed job ${jobId}`);
        }
        catch (refundError) {
            logger_1.default.error(`Failed to refund user ${userId}:`, refundError);
        }
        // Call failure callback
        if (deps.onFailed) {
            try {
                await deps.onFailed(job, error);
            }
            catch (callbackError) {
                logger_1.default.error('Error in onFailed callback:', callbackError);
            }
        }
    });
    logger_1.default.info('Job queue initialized (in-memory)');
    return jobQueue;
}
/**
 * Get the job queue instance
 */
function getJobQueue() {
    if (!jobQueue) {
        throw new Error('Job queue not initialized. Call initializeJobQueue first.');
    }
    return jobQueue;
}
/**
 * Add a job to the queue
 */
async function addJob(data) {
    const queue = getJobQueue();
    return queue.add(data.jobId, data);
}
/**
 * Get job status
 */
function getJobStatus(jobId) {
    const queue = getJobQueue();
    const job = queue.getJob(jobId);
    return job?.status;
}
/**
 * Shutdown the job queue
 */
function shutdownJobQueue() {
    if (jobQueue) {
        // Queue will stop processing when the process exits
        jobQueue = null;
        logger_1.default.info('Job queue shut down');
    }
}
//# sourceMappingURL=index.js.map