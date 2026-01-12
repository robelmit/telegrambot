import mongoose, { Document, Types } from 'mongoose';
import { JobStatus, EfaydaData } from '../types';
export interface IOutputFile {
    type: string;
    path: string;
    deliveredAt?: Date;
}
export interface IJob extends Document {
    userId: Types.ObjectId;
    telegramId: number;
    chatId: number;
    status: JobStatus;
    pdfPath?: string;
    extractedData?: EfaydaData;
    outputFiles: IOutputFile[];
    attempts: number;
    error?: string;
    createdAt: Date;
    completedAt?: Date;
    expiresAt: Date;
    isBulk?: boolean;
    bulkIndex?: number;
    bulkGroupId?: string;
    bulkBatchIndex?: number;
    bulkIndexInBatch?: number;
    bulkTotalFiles?: number;
    bulkFilesPerPdf?: number;
    bulkTotalBatches?: number;
    template?: string;
}
export declare const Job: mongoose.Model<IJob, {}, {}, {}, mongoose.Document<unknown, {}, IJob, {}, {}> & IJob & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Job;
//# sourceMappingURL=Job.d.ts.map