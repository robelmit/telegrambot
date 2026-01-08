"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentCommission = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const AgentCommissionSchema = new mongoose_1.Schema({
    agentId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    referredUserTelegramId: {
        type: Number,
        required: true
    },
    jobId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
exports.AgentCommission = mongoose_1.default.model('AgentCommission', AgentCommissionSchema);
exports.default = exports.AgentCommission;
//# sourceMappingURL=AgentCommission.js.map