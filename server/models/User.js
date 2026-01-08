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
exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const UserSchema = new mongoose_1.Schema({
    telegramId: {
        type: Number,
        required: true,
        unique: true,
        index: true
    },
    language: {
        type: String,
        enum: ['en', 'am', 'ti'],
        default: 'en'
    },
    walletBalance: {
        type: Number,
        default: 0,
        min: 0
    },
    settings: {
        language: {
            type: String,
            enum: ['en', 'am', 'ti'],
            default: 'en'
        },
        notifications: {
            type: Boolean,
            default: true
        }
    },
    // Admin field
    isAdmin: {
        type: Boolean,
        default: false
    },
    // Agent/Referral fields
    isAgent: {
        type: Boolean,
        default: false
    },
    agentCode: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },
    referredBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    referredByTelegramId: {
        type: Number,
        default: null
    },
    totalEarnings: {
        type: Number,
        default: 0,
        min: 0
    },
    totalReferrals: {
        type: Number,
        default: 0,
        min: 0
    },
    // Stats
    totalOrders: {
        type: Number,
        default: 0,
        min: 0
    },
    isBanned: {
        type: Boolean,
        default: false
    },
    banReason: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});
// Index for faster lookups
UserSchema.index({ telegramId: 1 });
UserSchema.index({ agentCode: 1 });
exports.User = mongoose_1.default.model('User', UserSchema);
exports.default = exports.User;
//# sourceMappingURL=User.js.map