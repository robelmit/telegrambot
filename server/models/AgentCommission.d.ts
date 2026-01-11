import mongoose, { Document, Types } from 'mongoose';
export interface IAgentCommission extends Document {
    agentId: Types.ObjectId;
    agentTelegramId: number;
    referredUserId: Types.ObjectId;
    referredUserTelegramId: number;
    jobId: Types.ObjectId;
    serviceAmount: number;
    commissionRate: number;
    commissionAmount: number;
    status: 'pending' | 'credited' | 'failed';
    createdAt: Date;
}
export declare const AgentCommission: mongoose.Model<IAgentCommission, {}, {}, {}, mongoose.Document<unknown, {}, IAgentCommission, {}, {}> & IAgentCommission & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default AgentCommission;
//# sourceMappingURL=AgentCommission.d.ts.map