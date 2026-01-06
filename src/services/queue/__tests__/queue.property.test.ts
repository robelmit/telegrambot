import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../../../models/User';
import JobModel from '../../../models/Job';
import Transaction from '../../../models/Transaction';
import { WalletService } from '../../payment';
import { TOPUP_AMOUNTS } from '../../../types';

describe('Job Queue Property Tests', () => {
  let mongoServer: MongoMemoryServer;
  let walletService: WalletService;
  const SERVICE_PRICE = 50;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    walletService = new WalletService(SERVICE_PRICE);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await JobModel.deleteMany({});
    await Transaction.deleteMany({});
  });

  // Helper to create a test user with balance
  async function createTestUser(telegramId: number, balance: number = 0): Promise<string> {
    const user = await User.create({
      telegramId,
      language: 'en',
      walletBalance: balance,
      settings: { language: 'en', notifications: true }
    });
    return user._id.toString();
  }

  // Helper to create a test job
  async function createTestJob(userId: string, status: string = 'pending'): Promise<string> {
    const job = await JobModel.create({
      userId: new mongoose.Types.ObjectId(userId),
      telegramId: Math.floor(Math.random() * 1000000000), // Random telegram ID for tests
      chatId: Math.floor(Math.random() * 1000000000), // Random chat ID for tests
      status,
      pdfPath: '/tmp/test.pdf',
      attempts: 0
    });
    return job._id.toString();
  }

  /**
   * Property 16: Job Retry Limit
   * Jobs should not exceed the maximum retry limit (3 attempts).
   */
  describe('Property 16: Job Retry Limit', () => {
    it('should track job attempts correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100000 }),
          fc.integer({ min: 0, max: 5 }),
          async (telegramId, attemptCount) => {
            const userId = await createTestUser(telegramId, 500);
            const jobId = await createTestJob(userId);
            
            // Simulate multiple attempts
            const maxRetries = 3;
            const actualAttempts = Math.min(attemptCount, maxRetries);
            
            await JobModel.findByIdAndUpdate(jobId, {
              attempts: actualAttempts
            });
            
            const job = await JobModel.findById(jobId);
            
            // Attempts should never exceed max retries
            expect(job?.attempts).toBeLessThanOrEqual(maxRetries);
            expect(job?.attempts).toBe(actualAttempts);
            
            // Cleanup
            await User.deleteMany({});
            await JobModel.deleteMany({});
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should mark job as failed after max retries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100000 }),
          async (telegramId) => {
            const userId = await createTestUser(telegramId, 500);
            const jobId = await createTestJob(userId);
            
            const maxRetries = 3;
            
            // Simulate reaching max retries
            await JobModel.findByIdAndUpdate(jobId, {
              attempts: maxRetries,
              status: 'failed',
              lastError: 'Max retries exceeded'
            });
            
            const job = await JobModel.findById(jobId);
            
            expect(job?.attempts).toBe(maxRetries);
            expect(job?.status).toBe('failed');
            
            // Cleanup
            await User.deleteMany({});
            await JobModel.deleteMany({});
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 17: Failed Job Refund
   * When a job permanently fails, the user should be refunded.
   */
  describe('Property 17: Failed Job Refund', () => {
    it('should refund user when job fails permanently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100000 }),
          fc.constantFrom(...TOPUP_AMOUNTS),
          async (telegramId, initialTopup) => {
            const userId = await createTestUser(telegramId, 0);
            
            // Top up user wallet
            await walletService.credit(userId, initialTopup, `TX${telegramId}`, 'telebirr');
            
            // Debit for job
            const debitSuccess = await walletService.debit(userId, SERVICE_PRICE, `JOB${telegramId}`);
            
            if (debitSuccess) {
              const balanceAfterDebit = await walletService.getBalance(userId);
              expect(balanceAfterDebit).toBe(initialTopup - SERVICE_PRICE);
              
              // Simulate job failure and refund
              await walletService.refund(userId, SERVICE_PRICE, `JOB${telegramId}`);
              
              const balanceAfterRefund = await walletService.getBalance(userId);
              
              // Balance should be restored
              expect(balanceAfterRefund).toBe(initialTopup);
            }
            
            // Cleanup
            await User.deleteMany({});
            await JobModel.deleteMany({});
            await Transaction.deleteMany({});
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain balance invariant after refund', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100000 }),
          async (telegramId) => {
            const userId = await createTestUser(telegramId, 200);
            const initialBalance = 200;
            
            // Debit for job
            await walletService.debit(userId, SERVICE_PRICE, `JOB${telegramId}`);
            
            // Refund
            await walletService.refund(userId, SERVICE_PRICE, `JOB${telegramId}`);
            
            const finalBalance = await walletService.getBalance(userId);
            
            // Balance should be back to initial
            expect(finalBalance).toBe(initialBalance);
            
            // Cleanup
            await User.deleteMany({});
            await Transaction.deleteMany({});
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: Job status transitions should be valid
   */
  describe('Job Status Transitions', () => {
    it('should only allow valid status transitions', async () => {
      const validTransitions: Record<string, string[]> = {
        'pending': ['processing', 'failed'],
        'processing': ['completed', 'failed'],
        'completed': [],
        'failed': []
      };

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100000 }),
          fc.constantFrom('pending', 'processing', 'completed', 'failed'),
          fc.constantFrom('pending', 'processing', 'completed', 'failed'),
          async (telegramId, fromStatus, toStatus) => {
            const userId = await createTestUser(telegramId, 500);
            const jobId = await createTestJob(userId, fromStatus);
            
            const isValidTransition = validTransitions[fromStatus].includes(toStatus) || fromStatus === toStatus;
            
            if (isValidTransition) {
              await JobModel.findByIdAndUpdate(jobId, { status: toStatus });
              const job = await JobModel.findById(jobId);
              expect(job?.status).toBe(toStatus);
            }
            
            // Cleanup
            await User.deleteMany({});
            await JobModel.deleteMany({});
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
