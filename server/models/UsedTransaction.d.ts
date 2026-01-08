import mongoose, { Document, Types } from 'mongoose';
import { PaymentProvider } from '../types';
export interface IUsedTransaction extends Document {
    transactionId: string;
    provider: PaymentProvider;
    userId: Types.ObjectId;
    amount: number;
    usedAt: Date;
}
export declare const UsedTransaction: mongoose.Model<IUsedTransaction, {}, {}, {}, mongoose.Document<unknown, {}, IUsedTransaction, {}, {}> & IUsedTransaction & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default UsedTransaction;
//# sourceMappingURL=UsedTransaction.d.ts.map