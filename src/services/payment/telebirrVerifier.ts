import { PaymentVerifier, TelebirrReceiptData } from './types';
import { TransactionVerification } from '../../types';
import logger from '../../utils/logger';

// Import telebirr-receipt package
// Note: The package may have different export structure
let telebirrReceipt: any;
try {
  telebirrReceipt = require('telebirr-receipt');
} catch (error) {
  logger.warn('telebirr-receipt package not available, using mock implementation');
}

export class TelebirrVerifier implements PaymentVerifier {
  private receiverPhone: string;

  constructor(expectedReceiver?: string) {
    this.receiverPhone = expectedReceiver || process.env.TELEBIRR_RECEIVER_PHONE || '';
  }

  getReceiverPhone(): string {
    return this.receiverPhone;
  }

  async verify(transactionId: string): Promise<TransactionVerification> {
    try {
      if (!transactionId || transactionId.trim() === '') {
        return {
          isValid: false,
          error: 'Transaction ID is required'
        };
      }

      // Clean the transaction ID
      const cleanedId = transactionId.trim().toUpperCase();

      // Try to verify using telebirr-receipt package
      if (telebirrReceipt) {
        try {
          const receipt = await this.verifyWithPackage(cleanedId);
          if (receipt) {
            return {
              isValid: true,
              amount: receipt.amount,
              receiver: receipt.receiver,
              sender: receipt.sender,
              timestamp: receipt.timestamp
            };
          }
        } catch (packageError) {
          logger.error('Telebirr package verification failed:', packageError);
        }
      }

      // Fallback: Basic validation of transaction ID format
      // Telebirr transaction IDs typically follow certain patterns
      if (!this.isValidTransactionIdFormat(cleanedId)) {
        return {
          isValid: false,
          error: 'Invalid Telebirr transaction ID format'
        };
      }

      // In production, this would call Telebirr API
      // For now, return a pending verification that needs manual check
      return {
        isValid: false,
        error: 'Unable to verify transaction. Please ensure the transaction ID is correct.'
      };
    } catch (error) {
      logger.error('Telebirr verification error:', error);
      return {
        isValid: false,
        error: 'Verification service temporarily unavailable'
      };
    }
  }

  private async verifyWithPackage(transactionId: string): Promise<TelebirrReceiptData | null> {
    try {
      // The telebirr-receipt package API
      // Adjust based on actual package interface
      const result = await telebirrReceipt.verify(transactionId);
      
      if (result && result.success) {
        return {
          transactionId: result.transactionId || transactionId,
          amount: parseFloat(result.amount) || 0,
          sender: result.sender || result.from || '',
          receiver: result.receiver || result.to || '',
          timestamp: result.date ? new Date(result.date) : new Date(),
          status: result.status || 'completed'
        };
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  private isValidTransactionIdFormat(transactionId: string): boolean {
    // Telebirr transaction IDs are typically alphanumeric
    // Common formats: 10-20 characters, may include letters and numbers
    const telebirrPattern = /^[A-Z0-9]{8,25}$/;
    return telebirrPattern.test(transactionId);
  }

  validateReceiver(verification: TransactionVerification, expectedReceiver: string): boolean {
    if (!verification.isValid || !verification.receiver) {
      return false;
    }
    
    // Normalize phone numbers for comparison
    const normalizePhone = (phone: string): string => {
      return phone.replace(/[\s\-\+]/g, '').replace(/^251/, '').replace(/^0/, '');
    };
    
    const actualReceiver = normalizePhone(verification.receiver);
    const expected = normalizePhone(expectedReceiver);
    
    return actualReceiver === expected;
  }

  validateAmount(verification: TransactionVerification, expectedAmount: number): boolean {
    if (!verification.isValid || verification.amount === undefined) {
      return false;
    }
    
    // Allow small floating point differences
    return Math.abs(verification.amount - expectedAmount) < 0.01;
  }
}

export default TelebirrVerifier;
