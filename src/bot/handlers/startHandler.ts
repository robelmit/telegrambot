import { Markup } from 'telegraf';
import { BotContext } from './types';
import { t } from '../../locales';
import User from '../../models/User';
import logger from '../../utils/logger';
import { getAuditLogger } from '../../utils/auditLogger';

export async function handleStart(ctx: BotContext): Promise<void> {
  const telegramId = ctx.from?.id;
  
  if (!telegramId) {
    await ctx.reply('Unable to identify user.');
    return;
  }

  try {
    // Find or create user
    let user = await User.findOne({ telegramId });
    
    if (!user) {
      user = await User.create({
        telegramId,
        language: 'en',
        walletBalance: 0,
        settings: { language: 'en', notifications: true }
      });
      
      getAuditLogger().logAuth('session_created', telegramId, true);
      logger.info(`New user created: ${telegramId}`);
    }

    // Set session data
    ctx.session.userId = user._id.toString();
    ctx.session.language = user.language;

    const lang = user.language;
    const firstName = ctx.from?.first_name || 'User';

    // Welcome message
    const welcomeMessage = t(lang, 'welcome', { name: firstName });
    
    // Main menu keyboard
    const keyboard = Markup.keyboard([
      [t(lang, 'btn_upload'), t(lang, 'btn_balance')],
      [t(lang, 'btn_topup'), t(lang, 'btn_pricing')],
      [t(lang, 'btn_language'), t(lang, 'btn_help')]
    ]).resize();

    await ctx.reply(welcomeMessage, keyboard);

    // Show available commands
    const commandsMessage = `
📋 ${t(lang, 'available_commands')}

/upload - ${t(lang, 'cmd_upload_desc')}
/balance - ${t(lang, 'cmd_balance_desc')}
/topup - ${t(lang, 'cmd_topup_desc')}
/pricing - ${t(lang, 'cmd_pricing_desc')}
/language - ${t(lang, 'cmd_language_desc')}
/help - ${t(lang, 'cmd_help_desc')}
`;

    await ctx.reply(commandsMessage);
  } catch (error) {
    logger.error('Start handler error:', error);
    await ctx.reply('An error occurred. Please try again later.');
  }
}

export default handleStart;
