"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTopup = handleTopup;
exports.handleTopupAmountCallback = handleTopupAmountCallback;
exports.handleTopupProviderCallback = handleTopupProviderCallback;
exports.handleTransactionIdMessage = handleTransactionIdMessage;
exports.handleTopupCancel = handleTopupCancel;
const telegraf_1 = require("telegraf");
const locales_1 = require("../../locales");
const types_1 = require("../../types");
const payment_1 = require("../../services/payment");
const User_1 = __importDefault(require("../../models/User"));
const logger_1 = __importDefault(require("../../utils/logger"));
const auditLogger_1 = require("../../utils/auditLogger");
const validator_1 = require("../../utils/validator");
const walletService = new payment_1.WalletService();
async function handleTopup(ctx) {
    const lang = ctx.session.language || 'en';
    // Show amount selection
    const amountButtons = types_1.TOPUP_AMOUNTS.map(amount => telegraf_1.Markup.button.callback(`${amount} ETB`, `topup_amount_${amount}`));
    // Arrange in 2 columns
    const keyboard = telegraf_1.Markup.inlineKeyboard([
        amountButtons.slice(0, 2),
        amountButtons.slice(2, 4),
        amountButtons.slice(4, 6),
        amountButtons.slice(6, 8)
    ]);
    await ctx.reply((0, locales_1.t)(lang, 'select_topup_amount'), keyboard);
}
async function handleTopupAmountCallback(ctx) {
    const lang = ctx.session.language || 'en';
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData || !callbackData.startsWith('topup_amount_')) {
        return;
    }
    const amount = parseInt(callbackData.replace('topup_amount_', ''), 10);
    if (!(0, validator_1.isValidTopupAmount)(amount)) {
        await ctx.answerCbQuery((0, locales_1.t)(lang, 'error_invalid_amount'));
        return;
    }
    ctx.session.selectedAmount = amount;
    // Show provider selection
    const keyboard = telegraf_1.Markup.inlineKeyboard([
        [
            telegraf_1.Markup.button.callback('📱 Telebirr', 'topup_provider_telebirr'),
            telegraf_1.Markup.button.callback('🏦 CBE', 'topup_provider_cbe')
        ]
    ]);
    await ctx.answerCbQuery();
    await ctx.editMessageText((0, locales_1.t)(lang, 'select_payment_provider', { amount }), keyboard);
}
async function handleTopupProviderCallback(ctx) {
    const lang = ctx.session.language || 'en';
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData || !callbackData.startsWith('topup_provider_')) {
        return;
    }
    const provider = callbackData.replace('topup_provider_', '');
    const amount = ctx.session.selectedAmount;
    if (!amount || !(0, validator_1.isValidTopupAmount)(amount)) {
        await ctx.answerCbQuery((0, locales_1.t)(lang, 'error_session_expired'));
        return;
    }
    ctx.session.selectedProvider = provider;
    ctx.session.awaitingTransactionId = true;
    // Generate payment instructions
    const instructions = (0, payment_1.generatePaymentInstructions)(provider, amount);
    let message = `💳 ${(0, locales_1.t)(lang, 'payment_instructions')}\n\n`;
    message += `${(0, locales_1.t)(lang, 'amount')}: ${amount} ETB\n`;
    message += `${(0, locales_1.t)(lang, 'provider')}: ${provider === 'telebirr' ? 'Telebirr' : 'CBE'}\n\n`;
    if (provider === 'telebirr') {
        message += `📱 ${(0, locales_1.t)(lang, 'send_to_phone')}: ${instructions.recipientPhone}\n`;
    }
    else {
        message += `🏦 ${(0, locales_1.t)(lang, 'transfer_to_account')}: ${instructions.recipientAccount}\n`;
    }
    message += `👤 ${(0, locales_1.t)(lang, 'recipient_name')}: ${instructions.recipientName}\n\n`;
    message += `📝 ${instructions.instructions}\n\n`;
    message += `⏳ ${(0, locales_1.t)(lang, 'send_transaction_id')}`;
    const keyboard = telegraf_1.Markup.inlineKeyboard([
        [telegraf_1.Markup.button.callback(`❌ ${(0, locales_1.t)(lang, 'cancel')}`, 'topup_cancel')]
    ]);
    await ctx.answerCbQuery();
    await ctx.editMessageText(message, keyboard);
}
async function handleTransactionIdMessage(ctx) {
    const lang = ctx.session.language || 'en';
    const telegramId = ctx.from?.id;
    const message = ctx.message?.text;
    if (!ctx.session.awaitingTransactionId || !message) {
        return;
    }
    if (!telegramId) {
        await ctx.reply((0, locales_1.t)(lang, 'error_user_not_found'));
        return;
    }
    const transactionId = message.trim();
    if (!(0, validator_1.isValidTransactionId)(transactionId)) {
        await ctx.reply((0, locales_1.t)(lang, 'error_invalid_transaction_id'));
        return;
    }
    const provider = ctx.session.selectedProvider;
    const amount = ctx.session.selectedAmount;
    if (!provider || !amount) {
        await ctx.reply((0, locales_1.t)(lang, 'error_session_expired'));
        ctx.session.awaitingTransactionId = false;
        return;
    }
    try {
        const user = await User_1.default.findOne({ telegramId });
        if (!user) {
            await ctx.reply((0, locales_1.t)(lang, 'error_user_not_found'));
            return;
        }
        // Check if transaction ID already used
        const isUsed = await walletService.isTransactionUsed(transactionId, provider);
        if (isUsed) {
            (0, auditLogger_1.getAuditLogger)().logPayment('topup_failed', user._id.toString(), {
                amount,
                provider,
                transactionId,
                success: false,
                error: 'Transaction ID already used'
            });
            await ctx.reply((0, locales_1.t)(lang, 'error_transaction_used'));
            return;
        }
        // Verify transaction
        const verifier = (0, payment_1.getPaymentVerifier)(provider);
        const verification = await verifier.verify(transactionId);
        if (!verification.isValid) {
            (0, auditLogger_1.getAuditLogger)().logPayment('topup_failed', user._id.toString(), {
                amount,
                provider,
                transactionId,
                success: false,
                error: verification.error || 'Verification failed'
            });
            await ctx.reply((0, locales_1.t)(lang, 'error_verification_failed', { error: verification.error || 'Verification failed' }));
            return;
        }
        // Credit wallet
        await walletService.credit(user._id.toString(), amount, transactionId, provider);
        (0, auditLogger_1.getAuditLogger)().logPayment('topup_verified', user._id.toString(), {
            amount,
            provider,
            transactionId,
            success: true
        });
        // Get updated balance
        const newBalance = await walletService.getBalance(user._id.toString());
        await ctx.reply((0, locales_1.t)(lang, 'topup_success', { amount, balance: newBalance }));
        logger_1.default.info(`Topup successful: user=${telegramId}, amount=${amount}, provider=${provider}`);
    }
    catch (error) {
        logger_1.default.error('Transaction verification error:', error);
        await ctx.reply((0, locales_1.t)(lang, 'error_processing_payment'));
    }
    finally {
        // Reset session state
        ctx.session.awaitingTransactionId = false;
        ctx.session.selectedProvider = undefined;
        ctx.session.selectedAmount = undefined;
    }
}
async function handleTopupCancel(ctx) {
    const lang = ctx.session.language || 'en';
    ctx.session.awaitingTransactionId = false;
    ctx.session.selectedProvider = undefined;
    ctx.session.selectedAmount = undefined;
    await ctx.answerCbQuery((0, locales_1.t)(lang, 'topup_cancelled'));
    await ctx.editMessageText((0, locales_1.t)(lang, 'topup_cancelled_message'));
}
exports.default = {
    handleTopup,
    handleTopupAmountCallback,
    handleTopupProviderCallback,
    handleTransactionIdMessage,
    handleTopupCancel
};
//# sourceMappingURL=topupHandler.js.map