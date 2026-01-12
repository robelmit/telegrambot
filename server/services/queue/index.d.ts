import { SimpleQueue, QueueJob } from '../../utils/simpleQueue';
import { PDFService } from '../pdf';
import { IDGeneratorService } from '../generator';
import { WalletService } from '../payment';
import { PDFGenerator } from '../generator/pdfGenerator';
export type TemplateType = 'template0' | 'template1' | 'template2';
export interface IDGenerationJobData {
    jobId: string;
    userId: string;
    telegramId: number;
    pdfPath: string;
    chatId: number;
    template?: TemplateType;
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