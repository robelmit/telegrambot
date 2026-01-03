import { Telegraf, session } from 'telegraf';
import { BotContext, SessionData } from './handlers/types';
import {
  handleStart,
  handleLanguage,
  handleLanguageCallback,
  handleUpload,
  handleDocument,
  handleBalance,
  handleTopup,
  handleTopupAmountCallback,
  handleTopupProviderCallback,
  handleTransactionIdMessage,
  handleTopupCancel,
  handlePricing,
  handleSettings,
  handleSettingsCallback,
  handleHelp
} from './handlers';
import { t } from '../locales';
import logger from '../utils/logger';
import { getRateLimiter } from '../utils/rateLimiter';
import { getAuditLogger } from '../utils/auditLogger';

export function createBot(token: string): Telegraf<BotContext> {
  const bot = new Telegraf<BotContext>(token);

  // Session middleware
  bot.use(session({
    defaultSession: (): SessionData => ({
      language: 'en',
      awaitingTransactionId: false,
      awaitingPdf: false
    })
  }));

  // Error handling middleware
  bot.catch((err, ctx) => {
    logger.error('Bot error:', err);
    const lang = ctx.session?.language || 'en';
    ctx.reply(t(lang, 'error_general')).catch(() => {});
  });

  // Rate limiting middleware
  bot.use(async (ctx, next) => {
    const telegramId = ctx.from?.id;
    if (telegramId) {
      const rateLimiter = getRateLimiter();
      const result = await rateLimiter.checkLimit(telegramId);
      
      if (!result.allowed) {
        const lang = ctx.session?.language || 'en';
        getAuditLogger().logRateLimit(telegramId, 'general', false);
        await ctx.reply(t(lang, 'error_rate_limit', { seconds: result.retryAfter || 60 }));
        return;
      }
    }
    return next();
  });

  // Command handlers
  bot.command('start', handleStart);
  bot.command('language', handleLanguage);
  bot.command('upload', handleUpload);
  bot.command('balance', handleBalance);
  bot.command('topup', handleTopup);
  bot.command('pricing', handlePricing);
  bot.command('settings', handleSettings);
  bot.command('help', handleHelp);

  // Callback query handlers
  bot.action(/^lang_/, handleLanguageCallback);
  bot.action(/^topup_amount_/, handleTopupAmountCallback);
  bot.action(/^topup_provider_/, handleTopupProviderCallback);
  bot.action('topup_cancel', handleTopupCancel);
  bot.action(/^settings_/, handleSettingsCallback);

  // Document handler (PDF uploads)
  bot.on('document', handleDocument);

  // Text message handler (for transaction IDs)
  bot.on('text', async (ctx) => {
    // Check if awaiting transaction ID
    if (ctx.session.awaitingTransactionId) {
      await handleTransactionIdMessage(ctx);
      return;
    }

    // Handle keyboard button presses
    const text = ctx.message.text;
    const lang = ctx.session.language || 'en';

    // Map button text to commands
    const buttonMap: Record<string, () => Promise<void>> = {
      [t(lang, 'btn_upload')]: () => handleUpload(ctx),
      [t(lang, 'btn_balance')]: () => handleBalance(ctx),
      [t(lang, 'btn_topup')]: () => handleTopup(ctx),
      [t(lang, 'btn_pricing')]: () => handlePricing(ctx),
      [t(lang, 'btn_language')]: () => handleLanguage(ctx),
      [t(lang, 'btn_help')]: () => handleHelp(ctx)
    };

    const handler = buttonMap[text];
    if (handler) {
      await handler();
    }
  });

  return bot;
}

export async function startBot(bot: Telegraf<BotContext>): Promise<void> {
  // Set bot commands
  await bot.telegram.setMyCommands([
    { command: 'start', description: 'Start the bot' },
    { command: 'upload', description: 'Upload eFayda PDF' },
    { command: 'balance', description: 'Check wallet balance' },
    { command: 'topup', description: 'Top up wallet' },
    { command: 'pricing', description: 'View pricing' },
    { command: 'language', description: 'Change language' },
    { command: 'settings', description: 'Bot settings' },
    { command: 'help', description: 'Get help' }
  ]);

  // Start polling
  await bot.launch();
  logger.info('Bot started successfully');
}

export async function stopBot(bot: Telegraf<BotContext>): Promise<void> {
  bot.stop('SIGTERM');
  logger.info('Bot stopped');
}

export default { createBot, startBot, stopBot };
