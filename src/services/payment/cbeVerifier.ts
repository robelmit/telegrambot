import { PaymentVerifier, CBEReceiptData } from './types';
import { TransactionVerification } from '../../types';
import logger from '../../utils/logger';

// Import @jvhaile/cbe-verifier package
let cbeVerifier: any;
try {
  cbeVerifier = require('@jvhaile/cbe-verifier');
} catch (error) {
  logger.warn('@jvhaile/cbe-verifier package not available, using mock implementation');
}

export class CBEVerifier implements PaymentVerifier {
  private expectedReceiver: string;

  constructor(expectedReceiver?: string) {
    this.expectedReceiver = expectedReceiver || process.env.CBE_RECEIVER_ACCOUNT || '';
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

      // Try to verify using @jvhaile/cbe-verifier package
      if (cbeVerifier) {
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
          logger.error('CBE package verification failed:', packageError);
        }
      }

      // Fallback: Basic validation of transaction ID format
      if (!this.isValidTransactionIdFormat(cleanedId)) {
        return {
          isValid: false,
          error: 'Invalid CBE Birr transaction ID format'
        };
      }

      // In production, this would call CBE API
      return {
        isValid: false,
        error: 'Unable to verify transaction. Please ensure the transaction ID is correct.'
      };
    } catch (error) {
      logger.error('CBE verification error:', error);
      return {
        isValid: false,
        error: 'Verification service temporarily unavailable'
      };
    }
  }

  private async verifyWithPackage(transactionId: string): Promise<CBEReceiptData | null> {
    try {
      // The @jvhaile/cbe-verifier package API
      // Adjust based on actual package interface
      const result = await cbeVerifier.verify(transactionId);
      
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
    // CBE transaction IDs are typically alphanumeric
    // Common formats: FT followed by numbers, or numeric reference
    const cbePattern = /^(FT)?[A-Z0-9]{8,25}$/;
    return cbePattern.test(transactionId);
  }

  validateReceiver(verification: TransactionVerification, expectedReceiver: string): boolean {
    if (!verification.isValid || !verification.receiver) {
      return false;
    }
    
    // Normalize account numbers for comparison
    const normalizeAccount = (account: string): string => {
      return account.replace(/[\s\-]/g, '');
    };
    
    const actualReceiver = normalizeAccount(verification.receiver);
    const expected = normalizeAccount(expectedReceiver);
    
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

export default CBEVerifier;
