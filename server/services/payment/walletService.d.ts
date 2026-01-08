import { WalletService as IWalletService, WalletTransactionRecord } from './types';
import { PaymentProvider } from '../../types';
export declare class WalletService implements IWalletService {
    private servicePrice;
    constructor(servicePrice?: number);
    getBalance(userId: string): Promise<number>;
    getBalanceByTelegramId(telegramId: number): Promise<number>;
    credit(userId: string, amount: number, transactionId: string, provider: PaymentProvider): Promise<void>;
    debit(userId: string, amount: number, jobId: string): Promise<boolean>;
    refund(userId: string, amount: number, jobId: string): Promise<void>;
    getTransactionHistory(userId: string, limit?: number): Promise<WalletTransactionRecord[]>;
    isTransactionUsed(transactionId: string, provider: PaymentProvider): Promise<boolean>;
    markTransactionUsed(transactionId: string, provider: PaymentProvider, userId: string, amount: number): Promise<void>;
    hasSufficientBalance(userId: string, amount?: number): Promise<boolean>;
    getServicePrice(): number;
}
export default WalletService;
//# sourceMappingURL=walletService.d.ts.map