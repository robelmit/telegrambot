"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBot = createBot;
exports.startBot = startBot;
exports.stopBot = stopBot;
const telegraf_1 = require("telegraf");
const handlers_1 = require("./handlers");
const locales_1 = require("../locales");
const logger_1 = __importDefault(require("../utils/logger"));
const rateLimiter_1 = require("../utils/rateLimiter");
const auditLogger_1 = require("../utils/auditLogger");
function createBot(token) {
    const bot = new telegraf_1.Telegraf(token);
    // Session middleware
    bot.use((0, telegraf_1.session)({
        defaultSession: () => ({
            language: 'en',
            awaitingTransactionId: false,
            awaitingPdf: false
        })
    }));
    // Error handling middleware
    bot.catch((err, ctx) => {
        logger_1.default.error('Bot error:', err);
        const lang = ctx.session?.language || 'en';
        ctx.reply((0, locales_1.t)(lang, 'error_general')).catch(() => { });
    });
    // Rate limiting middleware
    bot.use(async (ctx, next) => {
        const telegramId = ctx.from?.id;
        if (telegramId) {
            const rateLimiter = (0, rateLimiter_1.getRateLimiter)();
            const result = await rateLimiter.checkLimit(telegramId);
            if (!result.allowed) {
                const lang = ctx.session?.language || 'en';
                (0, auditLogger_1.getAuditLogger)().logRateLimit(telegramId, 'general', false);
                await ctx.reply((0, locales_1.t)(lang, 'error_rate_limit', { seconds: result.retryAfter || 60 }));
                return;
            }
        }
        return next();
    });
    // Command handlers
    bot.command('start', handlers_1.handleStart);
    bot.command('language', handlers_1.handleLanguage);
    bot.command('upload', handlers_1.handleUpload);
    bot.command('balance', handlers_1.handleBalance);
    bot.command('topup', handlers_1.handleTopup);
    bot.command('pricing', handlers_1.handlePricing);
    bot.command('settings', handlers_1.handleSettings);
    bot.command('help', handlers_1.handleHelp);
    bot.command('agent', handlers_1.handleAgent);
    bot.command('admin', handlers_1.handleAdmin);
    // Callback query handlers
    bot.action(/^lang_/, handlers_1.handleLanguageCallback);
    bot.action(/^topup_amount_/, handlers_1.handleTopupAmountCallback);
    bot.action(/^topup_provider_/, handlers_1.handleTopupProviderCallback);
    bot.action('topup_cancel', handlers_1.handleTopupCancel);
    bot.action(/^settings_/, handlers_1.handleSettingsCallback);
    // Agent callback handlers
    bot.action('agent_register', handlers_1.handleAgentRegister);
    bot.action('agent_cancel', handlers_1.handleAgentCancel);
    bot.action('agent_referrals', handlers_1.handleAgentReferrals);
    bot.action('agent_share', handlers_1.handleAgentShare);
    bot.action('agent_withdraw', handlers_1.handleAgentWithdraw);
    bot.action('agent_back', handlers_1.handleAgentBack);
    // Admin callback handlers
    bot.action('admin_stats', handlers_1.handleAdminStats);
    bot.action('admin_users', handlers_1.handleAdminUsers);
    bot.action('admin_transactions', handlers_1.handleAdminTransactions);
    bot.action('admin_pending_tx', handlers_1.handleAdminPendingTx);
    bot.action(/^admin_approve_(.+)$/, async (ctx) => {
        const txId = ctx.match[1];
        await (0, handlers_1.handleAdminApproveTx)(ctx, txId);
    });
    bot.action(/^admin_reject_(.+)$/, async (ctx) => {
        const txId = ctx.match[1];
        await (0, handlers_1.handleAdminRejectTx)(ctx, txId);
    });
    bot.action('admin_jobs', handlers_1.handleAdminJobs);
    bot.action('admin_find_user', handlers_1.handleAdminFindUser);
    bot.action('admin_add_balance', handlers_1.handleAdminAddBalance);
    bot.action('admin_ban', handlers_1.handleAdminBan);
    bot.action('admin_unban', handlers_1.handleAdminUnban);
    bot.action('admin_make_admin', handlers_1.handleAdminMakeAdmin);
    bot.action('admin_broadcast', handlers_1.handleAdminBroadcast);
    bot.action('admin_back', handlers_1.handleAdminBack);
    // Document handler (PDF uploads)
    bot.on('document', handlers_1.handleDocument);
    // Text message handler (for transaction IDs and admin input)
    bot.on('text', async (ctx) => {
        // Check if admin action is pending
        if (ctx.session.adminAction) {
            const handled = await (0, handlers_1.handleAdminTextInput)(ctx);
            if (handled)
                return;
        }
        // Check if awaiting transaction ID
        if (ctx.session.awaitingTransactionId) {
            await (0, handlers_1.handleTransactionIdMessage)(ctx);
            return;
        }
        // Handle keyboard button presses
        const text = ctx.message.text;
        const lang = ctx.session.language || 'en';
        // Map button text to commands
        const buttonMap = {
            [(0, locales_1.t)(lang, 'btn_upload')]: () => (0, handlers_1.handleUpload)(ctx),
            [(0, locales_1.t)(lang, 'btn_balance')]: () => (0, handlers_1.handleBalance)(ctx),
            [(0, locales_1.t)(lang, 'btn_topup')]: () => (0, handlers_1.handleTopup)(ctx),
            [(0, locales_1.t)(lang, 'btn_pricing')]: () => (0, handlers_1.handlePricing)(ctx),
            [(0, locales_1.t)(lang, 'btn_language')]: () => (0, handlers_1.handleLanguage)(ctx),
            [(0, locales_1.t)(lang, 'btn_help')]: () => (0, handlers_1.handleHelp)(ctx),
            [(0, locales_1.t)(lang, 'btn_agent')]: () => (0, handlers_1.handleAgent)(ctx)
        };
        const handler = buttonMap[text];
        if (handler) {
            await handler();
        }
    });
    return bot;
}
async function startBot(bot) {
    // Set bot commands
    await bot.telegram.setMyCommands([
        { command: 'start', description: 'Start the bot' },
        { command: 'upload', description: 'Upload eFayda PDF' },
        { command: 'balance', description: 'Check wallet balance' },
        { command: 'topup', description: 'Top up wallet' },
        { command: 'pricing', description: 'View pricing' },
        { command: 'agent', description: 'Agent/Referral program' },
        { command: 'language', description: 'Change language' },
        { command: 'settings', description: 'Bot settings' },
        { command: 'help', description: 'Get help' }
    ]);
    logger_1.default.info('Bot commands set');
    // Start polling (don't await - it runs forever)
    bot.launch({
        dropPendingUpdates: true
    }).then(() => {
        logger_1.default.info('Bot polling started');
    }).catch((err) => {
        logger_1.default.error('Bot launch error:', err);
    });
    logger_1.default.info('Bot started successfully');
}
async function stopBot(bot) {
    bot.stop('SIGTERM');
    logger_1.default.info('Bot stopped');
}
exports.default = { createBot, startBot, stopBot };
//# sourceMappingURL=index.js.map