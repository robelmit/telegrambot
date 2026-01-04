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
    // Check for referral code in start parameter
    const startPayload = (ctx.message as any)?.text?.split(' ')[1] || '';
    let referralCode: string | null = null;
    let referringAgent: any = null;

    if (startPayload.startsWith('ref_')) {
      referralCode = startPayload.replace('ref_', '');
      // Find the referring agent
      referringAgent = await User.findOne({ agentCode: referralCode, isAgent: true });
    }

    // Find or create user
    let user = await User.findOne({ telegramId });
    let isNewUser = false;
    
    if (!user) {
      isNewUser = true;
      const userData: any = {
        telegramId,
        language: 'en',
        walletBalance: 0,
        settings: { language: 'en', notifications: true }
      };

      // If valid referral, link the user to the agent
      if (referringAgent && referringAgent.telegramId !== telegramId) {
        userData.referredBy = referringAgent._id;
        userData.referredByTelegramId = referringAgent.telegramId;
        logger.info(`New user ${telegramId} referred by agent ${referringAgent.telegramId}`);
      }

      user = await User.create(userData);
      
      getAuditLogger().logAuth('session_created', telegramId, true);
      logger.info(`New user created: ${telegramId}`);

      // Notify agent of new referral
      if (referringAgent) {
        try {
          await ctx.telegram.sendMessage(
            referringAgent.telegramId,
            t(referringAgent.language || 'en', 'agent_new_referral', {
              userId: telegramId.toString().slice(-4)
            })
          );
        } catch (notifyError) {
          logger.warn(`Failed to notify agent ${referringAgent.telegramId} of new referral`);
        }
      }
    }

    // Set session data
    ctx.session.userId = user._id.toString();
    ctx.session.language = user.language;

    const lang = user.language;
    const firstName = ctx.from?.first_name || 'User';

    // Welcome message
    let welcomeMessage = t(lang, 'welcome', { name: firstName });
    
    // Add referral welcome if new user was referred
    if (isNewUser && referringAgent) {
      welcomeMessage += '\n\n' + t(lang, 'welcome_referred');
    }
    
    // Main menu keyboard
    const keyboard = Markup.keyboard([
      [t(lang, 'btn_upload'), t(lang, 'btn_balance')],
      [t(lang, 'btn_topup'), t(lang, 'btn_pricing')],
      [t(lang, 'btn_agent'), t(lang, 'btn_language')],
      [t(lang, 'btn_help')]
    ]).resize();

    await ctx.reply(welcomeMessage, keyboard);

    // Show available commands
    const commandsMessage = `
📋 ${t(lang, 'available_commands')}

/upload - ${t(lang, 'cmd_upload_desc')}
/balance - ${t(lang, 'cmd_balance_desc')}
/topup - ${t(lang, 'cmd_topup_desc')}
/pricing - ${t(lang, 'cmd_pricing_desc')}
/agent - ${t(lang, 'cmd_agent_desc')}
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
