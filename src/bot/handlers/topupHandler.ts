import { Markup } from 'telegraf';
import { BotContext } from './types';
import { t } from '../../locales';
import { TOPUP_AMOUNTS, TopupAmount, PaymentProvider } from '../../types';
import { getPaymentVerifier, generatePaymentInstructions, WalletService } from '../../services/payment';
import User from '../../models/User';
import logger from '../../utils/logger';
import { getAuditLogger } from '../../utils/auditLogger';
import { isValidTransactionId, isValidTopupAmount } from '../../utils/validator';

const walletService = new WalletService();

export async function handleTopup(ctx: BotContext): Promise<void> {
  const lang = ctx.session.language || 'en';

  // Show amount selection
  const amountButtons = TOPUP_AMOUNTS.map(amount => 
    Markup.button.callback(`${amount} ETB`, `topup_amount_${amount}`)
  );

  // Arrange in 2 columns
  const keyboard = Markup.inlineKeyboard([
    amountButtons.slice(0, 2),
    amountButtons.slice(2, 4),
    amountButtons.slice(4, 6),
    amountButtons.slice(6, 8)
  ]);

  await ctx.reply(t(lang, 'select_topup_amount'), keyboard);
}

export async function handleTopupAmountCallback(ctx: BotContext): Promise<void> {
  const lang = ctx.session.language || 'en';
  const callbackData = (ctx.callbackQuery as any)?.data;

  if (!callbackData || !callbackData.startsWith('topup_amount_')) {
    return;
  }

  const amount = parseInt(callbackData.replace('topup_amount_', ''), 10);

  if (!isValidTopupAmount(amount)) {
    await ctx.answerCbQuery(t(lang, 'error_invalid_amount'));
    return;
  }

  ctx.session.selectedAmount = amount;

  // Show provider selection
  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('📱 Telebirr', 'topup_provider_telebirr'),
      Markup.button.callback('🏦 CBE Birr', 'topup_provider_cbe')
    ]
  ]);

  await ctx.answerCbQuery();
  await ctx.editMessageText(
    t(lang, 'select_payment_provider', { amount }),
    keyboard
  );
}

export async function handleTopupProviderCallback(ctx: BotContext): Promise<void> {
  const lang = ctx.session.language || 'en';
  const callbackData = (ctx.callbackQuery as any)?.data;

  if (!callbackData || !callbackData.startsWith('topup_provider_')) {
    return;
  }

  const provider = callbackData.replace('topup_provider_', '') as PaymentProvider;
  const amount = ctx.session.selectedAmount;

  if (!amount || !isValidTopupAmount(amount)) {
    await ctx.answerCbQuery(t(lang, 'error_session_expired'));
    return;
  }

  ctx.session.selectedProvider = provider;
  ctx.session.awaitingTransactionId = true;

  // Generate payment instructions
  const instructions = generatePaymentInstructions(provider, amount as TopupAmount);

  let message = `💳 ${t(lang, 'payment_instructions')}\n\n`;
  message += `${t(lang, 'amount')}: ${amount} ETB\n`;
  message += `${t(lang, 'provider')}: ${provider === 'telebirr' ? 'Telebirr' : 'CBE Birr'}\n\n`;
  
  if (provider === 'telebirr') {
    message += `📱 ${t(lang, 'send_to_phone')}: ${instructions.recipientPhone}\n`;
  } else {
    message += `🏦 ${t(lang, 'transfer_to_account')}: ${instructions.recipientAccount}\n`;
  }
  
  message += `👤 ${t(lang, 'recipient_name')}: ${instructions.recipientName}\n\n`;
  message += `📝 ${instructions.instructions}\n\n`;
  message += `⏳ ${t(lang, 'send_transaction_id')}`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback(`❌ ${t(lang, 'cancel')}`, 'topup_cancel')]
  ]);

  await ctx.answerCbQuery();
  await ctx.editMessageText(message, keyboard);
}

export async function handleTransactionIdMessage(ctx: BotContext): Promise<void> {
  const lang = ctx.session.language || 'en';
  const telegramId = ctx.from?.id;
  const message = (ctx.message as any)?.text;

  if (!ctx.session.awaitingTransactionId || !message) {
    return;
  }

  if (!telegramId) {
    await ctx.reply(t(lang, 'error_user_not_found'));
    return;
  }

  const transactionId = message.trim();

  if (!isValidTransactionId(transactionId)) {
    await ctx.reply(t(lang, 'error_invalid_transaction_id'));
    return;
  }

  const provider = ctx.session.selectedProvider;
  const amount = ctx.session.selectedAmount;

  if (!provider || !amount) {
    await ctx.reply(t(lang, 'error_session_expired'));
    ctx.session.awaitingTransactionId = false;
    return;
  }

  try {
    const user = await User.findOne({ telegramId });
    if (!user) {
      await ctx.reply(t(lang, 'error_user_not_found'));
      return;
    }

    // Check if transaction ID already used
    const isUsed = await walletService.isTransactionUsed(transactionId, provider);
    if (isUsed) {
      getAuditLogger().logPayment('topup_failed', user._id.toString(), {
        amount,
        provider,
        transactionId,
        success: false,
        error: 'Transaction ID already used'
      });
      await ctx.reply(t(lang, 'error_transaction_used'));
      return;
    }

    // Verify transaction
    const verifier = getPaymentVerifier(provider);
    const verification = await verifier.verify(transactionId);

    if (!verification.isValid) {
      getAuditLogger().logPayment('topup_failed', user._id.toString(), {
        amount,
        provider,
        transactionId,
        success: false,
        error: verification.error
      });
      await ctx.reply(t(lang, 'error_verification_failed', { error: verification.error }));
      return;
    }

    // Credit wallet
    await walletService.credit(user._id.toString(), amount, transactionId, provider);

    getAuditLogger().logPayment('topup_verified', user._id.toString(), {
      amount,
      provider,
      transactionId,
      success: true
    });

    // Get updated balance
    const newBalance = await walletService.getBalance(user._id.toString());

    await ctx.reply(t(lang, 'topup_success', { amount, balance: newBalance }));

    logger.info(`Topup successful: user=${telegramId}, amount=${amount}, provider=${provider}`);
  } catch (error) {
    logger.error('Transaction verification error:', error);
    await ctx.reply(t(lang, 'error_processing_payment'));
  } finally {
    // Reset session state
    ctx.session.awaitingTransactionId = false;
    ctx.session.selectedProvider = undefined;
    ctx.session.selectedAmount = undefined;
  }
}

export async function handleTopupCancel(ctx: BotContext): Promise<void> {
  const lang = ctx.session.language || 'en';

  ctx.session.awaitingTransactionId = false;
  ctx.session.selectedProvider = undefined;
  ctx.session.selectedAmount = undefined;

  await ctx.answerCbQuery(t(lang, 'topup_cancelled'));
  await ctx.editMessageText(t(lang, 'topup_cancelled_message'));
}

export default {
  handleTopup,
  handleTopupAmountCallback,
  handleTopupProviderCallback,
  handleTransactionIdMessage,
  handleTopupCancel
};
