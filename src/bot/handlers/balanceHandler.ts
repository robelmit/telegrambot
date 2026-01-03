import { BotContext } from './types';
import { t } from '../../locales';
import User from '../../models/User';
import Transaction from '../../models/Transaction';
import logger from '../../utils/logger';

export async function handleBalance(ctx: BotContext): Promise<void> {
  const lang = ctx.session.language || 'en';
  const telegramId = ctx.from?.id;

  if (!telegramId) {
    await ctx.reply(t(lang, 'error_user_not_found'));
    return;
  }

  try {
    const user = await User.findOne({ telegramId });
    
    if (!user) {
      await ctx.reply(t(lang, 'error_user_not_found'));
      return;
    }

    // Get recent transactions
    const recentTransactions = await Transaction.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Format balance message
    let message = `💰 ${t(lang, 'your_balance')}\n\n`;
    message += `${t(lang, 'current_balance')}: ${user.walletBalance} ETB\n\n`;

    if (recentTransactions.length > 0) {
      message += `📜 ${t(lang, 'recent_transactions')}:\n`;
      
      for (const tx of recentTransactions) {
        const icon = tx.type === 'credit' ? '➕' : '➖';
        const date = new Date(tx.createdAt).toLocaleDateString();
        message += `${icon} ${tx.amount} ETB - ${tx.provider} (${date})\n`;
      }
    } else {
      message += t(lang, 'no_transactions');
    }

    message += `\n${t(lang, 'topup_hint')}`;

    await ctx.reply(message);
  } catch (error) {
    logger.error('Balance handler error:', error);
    await ctx.reply(t(lang, 'error_fetching_balance'));
  }
}

export default handleBalance;
