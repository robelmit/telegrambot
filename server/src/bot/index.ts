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
  handleHelp,
  handleTemplate,
  handleTemplateCallback,
  handleAgent,
  handleAgentRegister,
  handleAgentCancel,
  handleAgentReferrals,
  handleAgentShare,
  handleAgentWithdraw,
  handleAgentBack,
  // Admin handlers
  handleAdmin,
  handleAdminStats,
  handleAdminUsers,
  handleAdminTransactions,
  handleAdminPendingTx,
  handleAdminApproveTx,
  handleAdminRejectTx,
  handleAdminJobs,
  handleAdminFindUser,
  handleAdminAddBalance,
  handleAdminBan,
  handleAdminUnban,
  handleAdminMakeAdmin,
  handleAdminBroadcast,
  handleAdminBack,
  handleAdminTextInput
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
      awaitingPdf: false,
      selectedTemplate: 'template0'
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
  bot.command('agent', handleAgent);
  bot.command('template', handleTemplate);
  bot.command('admin', handleAdmin);

  // Callback query handlers
  bot.action(/^lang_/, handleLanguageCallback);
  bot.action(/^template_/, handleTemplateCallback);
  bot.action(/^topup_amount_/, handleTopupAmountCallback);
  bot.action(/^topup_provider_/, handleTopupProviderCallback);
  bot.action('topup_cancel', handleTopupCancel);
  bot.action(/^settings_/, handleSettingsCallback);
  
  // Agent callback handlers
  bot.action('agent_register', handleAgentRegister);
  bot.action('agent_cancel', handleAgentCancel);
  bot.action('agent_referrals', handleAgentReferrals);
  bot.action('agent_share', handleAgentShare);
  bot.action('agent_withdraw', handleAgentWithdraw);
  bot.action('agent_back', handleAgentBack);

  // Admin callback handlers
  bot.action('admin_stats', handleAdminStats);
  bot.action('admin_users', handleAdminUsers);
  bot.action('admin_transactions', handleAdminTransactions);
  bot.action('admin_pending_tx', handleAdminPendingTx);
  bot.action(/^admin_approve_(.+)$/, async (ctx) => {
    const txId = ctx.match[1];
    await handleAdminApproveTx(ctx, txId);
  });
  bot.action(/^admin_reject_(.+)$/, async (ctx) => {
    const txId = ctx.match[1];
    await handleAdminRejectTx(ctx, txId);
  });
  bot.action('admin_jobs', handleAdminJobs);
  bot.action('admin_find_user', handleAdminFindUser);
  bot.action('admin_add_balance', handleAdminAddBalance);
  bot.action('admin_ban', handleAdminBan);
  bot.action('admin_unban', handleAdminUnban);
  bot.action('admin_make_admin', handleAdminMakeAdmin);
  bot.action('admin_broadcast', handleAdminBroadcast);
  bot.action('admin_back', handleAdminBack);

  // Document handler (PDF uploads)
  bot.on('document', handleDocument);

  // Text message handler (for transaction IDs and admin input)
  bot.on('text', async (ctx) => {
    // Check if admin action is pending
    if (ctx.session.adminAction) {
      const handled = await handleAdminTextInput(ctx);
      if (handled) return;
    }

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
      [t(lang, 'btn_help')]: () => handleHelp(ctx),
      [t(lang, 'btn_agent')]: () => handleAgent(ctx),
      [t(lang, 'btn_template')]: () => handleTemplate(ctx)
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
    { command: 'template', description: 'Select ID card template' },
    { command: 'agent', description: 'Agent/Referral program' },
    { command: 'language', description: 'Change language' },
    { command: 'settings', description: 'Bot settings' },
    { command: 'help', description: 'Get help' }
  ]);
  logger.info('Bot commands set');

  // Start polling (don't await - it runs forever)
  bot.launch({
    dropPendingUpdates: true
  }).then(() => {
    logger.info('Bot polling started');
  }).catch((err) => {
    logger.error('Bot launch error:', err);
  });
  
  logger.info('Bot started successfully');
}

export async function stopBot(bot: Telegraf<BotContext>): Promise<void> {
  bot.stop('SIGTERM');
  logger.info('Bot stopped');
}

export default { createBot, startBot, stopBot };
