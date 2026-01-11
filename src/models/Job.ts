import mongoose, { Schema, Document, Types } from 'mongoose';
import { JobStatus, EfaydaData } from '../types';

export interface IOutputFile {
  type: string;
  path: string;
  deliveredAt?: Date;
}

export interface IJob extends Document {
  userId: Types.ObjectId;
  telegramId: number;  // For quick lookup without join
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
  // Bulk processing fields
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

const OutputFileSchema = new Schema<IOutputFile>({
  type: { type: String, required: true },
  path: { type: String, required: true },
  deliveredAt: { type: Date }
}, { _id: false });

const JobSchema = new Schema<IJob>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  telegramId: {
    type: Number,
    required: true,
    index: true
  },
  chatId: { 
    type: Number, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'], 
    default: 'pending',
    index: true
  },
  pdfPath: { 
    type: String 
  },
  extractedData: { 
    type: Schema.Types.Mixed 
  },
  outputFiles: [OutputFileSchema],
  attempts: { 
    type: Number, 
    default: 0 
  },
  error: { 
    type: String 
  },
  completedAt: { 
    type: Date 
  },
  expiresAt: { 
    type: Date,
    default: () => new Date(Date.now() + 3600000) // 1 hour from now
  },
  // Bulk processing fields
  isBulk: {
    type: Boolean,
    default: false
  },
  bulkIndex: {
    type: Number
  },
  bulkGroupId: {
    type: String,
    index: true
  },
  bulkBatchIndex: {
    type: Number
  },
  bulkIndexInBatch: {
    type: Number
  },
  bulkTotalFiles: {
    type: Number
  },
  bulkFilesPerPdf: {
    type: Number
  },
  bulkTotalBatches: {
    type: Number
  },
  template: {
    type: String,
    default: 'template0'
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// TTL index for auto-cleanup (documents expire at expiresAt)
JobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for user jobs
JobSchema.index({ userId: 1, status: 1, createdAt: -1 });

export const Job = mongoose.model<IJob>('Job', JobSchema);
export default Job;
