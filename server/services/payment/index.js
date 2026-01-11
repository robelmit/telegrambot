"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileDeliveryService = exports.WalletService = exports.CBEVerifier = exports.TelebirrVerifier = void 0;
exports.getPaymentVerifier = getPaymentVerifier;
exports.generatePaymentInstructions = generatePaymentInstructions;
exports.isValidTopupAmount = isValidTopupAmount;
exports.getWalletService = getWalletService;
__exportStar(require("./types"), exports);
var telebirrVerifier_1 = require("./telebirrVerifier");
Object.defineProperty(exports, "TelebirrVerifier", { enumerable: true, get: function () { return telebirrVerifier_1.TelebirrVerifier; } });
var cbeVerifier_1 = require("./cbeVerifier");
Object.defineProperty(exports, "CBEVerifier", { enumerable: true, get: function () { return cbeVerifier_1.CBEVerifier; } });
var walletService_1 = require("./walletService");
Object.defineProperty(exports, "WalletService", { enumerable: true, get: function () { return walletService_1.WalletService; } });
var delivery_1 = require("../delivery");
Object.defineProperty(exports, "FileDeliveryService", { enumerable: true, get: function () { return delivery_1.FileDeliveryService; } });
const telebirrVerifier_2 = require("./telebirrVerifier");
const cbeVerifier_2 = require("./cbeVerifier");
const walletService_2 = require("./walletService");
const types_1 = require("../../types");
// Factory function to get the appropriate verifier
function getPaymentVerifier(provider) {
    switch (provider) {
        case 'telebirr':
            return new telebirrVerifier_2.TelebirrVerifier();
        case 'cbe':
            return new cbeVerifier_2.CBEVerifier();
        default:
            throw new Error(`Unknown payment provider: ${provider}`);
    }
}
// Generate payment instructions for user
function generatePaymentInstructions(provider, amount) {
    const telebirrPhone = process.env.TELEBIRR_RECEIVER_PHONE || '09XXXXXXXX';
    const cbeAccount = process.env.CBE_RECEIVER_ACCOUNT || '1000XXXXXXXX';
    const recipientName = process.env.PAYMENT_RECIPIENT_NAME || 'Robel Tsegay';
    if (provider === 'telebirr') {
        return {
            provider,
            amount,
            recipientPhone: telebirrPhone,
            recipientName,
            instructions: `Send ${amount} ETB to ${telebirrPhone} via Telebirr, then submit your transaction ID.`
        };
    }
    else {
        return {
            provider,
            amount,
            recipientAccount: cbeAccount,
            recipientName,
            instructions: `Transfer ${amount} ETB to account ${cbeAccount} via CBE, then submit your transaction ID.`
        };
    }
}
// Validate top-up amount
function isValidTopupAmount(amount) {
    return types_1.TOPUP_AMOUNTS.includes(amount);
}
// Create singleton instances
let walletServiceInstance = null;
function getWalletService() {
    if (!walletServiceInstance) {
        walletServiceInstance = new walletService_2.WalletService();
    }
    return walletServiceInstance;
}
//# sourceMappingURL=index.js.map