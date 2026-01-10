import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { WalletService } from '../walletService';
import User from '../../../models/User';
import Transaction from '../../../models/Transaction';
import UsedTransaction from '../../../models/UsedTransaction';
import { TOPUP_AMOUNTS, TopupAmount, PaymentProvider } from '../../../types';

describe('Payment Service Property Tests', () => {
  let mongoServer: MongoMemoryServer;
  let walletService: WalletService;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    walletService = new WalletService(50); // 50 ETB service price
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Transaction.deleteMany({});
    await UsedTransaction.deleteMany({});
  });

  // Helper to create a test user
  async function createTestUser(telegramId: number, initialBalance: number = 0): Promise<string> {
    const user = await User.create({
      telegramId,
      language: 'en',
      walletBalance: initialBalance,
      settings: { language: 'en', notifications: true }
    });
    return user._id.toString();
  }

  // Arbitrary for valid top-up amounts
  const topupAmountArb = fc.constantFrom(...TOPUP_AMOUNTS);
  
  // Arbitrary for payment providers
  const providerArb = fc.constantFrom<PaymentProvider>('telebirr', 'cbe');
  
  // Arbitrary for transaction IDs
  const transactionIdArb = fc.stringOf(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')), { minLength: 10, maxLength: 20 });

  /**
   * Property 11: Valid Transaction Credits Wallet
   * For any valid top-up amount and unique transaction ID,
   * crediting the wallet should increase balance by exactly that amount.
   */
  describe('Property 11: Valid Transaction Credits Wallet', () => {
    it('should credit wallet with exact amount for valid transactions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100000 }),
          topupAmountArb,
          providerArb,
          transactionIdArb,
          async (telegramId, amount, provider, txId) => {
            // Create user with zero balance
            const userId = await createTestUser(telegramId, 0);
            
            // Credit the wallet
            await walletService.credit(userId, amount, txId, provider);
            
            // Verify balance increased by exact amount
            const newBalance = await walletService.getBalance(userId);
            expect(newBalance).toBe(amount);
            
            // Cleanup for next iteration
            await User.deleteMany({});
            await Transaction.deleteMany({});
            await UsedTransaction.deleteMany({});
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 12: Invalid/Used Transaction Rejection
   * A transaction ID that has already been used should be rejected.
   */
  describe('Property 12: Invalid/Used Transaction Rejection', () => {
    it('should reject already used transaction IDs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100000 }),
          topupAmountArb,
          providerArb,
          transactionIdArb,
          async (telegramId, amount, provider, txId) => {
            const userId = await createTestUser(telegramId, 0);
            
            // First credit should succeed
            await walletService.credit(userId, amount, txId, provider);
            const balanceAfterFirst = await walletService.getBalance(userId);
            
            // Second credit with same transaction ID should fail
            await expect(
              walletService.credit(userId, amount, txId, provider)
            ).rejects.toThrow('Transaction ID has already been used');
            
            // Balance should remain unchanged
            const balanceAfterSecond = await walletService.getBalance(userId);
            expect(balanceAfterSecond).toBe(balanceAfterFirst);
            
            // Cleanup
            await User.deleteMany({});
            await Transaction.deleteMany({});
            await UsedTransaction.deleteMany({});
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 13: Wallet Balance Invariant
   * Wallet balance should always be non-negative and equal to
   * sum of credits minus sum of debits.
   */
  describe('Property 13: Wallet Balance Invariant', () => {
    it('should maintain balance = credits - debits invariant', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100000 }),
          fc.array(
            fc.record({
              type: fc.constantFrom('credit', 'debit'),
              amount: topupAmountArb
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (telegramId, operations) => {
            const userId = await createTestUser(telegramId, 0);
            
            let expectedBalance = 0;
            let txCounter = 0;
            
            for (const op of operations) {
              if (op.type === 'credit') {
                const txId = `TX${telegramId}${txCounter++}`;
                await walletService.credit(userId, op.amount, txId, 'telebirr');
                expectedBalance += op.amount;
              } else {
                // Only debit if we have sufficient balance
                if (expectedBalance >= op.amount) {
                  const success = await walletService.debit(userId, op.amount, `JOB${txCounter++}`);
                  if (success) {
                    expectedBalance -= op.amount;
                  }
                }
              }
            }
            
            const actualBalance = await walletService.getBalance(userId);
            expect(actualBalance).toBe(expectedBalance);
            expect(actualBalance).toBeGreaterThanOrEqual(0);
            
            // Cleanup
            await User.deleteMany({});
            await Transaction.deleteMany({});
            await UsedTransaction.deleteMany({});
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 14: Insufficient Balance Prevention
   * Debit should fail and return false when balance is insufficient.
   */
  describe('Property 14: Insufficient Balance Prevention', () => {
    it('should prevent debit when balance is insufficient', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100000 }),
          topupAmountArb,
          fc.integer({ min: 1, max: 1000 }),
          async (telegramId, initialBalance, extraAmount) => {
            const userId = await createTestUser(telegramId, 0);
            
            // Credit initial balance
            await walletService.credit(userId, initialBalance, `TX${telegramId}`, 'telebirr');
            
            // Try to debit more than balance
            const debitAmount = initialBalance + extraAmount;
            const success = await walletService.debit(userId, debitAmount, `JOB${telegramId}`);
            
            // Should fail
            expect(success).toBe(false);
            
            // Balance should remain unchanged
            const balance = await walletService.getBalance(userId);
            expect(balance).toBe(initialBalance);
            
            // Cleanup
            await User.deleteMany({});
            await Transaction.deleteMany({});
            await UsedTransaction.deleteMany({});
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 19: Transaction ID Uniqueness
   * Each transaction ID can only be used once per provider.
   */
  describe('Property 19: Transaction ID Uniqueness', () => {
    it('should enforce transaction ID uniqueness per provider', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100000 }),
          fc.integer({ min: 100001, max: 200000 }),
          transactionIdArb,
          topupAmountArb,
          providerArb,
          async (telegramId1, telegramId2, txId, amount, provider) => {
            const userId1 = await createTestUser(telegramId1, 0);
            const userId2 = await createTestUser(telegramId2, 0);
            
            // First user uses the transaction ID
            await walletService.credit(userId1, amount, txId, provider);
            
            // Second user tries to use the same transaction ID
            await expect(
              walletService.credit(userId2, amount, txId, provider)
            ).rejects.toThrow('Transaction ID has already been used');
            
            // Verify transaction is marked as used
            const isUsed = await walletService.isTransactionUsed(txId, provider);
            expect(isUsed).toBe(true);
            
            // Cleanup
            await User.deleteMany({});
            await Transaction.deleteMany({});
            await UsedTransaction.deleteMany({});
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow same transaction ID for different providers', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100000 }),
          transactionIdArb,
          topupAmountArb,
          async (telegramId, txId, amount) => {
            const userId = await createTestUser(telegramId, 0);
            
            // Use transaction ID with telebirr
            await walletService.credit(userId, amount, txId, 'telebirr');
            
            // Same transaction ID should work with CBE (different provider)
            await walletService.credit(userId, amount, txId + '_CBE', 'cbe');
            
            // Balance should be sum of both
            const balance = await walletService.getBalance(userId);
            expect(balance).toBe(amount * 2);
            
            // Cleanup
            await User.deleteMany({});
            await Transaction.deleteMany({});
            await UsedTransaction.deleteMany({});
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
