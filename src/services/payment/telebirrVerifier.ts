import { PaymentVerifier, TelebirrReceiptData } from './types';
import { TransactionVerification } from '../../types';
import logger from '../../utils/logger';

const VERIFIER_API_BASE = 'https://verifyapi.leulzenebe.pro';

export class TelebirrVerifier implements PaymentVerifier {
  private receiverPhone: string;
  private apiKey: string;

  constructor(expectedReceiver?: string) {
    this.receiverPhone = expectedReceiver || process.env.TELEBIRR_RECEIVER_PHONE || '';
    this.apiKey = process.env.VERIFIER_API_KEY || '';
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

      // Basic format validation first
      if (!this.isValidTransactionIdFormat(cleanedId)) {
        return {
          isValid: false,
          error: 'Invalid Telebirr transaction ID format'
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
        // Validate that the receiver matches our expected receiver (skip if not configured)
        if (this.receiverPhone && !this.validateReceiverMatch(receipt.receiver)) {
          return {
            isValid: false,
            error: 'Payment was not sent to the correct receiver'
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
      logger.error('Telebirr verification error:', error);
      return {
        isValid: false,
        error: 'Verification service temporarily unavailable'
      };
    }
  }

  private async verifyWithAPI(transactionId: string): Promise<TelebirrReceiptData | null> {
    try {
      const response = await fetch(`${VERIFIER_API_BASE}/verify-telebirr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        },
        body: JSON.stringify({ reference: transactionId })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Telebirr API error: ${response.status} - ${errorText}`);
        
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
        const responseData = data.data || data;
        return {
          transactionId: transactionId,
          amount: this.parseAmount(responseData.totalPaidAmount || responseData.amount || '0'),
          sender: responseData.payerName || responseData.payer || '',
          receiver: responseData.creditedPartyAccountNo || responseData.receiverAccount || '',
          timestamp: responseData.paymentDate ? new Date(responseData.paymentDate) : 
                    (responseData.date ? new Date(responseData.date) : new Date()),
          status: responseData.transactionStatus || responseData.status || 'completed'
        };
      }

      // Handle error response from API
      if (data && data.error) {
        logger.warn(`Telebirr verification failed: ${data.error}`);
      }

      return null;
    } catch (error) {
      logger.error('Telebirr API request failed:', error);
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
    if (!this.receiverPhone) {
      return true; // Skip validation if no expected receiver configured
    }
    if (!receiver) {
      return false;
    }
    
    const normalizePhone = (phone: string): string => {
      // Remove masking asterisks and normalize
      return phone.replace(/[\s\-\+\*]/g, '').replace(/^251/, '').replace(/^0/, '');
    };
    
    const actualReceiver = normalizePhone(receiver);
    const expected = normalizePhone(this.receiverPhone);
    
    // Check if last 4 digits match (for masked numbers)
    if (actualReceiver.length >= 4 && expected.length >= 4) {
      const actualLast4 = actualReceiver.slice(-4);
      const expectedLast4 = expected.slice(-4);
      if (actualLast4 === expectedLast4) {
        return true;
      }
    }
    
    return actualReceiver === expected;
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
