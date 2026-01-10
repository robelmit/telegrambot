import mongoose, { Schema, Document, Types } from 'mongoose';
import { PaymentProvider } from '../types';

export interface IUsedTransaction extends Document {
  transactionId: string;
  provider: PaymentProvider;
  userId: Types.ObjectId;
  amount: number;
  usedAt: Date;
}

const UsedTransactionSchema = new Schema<IUsedTransaction>({
  transactionId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  provider: { 
    type: String, 
    enum: ['telebirr', 'cbe'], 
    required: true 
  },
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true,
    min: 0
  },
  usedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Compound index for provider + transactionId lookups
UsedTransactionSchema.index({ provider: 1, transactionId: 1 }, { unique: true });

export const UsedTransaction = mongoose.model<IUsedTransaction>('UsedTransaction', UsedTransactionSchema);
export default UsedTransaction;
