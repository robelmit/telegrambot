import { PaymentProvider, TransactionVerification, TopupAmount } from '../../types';

export interface PaymentVerifier {
  verify(transactionId: string): Promise<TransactionVerification>;
  validateReceiver(verification: TransactionVerification, expectedReceiver: string): boolean;
  validateAmount(verification: TransactionVerification, expectedAmount: number): boolean;
}

export interface WalletService {
  getBalance(userId: string): Promise<number>;
  credit(userId: string, amount: number, transactionId: string, provider: PaymentProvider): Promise<void>;
  debit(userId: string, amount: number, jobId: string): Promise<boolean>;
  refund(userId: string, amount: number, jobId: string): Promise<void>;
  getTransactionHistory(userId: string, limit?: number): Promise<WalletTransactionRecord[]>;
  isTransactionUsed(transactionId: string, provider: PaymentProvider): Promise<boolean>;
  markTransactionUsed(transactionId: string, provider: PaymentProvider, userId: string, amount: number): Promise<void>;
}

export interface WalletTransactionRecord {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  provider: PaymentProvider | 'system';
  reference: string;
  timestamp: Date;
}

export interface PaymentInstructions {
  provider: PaymentProvider;
  amount: TopupAmount;
  recipientPhone?: string;
  recipientAccount?: string;
  recipientName: string;
  instructions: string;
}

// Telebirr receipt parsed data
export interface TelebirrReceiptData {
  transactionId: string;
  amount: number;
  sender: string;
  receiver: string;
  timestamp: Date;
  status: string;
}

// CBE receipt parsed data
export interface CBEReceiptData {
  transactionId: string;
  amount: number;
  sender: string;
  receiver: string;
  timestamp: Date;
  status: string;
}
