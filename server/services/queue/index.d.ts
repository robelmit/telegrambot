import { SimpleQueue, QueueJob } from '../../utils/simpleQueue';
import { PDFService } from '../pdf';
import { IDGeneratorService } from '../generator';
import { WalletService } from '../payment';
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
/**
 * Initialize the job queue system
 */
export declare function initializeJobQueue(deps: JobProcessorDependencies, concurrency?: number): SimpleQueue<IDGenerationJobData>;
/**
 * Get the job queue instance
 */
export declare function getJobQueue(): SimpleQueue<IDGenerationJobData>;
/**
 * Add a job to the queue
 */
export declare function addJob(data: IDGenerationJobData): Promise<QueueJob<IDGenerationJobData>>;
/**
 * Get job status
 */
export declare function getJobStatus(jobId: string): string | undefined;
/**
 * Shutdown the job queue
 */
export declare function shutdownJobQueue(): void;
//# sourceMappingURL=index.d.ts.map