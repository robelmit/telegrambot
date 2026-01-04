import { Markup } from 'telegraf';
import { BotContext } from './types';
import { t } from '../../locales';
import User from '../../models/User';
import logger from '../../utils/logger';
import config from '../../config';
import { v4 as uuidv4 } from 'uuid';
import { Language } from '../../types';

// Generate a unique agent code
function generateAgentCode(): string {
  return uuidv4().slice(0, 8).toUpperCase();
}

// Handle /agent command - show agent dashboard or register as agent
export async function handleAgent(ctx: BotContext): Promise<void> {
  const lang = (ctx.session.language || 'en') as Language;
  const telegramId = ctx.from?.id;

  if (!telegramId) {
    await ctx.reply(t(lang, 'error_general'));
    return;
  }

  try {
    const user = await User.findOne({ telegramId });
    if (!user) {
      await ctx.reply(t(lang, 'error_user_not_found'));
      return;
    }

    if (user.isAgent) {
      // Show agent dashboard
      await showAgentDashboard(ctx, user, lang);
    } else {
      // Show option to become an agent
      const message = t(lang, 'agent_become_prompt', { 
        commission: config.agentCommissionPercent 
      });
      
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback(t(lang, 'agent_btn_become'), 'agent_register')],
        [Markup.button.callback(t(lang, 'cancel'), 'agent_cancel')]
      ]);

      await ctx.reply(message, keyboard);
    }
  } catch (error) {
    logger.error('Agent handler error:', error);
    await ctx.reply(t(lang, 'error_general'));
  }
}

// Show agent dashboard with stats
async function showAgentDashboard(ctx: BotContext, user: any, lang: Language): Promise<void> {
  const botInfo = await ctx.telegram.getMe();
  const referralLink = `https://t.me/${botInfo.username}?start=ref_${user.agentCode}`;
  
  // Get referral count
  const referralCount = await User.countDocuments({ referredBy: user._id });
  
  const message = t(lang, 'agent_dashboard', {
    code: user.agentCode,
    link: referralLink,
    referrals: referralCount,
    earnings: user.totalEarnings.toFixed(2),
    balance: user.walletBalance.toFixed(2),
    commission: config.agentCommissionPercent
  });

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, 'agent_btn_referrals'), 'agent_referrals')],
    [Markup.button.callback(t(lang, 'agent_btn_withdraw'), 'agent_withdraw')],
    [Markup.button.callback(t(lang, 'agent_btn_share'), 'agent_share')]
  ]);

  await ctx.reply(message, { 
    parse_mode: 'HTML',
    ...keyboard 
  });
}

// Handle agent registration callback
export async function handleAgentRegister(ctx: BotContext): Promise<void> {
  const lang = (ctx.session.language || 'en') as Language;
  const telegramId = ctx.from?.id;

  if (!telegramId) {
    await ctx.answerCbQuery(t(lang, 'error_general'));
    return;
  }

  try {
    await ctx.answerCbQuery();

    const user = await User.findOne({ telegramId });
    if (!user) {
      await ctx.editMessageText(t(lang, 'error_user_not_found'));
      return;
    }

    if (user.isAgent) {
      await ctx.editMessageText(t(lang, 'agent_already_registered'));
      return;
    }

    // Generate unique agent code
    let agentCode = generateAgentCode();
    let attempts = 0;
    while (await User.findOne({ agentCode }) && attempts < 10) {
      agentCode = generateAgentCode();
      attempts++;
    }

    // Update user to agent
    user.isAgent = true;
    user.agentCode = agentCode;
    await user.save();

    const botInfo = await ctx.telegram.getMe();
    const referralLink = `https://t.me/${botInfo.username}?start=ref_${agentCode}`;

    const message = t(lang, 'agent_registered', {
      code: agentCode,
      link: referralLink,
      commission: config.agentCommissionPercent
    });

    await ctx.editMessageText(message, { parse_mode: 'HTML' });
    
    logger.info(`User ${telegramId} registered as agent with code ${agentCode}`);
  } catch (error) {
    logger.error('Agent registration error:', error);
    await ctx.editMessageText(t(lang, 'error_general'));
  }
}

// Handle agent cancel callback
export async function handleAgentCancel(ctx: BotContext): Promise<void> {
  const lang = (ctx.session.language || 'en') as Language;
  await ctx.answerCbQuery();
  await ctx.editMessageText(t(lang, 'agent_cancelled'));
}

// Handle view referrals callback
export async function handleAgentReferrals(ctx: BotContext): Promise<void> {
  const lang = (ctx.session.language || 'en') as Language;
  const telegramId = ctx.from?.id;

  if (!telegramId) {
    await ctx.answerCbQuery(t(lang, 'error_general'));
    return;
  }

  try {
    await ctx.answerCbQuery();

    const user = await User.findOne({ telegramId });
    if (!user || !user.isAgent) {
      await ctx.editMessageText(t(lang, 'error_not_agent'));
      return;
    }

    // Get referrals
    const referrals = await User.find({ referredBy: user._id })
      .select('telegramId createdAt')
      .sort({ createdAt: -1 })
      .limit(20);

    if (referrals.length === 0) {
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback(t(lang, 'back'), 'agent_back')]
      ]);
      await ctx.editMessageText(t(lang, 'agent_no_referrals'), keyboard);
      return;
    }

    let message = t(lang, 'agent_referrals_title') + '\n\n';
    referrals.forEach((ref, index) => {
      const date = ref.createdAt.toLocaleDateString();
      message += `${index + 1}. User #${ref.telegramId.toString().slice(-4)} - ${date}\n`;
    });

    const totalReferrals = await User.countDocuments({ referredBy: user._id });
    message += `\n${t(lang, 'agent_total_referrals', { count: totalReferrals })}`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(t(lang, 'back'), 'agent_back')]
    ]);

    await ctx.editMessageText(message, keyboard);
  } catch (error) {
    logger.error('Agent referrals error:', error);
    await ctx.editMessageText(t(lang, 'error_general'));
  }
}

// Handle share referral link
export async function handleAgentShare(ctx: BotContext): Promise<void> {
  const lang = (ctx.session.language || 'en') as Language;
  const telegramId = ctx.from?.id;

  if (!telegramId) {
    await ctx.answerCbQuery(t(lang, 'error_general'));
    return;
  }

  try {
    await ctx.answerCbQuery();

    const user = await User.findOne({ telegramId });
    if (!user || !user.isAgent) {
      await ctx.reply(t(lang, 'error_not_agent'));
      return;
    }

    const botInfo = await ctx.telegram.getMe();
    const referralLink = `https://t.me/${botInfo.username}?start=ref_${user.agentCode}`;

    const shareMessage = t(lang, 'agent_share_message', {
      link: referralLink,
      commission: config.agentCommissionPercent
    });

    await ctx.reply(shareMessage, { parse_mode: 'HTML' });
  } catch (error) {
    logger.error('Agent share error:', error);
    await ctx.reply(t(lang, 'error_general'));
  }
}

// Handle withdraw (shows balance info)
export async function handleAgentWithdraw(ctx: BotContext): Promise<void> {
  const lang = (ctx.session.language || 'en') as Language;
  const telegramId = ctx.from?.id;

  if (!telegramId) {
    await ctx.answerCbQuery(t(lang, 'error_general'));
    return;
  }

  try {
    await ctx.answerCbQuery();

    const user = await User.findOne({ telegramId });
    if (!user || !user.isAgent) {
      await ctx.editMessageText(t(lang, 'error_not_agent'));
      return;
    }

    const message = t(lang, 'agent_withdraw_info', {
      balance: user.walletBalance.toFixed(2),
      earnings: user.totalEarnings.toFixed(2)
    });

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(t(lang, 'back'), 'agent_back')]
    ]);

    await ctx.editMessageText(message, keyboard);
  } catch (error) {
    logger.error('Agent withdraw error:', error);
    await ctx.editMessageText(t(lang, 'error_general'));
  }
}

// Handle back to agent dashboard
export async function handleAgentBack(ctx: BotContext): Promise<void> {
  const lang = (ctx.session.language || 'en') as Language;
  const telegramId = ctx.from?.id;

  if (!telegramId) {
    await ctx.answerCbQuery(t(lang, 'error_general'));
    return;
  }

  try {
    await ctx.answerCbQuery();

    const user = await User.findOne({ telegramId });
    if (!user) {
      await ctx.editMessageText(t(lang, 'error_user_not_found'));
      return;
    }

    if (user.isAgent) {
      // Delete current message and show dashboard
      await ctx.deleteMessage();
      await showAgentDashboard(ctx, user, lang);
    }
  } catch (error) {
    logger.error('Agent back error:', error);
  }
}

// Process referral when new user joins
export async function processReferral(telegramId: number, referralCode: string): Promise<boolean> {
  try {
    // Find the agent by code
    const agent = await User.findOne({ agentCode: referralCode, isAgent: true });
    if (!agent) {
      logger.warn(`Invalid referral code: ${referralCode}`);
      return false;
    }

    // Don't allow self-referral
    if (agent.telegramId === telegramId) {
      logger.warn(`Self-referral attempt by ${telegramId}`);
      return false;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ telegramId });
    if (existingUser) {
      logger.info(`User ${telegramId} already exists, skipping referral`);
      return false;
    }

    logger.info(`User ${telegramId} referred by agent ${agent.telegramId} (code: ${referralCode})`);
    return true;
  } catch (error) {
    logger.error('Process referral error:', error);
    return false;
  }
}

// Credit agent commission when referred user makes a purchase
export async function creditAgentCommission(userId: string, amount: number): Promise<void> {
  try {
    const user = await User.findById(userId);
    if (!user || !user.referredBy) {
      return;
    }

    const agent = await User.findById(user.referredBy);
    if (!agent || !agent.isAgent) {
      return;
    }

    const commission = (amount * config.agentCommissionPercent) / 100;
    
    agent.walletBalance += commission;
    agent.totalEarnings += commission;
    agent.totalReferrals = await User.countDocuments({ referredBy: agent._id });
    await agent.save();

    logger.info(`Credited ${commission} ETB commission to agent ${agent.telegramId} for user ${user.telegramId}`);
  } catch (error) {
    logger.error('Credit agent commission error:', error);
  }
}

export default {
  handleAgent,
  handleAgentRegister,
  handleAgentCancel,
  handleAgentReferrals,
  handleAgentShare,
  handleAgentWithdraw,
  handleAgentBack,
  processReferral,
  creditAgentCommission
};
