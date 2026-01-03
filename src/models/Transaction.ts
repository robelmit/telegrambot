import mongoose, { Schema, Document, Types } from 'mongoose';
import { TransactionType, PaymentProvider } from '../types';

export interface ITransaction extends Document {
  userId: Types.ObjectId;
  type: TransactionType;
  amount: number;
  provider: PaymentProvider | 'system';
  externalTransactionId?: string;
  reference?: string;  // jobId for debits
  status: 'pending' | 'completed' | 'failed';
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  type: { 
    type: String, 
    enum: ['credit', 'debit'], 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true,
    min: 0
  },
  provider: { 
    type: String, 
    enum: ['telebirr', 'cbe', 'system'],
    required: true
  },
  externalTransactionId: { 
    type: String, 
    sparse: true,
    index: true
  },
  reference: { 
    type: String 
  },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed'], 
    default: 'completed' 
  },
  metadata: { 
    type: Schema.Types.Mixed 
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Compound index for user transactions
TransactionSchema.index({ userId: 1, createdAt: -1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
export default Transaction;
