/**
 * Comprehensive Feature Tests for eFayda ID Generator Bot
 * Tests all major features of the application
 */

import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import sharp from 'sharp';

// Models
import User from '../models/User';
import Job from '../models/Job';
import Transaction from '../models/Transaction';
import UsedTransaction from '../models/UsedTransaction';
import AgentCommission from '../models/AgentCommission';

// Services
import { PDFParserImpl } from '../services/pdf/parser';
import { dataNormalizer } from '../services/pdf/normalizer';
import { pdfValidator } from '../services/pdf/validator';
import { ImageProcessor } from '../services/generator/imageProcessor';
import { CardRenderer } from '../services/generator/cardRenderer';
import { PDFGenerator } from '../services/generator/pdfGenerator';
import { WalletService } from '../services/payment/walletService';
import { TelebirrVerifier } from '../services/payment/telebirrVerifier';
import { CBEVerifier } from '../services/payment/cbeVerifier';

// Utils
import { RateLimiter } from '../utils/rateLimiter';
import { t, SUPPORTED_LANGUAGES } from '../locales';

// Types
import { EfaydaData, Language, TOPUP_AMOUNTS } from '../types';

describe('eFayda ID Generator Bot - Comprehensive Feature Tests', () => {
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
    await Transaction.deleteMany({});
    await UsedTransaction.deleteMany({});
    await AgentCommission.deleteMany({});
  });

  // ============================================
  // SECTION 1: USER MANAGEMENT TESTS
  // ============================================
  describe('1. User Management', () => {
    describe('1.1 User Registration', () => {
      it('should create a new user with default values', async () => {
        const user = await User.create({
          telegramId: 123456789,
          language: 'en'
        });

        expect(user.telegramId).toBe(123456789);
        expect(user.language).toBe('en');
        expect(user.walletBalance).toBe(0);
        expect(user.settings.notifications).toBe(true);
      });

      it('should support all three languages (en, am, ti)', async () => {
        const languages: Language[] = ['en', 'am', 'ti'];
        
        for (const lang of languages) {
          const user = await User.create({
            telegramId: Math.floor(Math.random() * 1000000000),
            language: lang
          });
          expect(user.language).toBe(lang);
        }
      });

      it('should prevent duplicate telegram IDs', async () => {
        await User.create({ telegramId: 111111111, language: 'en' });
        
        await expect(
          User.create({ telegramId: 111111111, language: 'am' })
        ).rejects.toThrow();
      });
    });

    describe('1.2 User Settings', () => {
      it('should update user language preference', async () => {
        const user = await User.create({ telegramId: 222222222, language: 'en' });
        
        user.language = 'am';
        await user.save();
        
        const updated = await User.findById(user._id);
        expect(updated?.language).toBe('am');
      });

      it('should toggle notification settings', async () => {
        const user = await User.create({ telegramId: 333333333, language: 'en' });
        
        user.settings.notifications = false;
        await user.save();
        
        const updated = await User.findById(user._id);
        expect(updated?.settings.notifications).toBe(false);
      });
    });
  });

  // ============================================
  // SECTION 2: WALLET & PAYMENT TESTS
  // ============================================
  describe('2. Wallet & Payment System', () => {
    let walletService: WalletService;
    let testUser: any;

    beforeEach(async () => {
      walletService = new WalletService(30);
      testUser = await User.create({
        telegramId: 444444444,
        language: 'en',
        walletBalance: 0
      });
    });

    describe('2.1 Wallet Balance Operations', () => {
      it('should get initial balance of 0', async () => {
        const balance = await walletService.getBalance(testUser._id.toString());
        expect(balance).toBe(0);
      });

      it('should credit wallet with valid top-up amounts', async () => {
        for (const amount of TOPUP_AMOUNTS) {
          const user = await User.create({
            telegramId: Math.floor(Math.random() * 1000000000),
            language: 'en',
            walletBalance: 0
          });
          
          await walletService.credit(
            user._id.toString(),
            amount,
            `TXN${Date.now()}${amount}`,
            'telebirr'
          );
          
          const balance = await walletService.getBalance(user._id.toString());
          expect(balance).toBe(amount);
        }
      });

      it('should reject invalid top-up amounts', async () => {
        await expect(
          walletService.credit(testUser._id.toString(), 75, 'TXN123', 'telebirr')
        ).rejects.toThrow('Invalid top-up amount');
      });

      it('should debit wallet when sufficient balance', async () => {
        await walletService.credit(testUser._id.toString(), 100, 'TXN001', 'telebirr');
        
        const success = await walletService.debit(testUser._id.toString(), 30, 'JOB001');
        expect(success).toBe(true);
        
        const balance = await walletService.getBalance(testUser._id.toString());
        expect(balance).toBe(70);
      });

      it('should reject debit when insufficient balance', async () => {
        const success = await walletService.debit(testUser._id.toString(), 30, 'JOB002');
        expect(success).toBe(false);
      });

      it('should refund wallet correctly', async () => {
        await walletService.credit(testUser._id.toString(), 100, 'TXN002', 'telebirr');
        await walletService.debit(testUser._id.toString(), 30, 'JOB003');
        await walletService.refund(testUser._id.toString(), 30, 'JOB003');
        
        const balance = await walletService.getBalance(testUser._id.toString());
        expect(balance).toBe(100);
      });
    });

    describe('2.2 Transaction Prevention', () => {
      it('should prevent double-spending with same transaction ID', async () => {
        const txnId = 'UNIQUE_TXN_001';
        
        await walletService.credit(testUser._id.toString(), 100, txnId, 'telebirr');
        
        await expect(
          walletService.credit(testUser._id.toString(), 100, txnId, 'telebirr')
        ).rejects.toThrow('Transaction ID has already been used');
      });

      it('should track used transactions', async () => {
        const txnId = 'TRACK_TXN_001';
        
        const beforeUsed = await walletService.isTransactionUsed(txnId, 'telebirr');
        expect(beforeUsed).toBe(false);
        
        await walletService.credit(testUser._id.toString(), 100, txnId, 'telebirr');
        
        const afterUsed = await walletService.isTransactionUsed(txnId, 'telebirr');
        expect(afterUsed).toBe(true);
      });
    });

    describe('2.3 Transaction History', () => {
      it('should record transaction history', async () => {
        await walletService.credit(testUser._id.toString(), 100, 'HIST_TXN_001', 'telebirr');
        await walletService.credit(testUser._id.toString(), 200, 'HIST_TXN_002', 'cbe');
        await walletService.debit(testUser._id.toString(), 30, 'JOB_HIST_001');
        
        const history = await walletService.getTransactionHistory(testUser._id.toString());
        
        expect(history.length).toBe(3);
        expect(history[0].type).toBe('debit');
        expect(history[1].type).toBe('credit');
        expect(history[2].type).toBe('credit');
      });
    });
  });

  // ============================================
  // SECTION 3: PAYMENT VERIFICATION TESTS
  // ============================================
  describe('3. Payment Verification', () => {
    describe('3.1 Telebirr Verification', () => {
      let telebirrVerifier: TelebirrVerifier;

      beforeEach(() => {
        telebirrVerifier = new TelebirrVerifier('0945073995');
      });

      it('should reject empty transaction ID', async () => {
        const result = await telebirrVerifier.verify('');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Transaction ID is required');
      });

      it('should validate transaction ID format', async () => {
        const result = await telebirrVerifier.verify('INVALID!@#');
        expect(result.isValid).toBe(false);
      });
    });

    describe('3.2 CBE Verification', () => {
      let cbeVerifier: CBEVerifier;

      beforeEach(() => {
        cbeVerifier = new CBEVerifier('1000543305627');
      });

      it('should reject empty transaction ID', async () => {
        const result = await cbeVerifier.verify('');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Transaction ID is required');
      });
    });
  });

  // ============================================
  // SECTION 4: ID CARD GENERATION TESTS
  // ============================================
  describe('4. ID Card Generation', () => {
    let imageProcessor: ImageProcessor;
    let cardRenderer: CardRenderer;
    let pdfGenerator: PDFGenerator;

    const sampleEfaydaData: EfaydaData = {
      fullNameAmharic: 'አበበ በቀለ ተስፋዬ',
      fullNameEnglish: 'Abebe Bekele Tesfaye',
      dateOfBirthEthiopian: '15/03/1965',
      dateOfBirthGregorian: '21/08/1973',
      sex: 'Male',
      nationality: 'Ethiopian',
      phoneNumber: '0913687923',
      region: 'Addis Ababa',
      city: 'Addis Ababa',
      subcity: 'Bole',
      fcn: '1234567890123456',
      fin: '1234 5678 9012',
      fan: '12345678901234567890',
      serialNumber: '123456',
      issueDate: '01/01/2024',
      issueDateEthiopian: '22/04/2016',
      expiryDate: '01/01/2034',
      expiryDateEthiopian: '22/04/2026'
    };

    beforeAll(() => {
      imageProcessor = new ImageProcessor();
      cardRenderer = new CardRenderer();
      pdfGenerator = new PDFGenerator();
    });

    describe('4.1 Card Rendering', () => {
      it('should render front card in color', async () => {
        const frontCard = await cardRenderer.renderFront(sampleEfaydaData, { variant: 'color' });
        
        expect(frontCard).toBeInstanceOf(Buffer);
        expect(frontCard.length).toBeGreaterThan(0);
        
        const metadata = await sharp(frontCard).metadata();
        expect(metadata.format).toBe('png');
        expect(metadata.width).toBe(1012);
        expect(metadata.height).toBe(638);
      });

      it('should render front card in grayscale', async () => {
        const frontCard = await cardRenderer.renderFront(sampleEfaydaData, { variant: 'grayscale' });
        
        expect(frontCard).toBeInstanceOf(Buffer);
        const metadata = await sharp(frontCard).metadata();
        expect(metadata.format).toBe('png');
      });

      it('should render back card in color', async () => {
        const backCard = await cardRenderer.renderBack(sampleEfaydaData, { variant: 'color' });
        
        expect(backCard).toBeInstanceOf(Buffer);
        const metadata = await sharp(backCard).metadata();
        expect(metadata.width).toBe(1012);
        expect(metadata.height).toBe(638);
      });

      it('should render back card in grayscale', async () => {
        const backCard = await cardRenderer.renderBack(sampleEfaydaData, { variant: 'grayscale' });
        
        expect(backCard).toBeInstanceOf(Buffer);
        expect(backCard.length).toBeGreaterThan(0);
      });
    });

    describe('4.2 Image Processing', () => {
      let testImage: Buffer;

      beforeAll(async () => {
        testImage = await sharp({
          create: { width: 200, height: 200, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } }
        }).png().toBuffer();
      });

      it('should mirror image horizontally', async () => {
        const mirrored = await imageProcessor.mirror(testImage);
        
        expect(mirrored).toBeInstanceOf(Buffer);
        const metadata = await sharp(mirrored).metadata();
        expect(metadata.width).toBe(200);
        expect(metadata.height).toBe(200);
      });

      it('should convert image to grayscale', async () => {
        const grayscale = await imageProcessor.grayscale(testImage);
        
        expect(grayscale).toBeInstanceOf(Buffer);
        expect(grayscale.length).toBeGreaterThan(0);
      });

      it('should resize image while preserving aspect ratio', async () => {
        const resized = await imageProcessor.resize(testImage, 100);
        
        const metadata = await sharp(resized).metadata();
        expect(metadata.width).toBeLessThanOrEqual(100);
      });
    });

    describe('4.3 PDF Generation', () => {
      it('should report correct A4 dimensions', () => {
        const dimensions = pdfGenerator.getA4Dimensions();
        
        expect(dimensions.width).toBe(210);
        expect(dimensions.height).toBe(297);
        expect(dimensions.unit).toBe('mm');
      });

      it('should validate A4 page size', () => {
        expect(pdfGenerator.isA4Size(595.28, 841.89)).toBe(true);
        expect(pdfGenerator.isA4Size(612, 792)).toBe(false);
      });
    });
  });

  // ============================================
  // SECTION 5: PDF PARSING & VALIDATION TESTS
  // ============================================
  describe('5. PDF Parsing & Validation', () => {
    describe('5.1 PDF Parser', () => {
      let pdfParser: PDFParserImpl;

      beforeAll(() => {
        pdfParser = new PDFParserImpl();
      });

      it('should extract sex from text containing "Male"', () => {
        const parser = pdfParser as any;
        expect(parser.extractSex('Gender: Male')).toBe('Male');
        expect(parser.extractSex('Gender: Female')).toBe('Female');
        expect(parser.extractSex('ወንድ')).toBe('Male');
        expect(parser.extractSex('ሴት')).toBe('Female');
      });

      it('should extract phone numbers', () => {
        const parser = pdfParser as any;
        expect(parser.extractPhoneNumber('Phone: 0912345678')).toBe('0912345678');
        expect(parser.extractPhoneNumber('Contact: 0987654321')).toBe('0987654321');
      });

      it('should extract FCN numbers', () => {
        const parser = pdfParser as any;
        expect(parser.extractFCN('FCN: 1234 5678 9012 3456')).toBe('1234 5678 9012 3456');
        expect(parser.extractFCN('ID: 1234567890123456')).toBe('1234567890123456');
      });
    });

    describe('5.2 PDF Validator', () => {
      it('should validate file extension', () => {
        const validResult = pdfValidator.validateFileExtension('document.pdf');
        expect(validResult.isValid).toBe(true);

        const invalidResult = pdfValidator.validateFileExtension('document.jpg');
        expect(invalidResult.isValid).toBe(false);
      });
    });

    describe('5.3 Data Normalizer', () => {
      it('should normalize phone numbers', () => {
        expect(dataNormalizer.normalizePhoneNumber('+251912345678')).toBe('0912345678');
        expect(dataNormalizer.normalizePhoneNumber('251912345678')).toBe('0912345678');
        expect(dataNormalizer.normalizePhoneNumber('0912345678')).toBe('0912345678');
      });

      it('should normalize names', () => {
        const result = dataNormalizer.normalizeName('john doe');
        expect(result.english).toBe('John Doe');
      });
    });
  });

  // ============================================
  // SECTION 6: JOB MANAGEMENT TESTS
  // ============================================
  describe('6. Job Management', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await User.create({
        telegramId: 555555555,
        language: 'en',
        walletBalance: 100
      });
    });

    describe('6.1 Job Creation', () => {
      it('should create a new job with pending status', async () => {
        const job = await Job.create({
          userId: testUser._id,
          telegramId: testUser.telegramId,
          chatId: 555555555,
          status: 'pending'
        });

        expect(job.status).toBe('pending');
        expect(job.userId.toString()).toBe(testUser._id.toString());
      });

      it('should track job status transitions', async () => {
        const job = await Job.create({
          userId: testUser._id,
          telegramId: testUser.telegramId,
          chatId: 555555555,
          status: 'pending'
        });

        job.status = 'processing';
        await job.save();
        expect(job.status).toBe('processing');

        job.status = 'completed';
        await job.save();
        expect(job.status).toBe('completed');
      });
    });

    describe('6.2 Job with Extracted Data', () => {
      it('should store extracted EfaydaData in job', async () => {
        const extractedData: EfaydaData = {
          fullNameAmharic: 'ተስት',
          fullNameEnglish: 'Test',
          dateOfBirthEthiopian: '01/01/2000',
          dateOfBirthGregorian: '01/01/2008',
          sex: 'Male',
          nationality: 'Ethiopian',
          phoneNumber: '0912345678',
          region: 'Addis Ababa',
          city: 'Addis Ababa',
          subcity: 'Bole',
          fcn: '1234567890123456',
          fin: '1234 5678 9012',
          fan: '12345678901234567890',
          serialNumber: '123456',
          issueDate: '01/01/2024',
          expiryDate: '01/01/2034'
        };

        const job = await Job.create({
          userId: testUser._id,
          telegramId: testUser.telegramId,
          chatId: 555555555,
          status: 'completed',
          extractedData
        });

        const retrieved = await Job.findById(job._id);
        expect(retrieved?.extractedData?.fullNameEnglish).toBe('Test');
      });
    });
  });

  // ============================================
  // SECTION 7: LOCALIZATION TESTS
  // ============================================
  describe('7. Localization (i18n)', () => {
    describe('7.1 Language Support', () => {
      it('should support English, Amharic, and Tigrinya', () => {
        expect(SUPPORTED_LANGUAGES).toContain('en');
        expect(SUPPORTED_LANGUAGES).toContain('am');
        expect(SUPPORTED_LANGUAGES).toContain('ti');
      });
    });

    describe('7.2 Translation Keys', () => {
      it('should return translations for common keys', () => {
        expect(t('en', 'welcome')).toBeTruthy();
        expect(t('en', 'help')).toBeTruthy();
        expect(t('am', 'welcome')).toBeTruthy();
        expect(t('ti', 'welcome')).toBeTruthy();
      });
    });
  });

  // ============================================
  // SECTION 8: RATE LIMITING TESTS
  // ============================================
  describe('8. Rate Limiting', () => {
    describe('8.1 Request Limiting', () => {
      it('should allow requests within limit', async () => {
        const limiter = new RateLimiter({ maxRequests: 5, windowMs: 60000 });
        const userId = 'test-user-1';

        for (let i = 0; i < 5; i++) {
          const result = await limiter.checkLimit(userId);
          expect(result.allowed).toBe(true);
        }
        limiter.destroy();
      });

      it('should block requests exceeding limit', async () => {
        const limiter = new RateLimiter({ maxRequests: 3, windowMs: 60000 });
        const userId = 'test-user-2';

        await limiter.checkLimit(userId);
        await limiter.checkLimit(userId);
        await limiter.checkLimit(userId);

        const result = await limiter.checkLimit(userId);
        expect(result.allowed).toBe(false);
        limiter.destroy();
      });

      it('should track different users separately', async () => {
        const limiter = new RateLimiter({ maxRequests: 2, windowMs: 60000 });
        
        await limiter.checkLimit('user-a');
        await limiter.checkLimit('user-a');
        const resultA = await limiter.checkLimit('user-a');
        expect(resultA.allowed).toBe(false);
        
        const resultB = await limiter.checkLimit('user-b');
        expect(resultB.allowed).toBe(true);
        limiter.destroy();
      });

      it('should report remaining requests', async () => {
        const limiter = new RateLimiter({ maxRequests: 5, windowMs: 60000 });
        const userId = 'test-user-3';

        const usage1 = await limiter.getUsage(userId);
        expect(usage1.remaining).toBe(5);
        
        await limiter.checkLimit(userId);
        const usage2 = await limiter.getUsage(userId);
        expect(usage2.remaining).toBe(4);
        
        await limiter.checkLimit(userId);
        await limiter.checkLimit(userId);
        const usage3 = await limiter.getUsage(userId);
        expect(usage3.remaining).toBe(2);
        limiter.destroy();
      });
    });
  });

  // ============================================
  // SECTION 9: AGENT/REFERRAL SYSTEM TESTS
  // ============================================
  describe('9. Agent/Referral System', () => {
    describe('9.1 Agent Code Generation', () => {
      it('should generate unique agent codes', async () => {
        const user1 = await User.create({
          telegramId: 666666666,
          language: 'en',
          isAgent: true,
          agentCode: 'AGENT001'
        });

        const user2 = await User.create({
          telegramId: 777777777,
          language: 'en',
          isAgent: true,
          agentCode: 'AGENT002'
        });

        expect(user1.agentCode).not.toBe(user2.agentCode);
      });
    });

    describe('9.2 Commission Tracking', () => {
      it('should create commission records', async () => {
        const agent = await User.create({
          telegramId: 888888888,
          language: 'en',
          isAgent: true,
          agentCode: 'AGENT003'
        });

        const referredUser = await User.create({
          telegramId: 999999999,
          language: 'en',
          referredBy: agent._id
        });

        const commission = await AgentCommission.create({
          agentId: agent._id,
          agentTelegramId: 888888888,
          referredUserId: referredUser._id,
          referredUserTelegramId: 999999999,
          jobId: new mongoose.Types.ObjectId(),
          serviceAmount: 30,
          commissionRate: 40,
          commissionAmount: 12,
          status: 'pending'
        });

        expect(commission.commissionAmount).toBe(12);
        expect(commission.status).toBe('pending');
      });
    });
  });

  // ============================================
  // SECTION 10: PROPERTY-BASED TESTS
  // ============================================
  describe('10. Property-Based Tests', () => {
    describe('10.1 Wallet Balance Invariants', () => {
      it('should maintain non-negative balance', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.integer({ min: 0, max: 10000 }),
            fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 1, maxLength: 5 }),
            async (initialBalance, debits) => {
              const user = await User.create({
                telegramId: Math.floor(Math.random() * 1000000000),
                language: 'en',
                walletBalance: initialBalance
              });

              const walletService = new WalletService(30);
              
              for (const debit of debits) {
                await walletService.debit(user._id.toString(), debit, `JOB_${Date.now()}`);
              }

              const finalBalance = await walletService.getBalance(user._id.toString());
              expect(finalBalance).toBeGreaterThanOrEqual(0);

              await User.deleteOne({ _id: user._id });
              return true;
            }
          ),
          { numRuns: 20 }
        );
      });
    });

    describe('10.2 Image Processing Invariants', () => {
      it('should preserve image dimensions through mirror operation', async () => {
        const imageProcessor = new ImageProcessor();

        await fc.assert(
          fc.asyncProperty(
            fc.integer({ min: 50, max: 300 }),
            fc.integer({ min: 50, max: 300 }),
            async (width, height) => {
              const original = await sharp({
                create: { width, height, channels: 4, background: { r: 100, g: 100, b: 100, alpha: 1 } }
              }).png().toBuffer();

              const mirrored = await imageProcessor.mirror(original);
              const metadata = await sharp(mirrored).metadata();

              expect(metadata.width).toBe(width);
              expect(metadata.height).toBe(height);
              return true;
            }
          ),
          { numRuns: 10 }
        );
      });
    });
  });

  // ============================================
  // SECTION 11: INTEGRATION TESTS
  // ============================================
  describe('11. Integration Tests', () => {
    describe('11.1 Full ID Generation Flow', () => {
      it('should complete full generation workflow', async () => {
        const user = await User.create({
          telegramId: 111222333,
          language: 'en',
          walletBalance: 100
        });

        const walletService = new WalletService(30);
        const debitSuccess = await walletService.debit(user._id.toString(), 30, 'TEST_JOB_001');
        expect(debitSuccess).toBe(true);

        const job = await Job.create({
          userId: user._id,
          telegramId: user.telegramId,
          chatId: 111222333,
          status: 'processing'
        });

        const cardRenderer = new CardRenderer();
        const sampleData: EfaydaData = {
          fullNameAmharic: 'ተስት ስም',
          fullNameEnglish: 'Test Name',
          dateOfBirthEthiopian: '01/01/2000',
          dateOfBirthGregorian: '01/01/2008',
          sex: 'Male',
          nationality: 'Ethiopian',
          phoneNumber: '0912345678',
          region: 'Addis Ababa',
          city: 'Addis Ababa',
          subcity: 'Bole',
          fcn: '1234567890123456',
          fin: '1234 5678 9012',
          fan: '12345678901234567890',
          serialNumber: '123456',
          issueDate: '01/01/2024',
          expiryDate: '01/01/2034'
        };

        const frontCard = await cardRenderer.renderFront(sampleData, { variant: 'color' });
        const backCard = await cardRenderer.renderBack(sampleData, { variant: 'color' });

        expect(frontCard).toBeInstanceOf(Buffer);
        expect(backCard).toBeInstanceOf(Buffer);

        job.status = 'completed';
        job.extractedData = sampleData;
        await job.save();

        const finalUser = await User.findById(user._id);
        expect(finalUser?.walletBalance).toBe(70);

        const finalJob = await Job.findById(job._id);
        expect(finalJob?.status).toBe('completed');
      });
    });
  });
});
