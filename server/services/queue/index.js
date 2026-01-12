"use strict";
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
const pdfGenerator_1 = require("../generator/pdfGenerator");
const Job_1 = __importDefault(require("../../models/Job"));
const logger_1 = __importDefault(require("../../utils/logger"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
// Singleton queue instance
let jobQueue = null;
/**
 * Initialize the job queue system
 */
function initializeJobQueue(deps, concurrency = 3) {
    const servicePrice = parseInt(process.env.SERVICE_PRICE || '50', 10);
    // Initialize PDF generator if not provided
    if (!deps.pdfGenerator) {
        deps.pdfGenerator = new pdfGenerator_1.PDFGenerator();
    }
    jobQueue = new simpleQueue_1.SimpleQueue({
        concurrency,
        maxAttempts: 3,
        retryDelay: 5000
    });
    // Register processor
    jobQueue.process(async (job) => {
        const { jobId, pdfPath, template, isBulk, bulkGroupId, bulkBatchIndex, bulkTotalFiles, bulkFilesPerPdf } = job.data;
        logger_1.default.info(`Processing job ${jobId} for user ${job.data.telegramId} with template ${template || 'template0'}${isBulk ? ` (bulk: ${bulkGroupId})` : ''}`);
        // Update job status to processing
        await Job_1.default.findByIdAndUpdate(jobId, {
            status: 'processing',
            startedAt: new Date()
        });
        // Read PDF file
        const pdfBuffer = await promises_1.default.readFile(pdfPath);
        // Parse PDF and extract data
        const parseResult = await deps.pdfService.processDocument(pdfBuffer, 'document.pdf');
        if (!parseResult.isValid || !parseResult.data) {
            throw new Error(parseResult.errors?.join(', ') || 'Failed to parse PDF');
        }
        // Store extracted data
        await Job_1.default.findByIdAndUpdate(jobId, {
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
        await Job_1.default.findByIdAndUpdate(jobId, {
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
            await trackBulkJobCompletion(bulkGroupId, bulkBatchIndex, bulkTotalFiles, bulkFilesPerPdf, generatedFiles.colorNormalPng, job.data.chatId, job.data.telegramId, deps, generatedFiles.colorMirroredPng // Pass mirrored PNG path too
            );
        }
        logger_1.default.info(`Job ${jobId} completed successfully`);
    });
    // Handle completed jobs
    jobQueue.on('completed', async (job) => {
        // Skip bulk jobs - they're handled by trackBulkJobCompletion
        if (job.data.isBulk) {
            return;
        }
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
// Track bulk job files - stores both normal and mirrored PNG paths
const bulkJobFiles = new Map();
/**
 * Track bulk job completion and generate combined PDFs when batch is complete
 * Generates both normal and mirrored PDFs for each batch
 */
async function trackBulkJobCompletion(bulkGroupId, batchIndex, totalFiles, filesPerPdf, colorNormalPngPath, chatId, telegramId, deps, colorMirroredPngPath) {
    // Initialize tracker if needed
    if (!bulkJobFiles.has(bulkGroupId)) {
        bulkJobFiles.set(bulkGroupId, {
            totalFiles,
            completedFiles: 0,
            filesPerPdf,
            batches: new Map(),
            chatId,
            telegramId
        });
    }
    const tracker = bulkJobFiles.get(bulkGroupId);
    tracker.completedFiles++;
    // Add to batch (both normal and mirrored)
    if (!tracker.batches.has(batchIndex)) {
        tracker.batches.set(batchIndex, { normal: [], mirrored: [] });
    }
    const batch = tracker.batches.get(batchIndex);
    batch.normal.push(colorNormalPngPath);
    if (colorMirroredPngPath) {
        batch.mirrored.push(colorMirroredPngPath);
    }
    logger_1.default.info(`Bulk ${bulkGroupId}: ${tracker.completedFiles}/${tracker.totalFiles} completed, batch ${batchIndex}`);
    // Check if batch is complete
    const filesInThisBatch = Math.min(filesPerPdf, totalFiles - (batchIndex * filesPerPdf));
    if (batch.normal.length === filesInThisBatch) {
        // Batch complete - generate combined PDFs (normal and mirrored)
        try {
            const outputDir = process.env.OUTPUT_DIR || 'temp';
            // Ensure output directory exists
            await promises_1.default.mkdir(outputDir, { recursive: true });
            const normalPdfPath = path_1.default.join(outputDir, `${bulkGroupId}_batch${batchIndex + 1}_normal.pdf`);
            const mirroredPdfPath = path_1.default.join(outputDir, `${bulkGroupId}_batch${batchIndex + 1}_mirrored.pdf`);
            // Generate normal PDF
            await deps.pdfGenerator.generateCombinedPDF(batch.normal, normalPdfPath, {
                title: `Bulk ID Cards - Batch ${batchIndex + 1} (Normal)`
            });
            logger_1.default.info(`Generated normal PDF for batch ${batchIndex + 1}: ${normalPdfPath}`);
            // Generate mirrored PDF if we have mirrored files
            const combinedFiles = [normalPdfPath];
            if (batch.mirrored.length === filesInThisBatch) {
                await deps.pdfGenerator.generateCombinedPDF(batch.mirrored, mirroredPdfPath, {
                    title: `Bulk ID Cards - Batch ${batchIndex + 1} (Mirrored for Printing)`
                });
                logger_1.default.info(`Generated mirrored PDF for batch ${batchIndex + 1}: ${mirroredPdfPath}`);
                combinedFiles.push(mirroredPdfPath);
            }
            // Notify via callback
            if (deps.onBulkBatchComplete) {
                await deps.onBulkBatchComplete(bulkGroupId, batchIndex, combinedFiles, chatId, telegramId);
            }
        }
        catch (error) {
            logger_1.default.error(`Failed to generate combined PDFs for batch ${batchIndex}:`, error);
        }
    }
    // Cleanup tracker when all files are done
    if (tracker.completedFiles === tracker.totalFiles) {
        // Small delay to ensure all callbacks complete
        setTimeout(() => {
            bulkJobFiles.delete(bulkGroupId);
            logger_1.default.info(`Bulk job ${bulkGroupId} fully completed and cleaned up`);
        }, 5000);
    }
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