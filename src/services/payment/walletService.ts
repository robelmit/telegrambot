import mongoose from 'mongoose';
import { WalletService as IWalletService, WalletTransactionRecord } from './types';
import { PaymentProvider, TOPUP_AMOUNTS, TopupAmount } from '../../types';
import User from '../../models/User';
import Transaction from '../../models/Transaction';
import UsedTransaction from '../../models/UsedTransaction';
import logger from '../../utils/logger';

export class WalletService implements IWalletService {
  private servicePrice: number;

  constructor(servicePrice?: number) {
    this.servicePrice = servicePrice || parseInt(process.env.SERVICE_PRICE || '50', 10);
  }

  async getBalance(userId: string): Promise<number> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user.walletBalance;
  }

  async getBalanceByTelegramId(telegramId: number): Promise<number> {
    const user = await User.findOne({ telegramId });
    if (!user) {
      throw new Error('User not found');
    }
    return user.walletBalance;
  }

  async credit(
    userId: string,
    amount: number,
    transactionId: string,
    provider: PaymentProvider
  ): Promise<void> {
    // Validate amount is one of the allowed top-up amounts
    if (!TOPUP_AMOUNTS.includes(amount as TopupAmount)) {
      throw new Error(`Invalid top-up amount. Allowed amounts: ${TOPUP_AMOUNTS.join(', ')}`);
    }

    // Check if transaction ID has already been used
    const isUsed = await this.isTransactionUsed(transactionId, provider);
    if (isUsed) {
      throw new Error('Transaction ID has already been used');
    }

    // Mark transaction as used first (to prevent double-spending)
    await UsedTransaction.create({
      transactionId: transactionId.trim().toUpperCase(),
      provider,
      userId: new mongoose.Types.ObjectId(userId),
      amount
    });

    // Update user balance
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { walletBalance: amount } },
      { new: true }
    );

    if (!user) {
      throw new Error('User not found');
    }

    // Create transaction record
    await Transaction.create({
      userId: new mongoose.Types.ObjectId(userId),
      type: 'credit',
      amount,
      provider,
      externalTransactionId: transactionId,
      status: 'completed'
    });

    logger.info(`Wallet credited: userId=${userId}, amount=${amount}, provider=${provider}`);
  }

  async debit(userId: string, amount: number, jobId: string): Promise<boolean> {
    // Check current balance first
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.walletBalance < amount) {
      return false; // Insufficient balance
    }

    // Use findOneAndUpdate with balance check to prevent race conditions
    const result = await User.findOneAndUpdate(
      { _id: userId, walletBalance: { $gte: amount } },
      { $inc: { walletBalance: -amount } },
      { new: true }
    );

    if (!result) {
      return false; // Balance changed, insufficient now
    }

    // Create transaction record
    await Transaction.create({
      userId: new mongoose.Types.ObjectId(userId),
      type: 'debit',
      amount,
      provider: 'system',
      reference: jobId,
      status: 'completed'
    });

    logger.info(`Wallet debited: userId=${userId}, amount=${amount}, jobId=${jobId}`);
    return true;
  }


  async refund(userId: string, amount: number, jobId: string): Promise<void> {
    // Update user balance
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { walletBalance: amount } },
      { new: true }
    );

    if (!user) {
      throw new Error('User not found');
    }

    // Create refund transaction record
    await Transaction.create({
      userId: new mongoose.Types.ObjectId(userId),
      type: 'credit',
      amount,
      provider: 'system',
      reference: `refund_${jobId}`,
      status: 'completed',
      metadata: { refundFor: jobId }
    });

    logger.info(`Wallet refunded: userId=${userId}, amount=${amount}, jobId=${jobId}`);
  }

  async getTransactionHistory(userId: string, limit: number = 20): Promise<WalletTransactionRecord[]> {
    const transactions = await Transaction.find({ userId: new mongoose.Types.ObjectId(userId) })
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

  async isTransactionUsed(transactionId: string, provider: PaymentProvider): Promise<boolean> {
    const existing = await UsedTransaction.findOne({
      transactionId: transactionId.trim().toUpperCase(),
      provider
    });
    return !!existing;
  }

  async markTransactionUsed(
    transactionId: string,
    provider: PaymentProvider,
    userId: string,
    amount: number
  ): Promise<void> {
    await UsedTransaction.create({
      transactionId: transactionId.trim().toUpperCase(),
      provider,
      userId: new mongoose.Types.ObjectId(userId),
      amount
    });
  }

  // Helper method to check if user has sufficient balance
  async hasSufficientBalance(userId: string, amount?: number): Promise<boolean> {
    const balance = await this.getBalance(userId);
    const requiredAmount = amount || this.servicePrice;
    return balance >= requiredAmount;
  }

  // Get service price
  getServicePrice(): number {
    return this.servicePrice;
  }
}

export default WalletService;
