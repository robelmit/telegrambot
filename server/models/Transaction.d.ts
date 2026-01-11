import mongoose, { Document, Types } from 'mongoose';
import { TransactionType, PaymentProvider } from '../types';
export interface ITransaction extends Document {
    userId: Types.ObjectId;
    telegramId: number;
    type: TransactionType;
    amount: number;
    provider: PaymentProvider | 'system';
    externalTransactionId?: string;
    transactionId?: string;
    reference?: string;
    status: 'pending' | 'completed' | 'failed';
    verifiedAt?: Date;
    verifiedBy?: number;
    metadata?: Record<string, unknown>;
    createdAt: Date;
}
export declare const Transaction: mongoose.Model<ITransaction, {}, {}, {}, mongoose.Document<unknown, {}, ITransaction, {}, {}> & ITransaction & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Transaction;
//# sourceMappingURL=Transaction.d.ts.map