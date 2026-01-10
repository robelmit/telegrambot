import mongoose, { Schema, Document, Types } from 'mongoose';

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

const AgentCommissionSchema = new Schema<IAgentCommission>({
  agentId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  agentTelegramId: {
    type: Number,
    required: true,
    index: true
  },
  referredUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  referredUserTelegramId: {
    type: Number,
    required: true
  },
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  serviceAmount: {
    type: Number,
    required: true,
    min: 0
  },
  commissionRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  commissionAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'credited', 'failed'],
    default: 'pending'
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Indexes
AgentCommissionSchema.index({ agentId: 1, createdAt: -1 });
AgentCommissionSchema.index({ jobId: 1 });

export const AgentCommission = mongoose.model<IAgentCommission>('AgentCommission', AgentCommissionSchema);
export default AgentCommission;
