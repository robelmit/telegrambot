"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const types_1 = require("../../types");
const User_1 = __importDefault(require("../../models/User"));
const Transaction_1 = __importDefault(require("../../models/Transaction"));
const UsedTransaction_1 = __importDefault(require("../../models/UsedTransaction"));
const logger_1 = __importDefault(require("../../utils/logger"));
class WalletService {
    servicePrice;
    constructor(servicePrice) {
        this.servicePrice = servicePrice || parseInt(process.env.SERVICE_PRICE || '50', 10);
    }
    async getBalance(userId) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        return user.walletBalance;
    }
    async getBalanceByTelegramId(telegramId) {
        const user = await User_1.default.findOne({ telegramId });
        if (!user) {
            throw new Error('User not found');
        }
        return user.walletBalance;
    }
    async credit(userId, amount, transactionId, provider) {
        // Validate amount is one of the allowed top-up amounts
        if (!types_1.TOPUP_AMOUNTS.includes(amount)) {
            throw new Error(`Invalid top-up amount. Allowed amounts: ${types_1.TOPUP_AMOUNTS.join(', ')}`);
        }
        // Check if transaction ID has already been used
        const isUsed = await this.isTransactionUsed(transactionId, provider);
        if (isUsed) {
            throw new Error('Transaction ID has already been used');
        }
        // Mark transaction as used first (to prevent double-spending)
        await UsedTransaction_1.default.create({
            transactionId: transactionId.trim().toUpperCase(),
            provider,
            userId: new mongoose_1.default.Types.ObjectId(userId),
            amount
        });
        // Update user balance
        const user = await User_1.default.findByIdAndUpdate(userId, { $inc: { walletBalance: amount } }, { new: true });
        if (!user) {
            throw new Error('User not found');
        }
        // Create transaction record
        await Transaction_1.default.create({
            userId: new mongoose_1.default.Types.ObjectId(userId),
            telegramId: user.telegramId,
            type: 'credit',
            amount,
            provider,
            externalTransactionId: transactionId,
            status: 'completed'
        });
        logger_1.default.info(`Wallet credited: userId=${userId}, amount=${amount}, provider=${provider}`);
    }
    async debit(userId, amount, jobId) {
        // Check current balance first
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        if (user.walletBalance < amount) {
            return false; // Insufficient balance
        }
        // Use findOneAndUpdate with balance check to prevent race conditions
        const result = await User_1.default.findOneAndUpdate({ _id: userId, walletBalance: { $gte: amount } }, { $inc: { walletBalance: -amount } }, { new: true });
        if (!result) {
            return false; // Balance changed, insufficient now
        }
        // Create transaction record
        await Transaction_1.default.create({
            userId: new mongoose_1.default.Types.ObjectId(userId),
            telegramId: result.telegramId,
            type: 'debit',
            amount,
            provider: 'system',
            reference: jobId,
            status: 'completed'
        });
        logger_1.default.info(`Wallet debited: userId=${userId}, amount=${amount}, jobId=${jobId}`);
        return true;
    }
    async refund(userId, amount, jobId) {
        // Update user balance
        const user = await User_1.default.findByIdAndUpdate(userId, { $inc: { walletBalance: amount } }, { new: true });
        if (!user) {
            throw new Error('User not found');
        }
        // Create refund transaction record
        await Transaction_1.default.create({
            userId: new mongoose_1.default.Types.ObjectId(userId),
            telegramId: user.telegramId,
            type: 'credit',
            amount,
            provider: 'system',
            reference: `refund_${jobId}`,
            status: 'completed',
            metadata: { refundFor: jobId }
        });
        logger_1.default.info(`Wallet refunded: userId=${userId}, amount=${amount}, jobId=${jobId}`);
    }
    async getTransactionHistory(userId, limit = 20) {
        const transactions = await Transaction_1.default.find({ userId: new mongoose_1.default.Types.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        return transactions.map(tx => ({
            id: tx._id.toString(),
            type: tx.type,
            amount: tx.amount,
            provider: tx.provider,
            reference: tx.externalTransactionId || tx.reference || '',
            timestamp: tx.createdAt
        }));
    }
    async isTransactionUsed(transactionId, provider) {
        const existing = await UsedTransaction_1.default.findOne({
            transactionId: transactionId.trim().toUpperCase(),
            provider
        });
        return !!existing;
    }
    async markTransactionUsed(transactionId, provider, userId, amount) {
        await UsedTransaction_1.default.create({
            transactionId: transactionId.trim().toUpperCase(),
            provider,
            userId: new mongoose_1.default.Types.ObjectId(userId),
            amount
        });
    }
    // Helper method to check if user has sufficient balance
    async hasSufficientBalance(userId, amount) {
        const balance = await this.getBalance(userId);
        const requiredAmount = amount || this.servicePrice;
        return balance >= requiredAmount;
    }
    // Get service price
    getServicePrice() {
        return this.servicePrice;
    }
}
exports.WalletService = WalletService;
exports.default = WalletService;
//# sourceMappingURL=walletService.js.map