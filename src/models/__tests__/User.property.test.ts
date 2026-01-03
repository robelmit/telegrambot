/**
 * Property Test: Data Persistence Round-Trip
 * Feature: efayda-id-generator, Property 3: Data Persistence Round-Trip
 * Validates: Requirements 2.10
 * 
 * For any valid EfaydaData object extracted from a PDF, storing it to MongoDB
 * and retrieving it SHALL produce an equivalent object.
 */

import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User, IUser } from '../User';
import { Job } from '../Job';
import { Language, EfaydaData } from '../../types';

describe('Property 3: Data Persistence Round-Trip', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Job.deleteMany({});
  });

  // Arbitrary for Language type
  const languageArb = fc.constantFrom<Language>('en', 'am', 'ti');

  // Arbitrary for User data
  const userDataArb = fc.record({
    telegramId: fc.integer({ min: 1, max: 999999999 }),
    language: languageArb,
    walletBalance: fc.integer({ min: 0, max: 100000 }),
    settings: fc.record({
      language: languageArb,
      notifications: fc.boolean()
    })
  });

  // Arbitrary for EfaydaData
  const efaydaDataArb: fc.Arbitrary<EfaydaData> = fc.record({
    fullNameAmharic: fc.string({ minLength: 1, maxLength: 100 }),
    fullNameEnglish: fc.string({ minLength: 1, maxLength: 100 }),
    dateOfBirthEthiopian: fc.string({ minLength: 8, maxLength: 20 }),
    dateOfBirthGregorian: fc.string({ minLength: 8, maxLength: 20 }),
    sex: fc.constantFrom<'Male' | 'Female'>('Male', 'Female'),
    nationality: fc.string({ minLength: 1, maxLength: 50 }),
    phoneNumber: fc.stringMatching(/^09[0-9]{8}$/),
    region: fc.string({ minLength: 1, maxLength: 50 }),
    city: fc.string({ minLength: 1, maxLength: 50 }),
    subcity: fc.string({ minLength: 1, maxLength: 50 }),
    fcn: fc.stringMatching(/^[0-9]{10,20}$/),
    fin: fc.stringMatching(/^[0-9]{4} [0-9]{4} [0-9]{4}$/),
    fan: fc.stringMatching(/^[0-9]{16,20}$/),
    serialNumber: fc.stringMatching(/^[0-9]{6,10}$/),
    issueDate: fc.string({ minLength: 8, maxLength: 20 }),
    expiryDate: fc.string({ minLength: 8, maxLength: 20 })
  });

  it('should preserve User data through save and retrieve cycle', async () => {
    await fc.assert(
      fc.asyncProperty(userDataArb, async (userData) => {
        // Create and save user
        const user = new User(userData);
        const savedUser = await user.save();
        
        // Retrieve user
        const retrievedUser = await User.findById(savedUser._id).lean();
        
        // Verify round-trip
        expect(retrievedUser).toBeTruthy();
        expect(retrievedUser!.telegramId).toBe(userData.telegramId);
        expect(retrievedUser!.language).toBe(userData.language);
        expect(retrievedUser!.walletBalance).toBe(userData.walletBalance);
        expect(retrievedUser!.settings.language).toBe(userData.settings.language);
        expect(retrievedUser!.settings.notifications).toBe(userData.settings.notifications);
        
        // Cleanup for next iteration
        await User.deleteOne({ _id: savedUser._id });
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve EfaydaData in Job through save and retrieve cycle', async () => {
    // First create a user for the job
    const user = await User.create({
      telegramId: 123456789,
      language: 'en',
      walletBalance: 100
    });

    await fc.assert(
      fc.asyncProperty(efaydaDataArb, async (efaydaData) => {
        // Create and save job with extracted data
        const job = new Job({
          userId: user._id,
          chatId: 123456789,
          status: 'completed',
          extractedData: efaydaData
        });
        const savedJob = await job.save();
        
        // Retrieve job
        const retrievedJob = await Job.findById(savedJob._id).lean();
        
        // Verify round-trip for EfaydaData
        expect(retrievedJob).toBeTruthy();
        const retrieved = retrievedJob!.extractedData as EfaydaData;
        
        expect(retrieved.fullNameAmharic).toBe(efaydaData.fullNameAmharic);
        expect(retrieved.fullNameEnglish).toBe(efaydaData.fullNameEnglish);
        expect(retrieved.dateOfBirthEthiopian).toBe(efaydaData.dateOfBirthEthiopian);
        expect(retrieved.dateOfBirthGregorian).toBe(efaydaData.dateOfBirthGregorian);
        expect(retrieved.sex).toBe(efaydaData.sex);
        expect(retrieved.nationality).toBe(efaydaData.nationality);
        expect(retrieved.phoneNumber).toBe(efaydaData.phoneNumber);
        expect(retrieved.region).toBe(efaydaData.region);
        expect(retrieved.city).toBe(efaydaData.city);
        expect(retrieved.subcity).toBe(efaydaData.subcity);
        expect(retrieved.fcn).toBe(efaydaData.fcn);
        expect(retrieved.fin).toBe(efaydaData.fin);
        expect(retrieved.fan).toBe(efaydaData.fan);
        expect(retrieved.serialNumber).toBe(efaydaData.serialNumber);
        expect(retrieved.issueDate).toBe(efaydaData.issueDate);
        expect(retrieved.expiryDate).toBe(efaydaData.expiryDate);
        
        // Cleanup for next iteration
        await Job.deleteOne({ _id: savedJob._id });
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should maintain wallet balance consistency through updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 999999999 }),
        fc.integer({ min: 0, max: 10000 }),
        fc.array(fc.integer({ min: -1000, max: 1000 }), { minLength: 1, maxLength: 10 }),
        async (telegramId, initialBalance, deltas) => {
          // Create user with initial balance
          const user = await User.create({
            telegramId,
            language: 'en',
            walletBalance: initialBalance
          });
          
          // Apply deltas (ensuring balance never goes negative)
          let expectedBalance = initialBalance;
          for (const delta of deltas) {
            const newBalance = Math.max(0, expectedBalance + delta);
            await User.updateOne(
              { _id: user._id },
              { $set: { walletBalance: newBalance } }
            );
            expectedBalance = newBalance;
          }
          
          // Retrieve and verify
          const retrievedUser = await User.findById(user._id).lean();
          expect(retrievedUser!.walletBalance).toBe(expectedBalance);
          
          // Cleanup
          await User.deleteOne({ _id: user._id });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
