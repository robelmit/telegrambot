export * from './types';
export { TelebirrVerifier } from './telebirrVerifier';
export { CBEVerifier } from './cbeVerifier';
export { WalletService } from './walletService';
export { FileDeliveryService } from '../delivery';

import { TelebirrVerifier } from './telebirrVerifier';
import { CBEVerifier } from './cbeVerifier';
import { WalletService } from './walletService';
import { PaymentVerifier, PaymentInstructions } from './types';
import { PaymentProvider, TopupAmount, TOPUP_AMOUNTS } from '../../types';

// Factory function to get the appropriate verifier
export function getPaymentVerifier(provider: PaymentProvider): PaymentVerifier {
  switch (provider) {
    case 'telebirr':
      return new TelebirrVerifier();
    case 'cbe':
      return new CBEVerifier();
    default:
      throw new Error(`Unknown payment provider: ${provider}`);
  }
}

// Generate payment instructions for user
export function generatePaymentInstructions(
  provider: PaymentProvider,
  amount: TopupAmount
): PaymentInstructions {
  const telebirrPhone = process.env.TELEBIRR_RECEIVER_PHONE || '09XXXXXXXX';
  const cbeAccount = process.env.CBE_RECEIVER_ACCOUNT || '1000XXXXXXXX';
  const recipientName = process.env.PAYMENT_RECIPIENT_NAME || 'eFayda ID Service';

  if (provider === 'telebirr') {
    return {
      provider,
      amount,
      recipientPhone: telebirrPhone,
      recipientName,
      instructions: `Send ${amount} ETB to ${telebirrPhone} via Telebirr, then submit your transaction ID.`
    };
  } else {
    return {
      provider,
      amount,
      recipientAccount: cbeAccount,
      recipientName,
      instructions: `Transfer ${amount} ETB to account ${cbeAccount} via CBE Birr, then submit your transaction ID.`
    };
  }
}

// Validate top-up amount
export function isValidTopupAmount(amount: number): amount is TopupAmount {
  return TOPUP_AMOUNTS.includes(amount as TopupAmount);
}

// Create singleton instances
let walletServiceInstance: WalletService | null = null;

export function getWalletService(): WalletService {
  if (!walletServiceInstance) {
    walletServiceInstance = new WalletService();
  }
  return walletServiceInstance;
}
