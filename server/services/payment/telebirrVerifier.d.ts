import { PaymentVerifier } from './types';
import { TransactionVerification } from '../../types';
export declare class TelebirrVerifier implements PaymentVerifier {
    private receiverPhone;
    private apiKey;
    constructor(expectedReceiver?: string);
    getReceiverPhone(): string;
    verify(transactionId: string): Promise<TransactionVerification>;
    private verifyWithAPI;
    private parseAmount;
    private validateReceiverMatch;
    private isValidTransactionIdFormat;
    validateReceiver(verification: TransactionVerification, expectedReceiver: string): boolean;
    validateAmount(verification: TransactionVerification, expectedAmount: number): boolean;
}
export default TelebirrVerifier;
//# sourceMappingURL=telebirrVerifier.d.ts.map