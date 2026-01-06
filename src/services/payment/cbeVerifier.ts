import { PaymentVerifier, CBEReceiptData } from './types';
import { TransactionVerification } from '../../types';
import logger from '../../utils/logger';

const VERIFIER_API_BASE = 'https://verifyapi.leulzenebe.pro';

export class CBEVerifier implements PaymentVerifier {
  private receiverAccount: string;
  private apiKey: string;

  constructor(expectedReceiver?: string) {
    this.receiverAccount = expectedReceiver || process.env.CBE_RECEIVER_ACCOUNT || '';
    this.apiKey = process.env.VERIFIER_API_KEY || '';
  }

  getReceiverAccount(): string {
    return this.receiverAccount;
  }

  // Get the last 5 digits of the receiver account (required by the API)
  private getAccountSuffix(): string {
    const account = this.receiverAccount.replace(/[\s\-]/g, '');
    return account.slice(-5);
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

      // Basic format validation first
      if (!this.isValidTransactionIdFormat(cleanedId)) {
        return {
          isValid: false,
          error: 'Invalid CBE transaction ID format'
        };
      }

      // Check if API key is configured
      if (!this.apiKey) {
        logger.error('VERIFIER_API_KEY not configured');
        return {
          isValid: false,
          error: 'Payment verification service not configured'
        };
      }

      // Verify using the verify.leul.et API
      const receipt = await this.verifyWithAPI(cleanedId);
      
      if (receipt) {
        // Validate that the receiver matches our expected receiver
        if (!this.validateReceiverMatch(receipt.receiver)) {
          return {
            isValid: false,
            error: 'Payment was not sent to the correct receiver account'
          };
        }

        return {
          isValid: true,
          amount: receipt.amount,
          receiver: receipt.receiver,
          sender: receipt.sender,
          timestamp: receipt.timestamp
        };
      }

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

  private async verifyWithAPI(transactionId: string): Promise<CBEReceiptData | null> {
    try {
      const suffix = this.getAccountSuffix();
      
      if (!suffix || suffix.length !== 5) {
        logger.error('Invalid CBE receiver account - cannot extract suffix');
        throw new Error('Invalid receiver account configuration');
      }

      const response = await fetch(`${VERIFIER_API_BASE}/verify-cbe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        },
        body: JSON.stringify({ 
          reference: transactionId,
          accountSuffix: suffix
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`CBE API error: ${response.status} - ${errorText}`);
        
        if (response.status === 401) {
          throw new Error('Invalid API key');
        }
        if (response.status === 404) {
          return null; // Transaction not found
        }
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json() as Record<string, any>;
      
      // Handle successful response
      if (data && data.success === true) {
        return {
          transactionId: transactionId,
          amount: this.parseAmount(data.amount || '0'),
          sender: data.payer || data.payerAccount || '',
          receiver: data.receiverAccount || data.receiver || '',
          timestamp: data.date ? new Date(data.date) : new Date(),
          status: 'completed'
        };
      }

      // Handle error response from API
      if (data && data.error) {
        logger.warn(`CBE verification failed: ${data.error}`);
      }

      return null;
    } catch (error) {
      logger.error('CBE API request failed:', error);
      throw error;
    }
  }

  private parseAmount(amountStr: string): number {
    if (!amountStr) return 0;
    
    // Handle formats like "101.00 Birr", "3,000.00 ETB", etc.
    const cleanAmount = amountStr.replace(/[^\d.,]/g, '').replace(/,/g, '');
    return parseFloat(cleanAmount) || 0;
  }

  private validateReceiverMatch(receiver: string): boolean {
    if (!receiver || !this.receiverAccount) {
      return false;
    }
    
    const normalizeAccount = (account: string): string => {
      return account.replace(/[\s\-]/g, '');
    };
    
    const actualReceiver = normalizeAccount(receiver);
    const expected = normalizeAccount(this.receiverAccount);
    
    // Check if the receiver matches or ends with the expected account
    return actualReceiver === expected || actualReceiver.endsWith(expected) || expected.endsWith(actualReceiver);
  }

  private isValidTransactionIdFormat(transactionId: string): boolean {
    // CBE transaction IDs are typically alphanumeric
    // Common formats: FT followed by numbers/letters
    const cbePattern = /^(FT)?[A-Z0-9]{8,25}$/;
    return cbePattern.test(transactionId);
  }

  validateReceiver(verification: TransactionVerification, expectedReceiver: string): boolean {
    if (!verification.isValid || !verification.receiver) {
      return false;
    }
    
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
