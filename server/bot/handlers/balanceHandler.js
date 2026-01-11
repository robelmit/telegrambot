"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleBalance = handleBalance;
const locales_1 = require("../../locales");
const User_1 = __importDefault(require("../../models/User"));
const Transaction_1 = __importDefault(require("../../models/Transaction"));
const logger_1 = __importDefault(require("../../utils/logger"));
async function handleBalance(ctx) {
    const lang = ctx.session.language || 'en';
    const telegramId = ctx.from?.id;
    if (!telegramId) {
        await ctx.reply((0, locales_1.t)(lang, 'error_user_not_found'));
        return;
    }
    try {
        const user = await User_1.default.findOne({ telegramId });
        if (!user) {
            await ctx.reply((0, locales_1.t)(lang, 'error_user_not_found'));
            return;
        }
        // Get recent transactions
        const recentTransactions = await Transaction_1.default.find({ userId: user._id })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();
        // Format balance message
        let message = `💰 ${(0, locales_1.t)(lang, 'your_balance')}\n\n`;
        message += `${(0, locales_1.t)(lang, 'current_balance')}: ${user.walletBalance} ETB\n\n`;
        if (recentTransactions.length > 0) {
            message += `📜 ${(0, locales_1.t)(lang, 'recent_transactions')}:\n`;
            for (const tx of recentTransactions) {
                const icon = tx.type === 'credit' ? '➕' : '➖';
                const date = new Date(tx.createdAt).toLocaleDateString();
                message += `${icon} ${tx.amount} ETB - ${tx.provider} (${date})\n`;
            }
        }
        else {
            message += (0, locales_1.t)(lang, 'no_transactions');
        }
        message += `\n${(0, locales_1.t)(lang, 'topup_hint')}`;
        await ctx.reply(message);
    }
    catch (error) {
        logger_1.default.error('Balance handler error:', error);
        await ctx.reply((0, locales_1.t)(lang, 'error_fetching_balance'));
    }
}
exports.default = handleBalance;
//# sourceMappingURL=balanceHandler.js.map