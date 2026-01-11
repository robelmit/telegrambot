export * from './types';
export { TelebirrVerifier } from './telebirrVerifier';
export { CBEVerifier } from './cbeVerifier';
export { WalletService } from './walletService';
export { FileDeliveryService } from '../delivery';
import { WalletService } from './walletService';
import { PaymentVerifier, PaymentInstructions } from './types';
import { PaymentProvider, TopupAmount } from '../../types';
export declare function getPaymentVerifier(provider: PaymentProvider): PaymentVerifier;
export declare function generatePaymentInstructions(provider: PaymentProvider, amount: TopupAmount): PaymentInstructions;
export declare function isValidTopupAmount(amount: number): amount is TopupAmount;
export declare function getWalletService(): WalletService;
//# sourceMappingURL=index.d.ts.map