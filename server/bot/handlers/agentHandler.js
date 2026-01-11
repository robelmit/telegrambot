"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAgent = handleAgent;
exports.handleAgentRegister = handleAgentRegister;
exports.handleAgentCancel = handleAgentCancel;
exports.handleAgentReferrals = handleAgentReferrals;
exports.handleAgentShare = handleAgentShare;
exports.handleAgentWithdraw = handleAgentWithdraw;
exports.handleAgentBack = handleAgentBack;
exports.processReferral = processReferral;
exports.creditAgentCommission = creditAgentCommission;
const telegraf_1 = require("telegraf");
const locales_1 = require("../../locales");
const User_1 = __importDefault(require("../../models/User"));
const logger_1 = __importDefault(require("../../utils/logger"));
const config_1 = __importDefault(require("../../config"));
const uuid_1 = require("uuid");
// Generate a unique agent code
function generateAgentCode() {
    return (0, uuid_1.v4)().slice(0, 8).toUpperCase();
}
// Handle /agent command - show agent dashboard or register as agent
async function handleAgent(ctx) {
    const lang = (ctx.session.language || 'en');
    const telegramId = ctx.from?.id;
    if (!telegramId) {
        await ctx.reply((0, locales_1.t)(lang, 'error_general'));
        return;
    }
    try {
        const user = await User_1.default.findOne({ telegramId });
        if (!user) {
            await ctx.reply((0, locales_1.t)(lang, 'error_user_not_found'));
            return;
        }
        if (user.isAgent) {
            // Show agent dashboard
            await showAgentDashboard(ctx, user, lang);
        }
        else {
            // Show option to become an agent
            const message = (0, locales_1.t)(lang, 'agent_become_prompt', {
                commission: config_1.default.agentCommissionPercent
            });
            const keyboard = telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback((0, locales_1.t)(lang, 'agent_btn_become'), 'agent_register')],
                [telegraf_1.Markup.button.callback((0, locales_1.t)(lang, 'cancel'), 'agent_cancel')]
            ]);
            await ctx.reply(message, keyboard);
        }
    }
    catch (error) {
        logger_1.default.error('Agent handler error:', error);
        await ctx.reply((0, locales_1.t)(lang, 'error_general'));
    }
}
// Show agent dashboard with stats
async function showAgentDashboard(ctx, user, lang) {
    const botInfo = await ctx.telegram.getMe();
    const referralLink = `https://t.me/${botInfo.username}?start=ref_${user.agentCode}`;
    // Get referral count
    const referralCount = await User_1.default.countDocuments({ referredBy: user._id });
    const message = (0, locales_1.t)(lang, 'agent_dashboard', {
        code: user.agentCode,
        link: referralLink,
        referrals: referralCount,
        earnings: user.totalEarnings.toFixed(2),
        balance: user.walletBalance.toFixed(2),
        commission: config_1.default.agentCommissionPercent
    });
    const keyboard = telegraf_1.Markup.inlineKeyboard([
        [telegraf_1.Markup.button.callback((0, locales_1.t)(lang, 'agent_btn_referrals'), 'agent_referrals')],
        [telegraf_1.Markup.button.callback((0, locales_1.t)(lang, 'agent_btn_withdraw'), 'agent_withdraw')],
        [telegraf_1.Markup.button.callback((0, locales_1.t)(lang, 'agent_btn_share'), 'agent_share')]
    ]);
    await ctx.reply(message, {
        parse_mode: 'HTML',
        ...keyboard
    });
}
// Handle agent registration callback
async function handleAgentRegister(ctx) {
    const lang = (ctx.session.language || 'en');
    const telegramId = ctx.from?.id;
    if (!telegramId) {
        await ctx.answerCbQuery((0, locales_1.t)(lang, 'error_general'));
        return;
    }
    try {
        await ctx.answerCbQuery();
        const user = await User_1.default.findOne({ telegramId });
        if (!user) {
            await ctx.editMessageText((0, locales_1.t)(lang, 'error_user_not_found'));
            return;
        }
        if (user.isAgent) {
            await ctx.editMessageText((0, locales_1.t)(lang, 'agent_already_registered'));
            return;
        }
        // Generate unique agent code
        let agentCode = generateAgentCode();
        let attempts = 0;
        while (await User_1.default.findOne({ agentCode }) && attempts < 10) {
            agentCode = generateAgentCode();
            attempts++;
        }
        // Update user to agent
        user.isAgent = true;
        user.agentCode = agentCode;
        await user.save();
        const botInfo = await ctx.telegram.getMe();
        const referralLink = `https://t.me/${botInfo.username}?start=ref_${agentCode}`;
        const message = (0, locales_1.t)(lang, 'agent_registered', {
            code: agentCode,
            link: referralLink,
            commission: config_1.default.agentCommissionPercent
        });
        await ctx.editMessageText(message, { parse_mode: 'HTML' });
        logger_1.default.info(`User ${telegramId} registered as agent with code ${agentCode}`);
    }
    catch (error) {
        logger_1.default.error('Agent registration error:', error);
        await ctx.editMessageText((0, locales_1.t)(lang, 'error_general'));
    }
}
// Handle agent cancel callback
async function handleAgentCancel(ctx) {
    const lang = (ctx.session.language || 'en');
    await ctx.answerCbQuery();
    await ctx.editMessageText((0, locales_1.t)(lang, 'agent_cancelled'));
}
// Handle view referrals callback
async function handleAgentReferrals(ctx) {
    const lang = (ctx.session.language || 'en');
    const telegramId = ctx.from?.id;
    if (!telegramId) {
        await ctx.answerCbQuery((0, locales_1.t)(lang, 'error_general'));
        return;
    }
    try {
        await ctx.answerCbQuery();
        const user = await User_1.default.findOne({ telegramId });
        if (!user || !user.isAgent) {
            await ctx.editMessageText((0, locales_1.t)(lang, 'error_not_agent'));
            return;
        }
        // Get referrals
        const referrals = await User_1.default.find({ referredBy: user._id })
            .select('telegramId createdAt')
            .sort({ createdAt: -1 })
            .limit(20);
        if (referrals.length === 0) {
            const keyboard = telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback((0, locales_1.t)(lang, 'back'), 'agent_back')]
            ]);
            await ctx.editMessageText((0, locales_1.t)(lang, 'agent_no_referrals'), keyboard);
            return;
        }
        let message = (0, locales_1.t)(lang, 'agent_referrals_title') + '\n\n';
        referrals.forEach((ref, index) => {
            const date = ref.createdAt.toLocaleDateString();
            message += `${index + 1}. User #${ref.telegramId.toString().slice(-4)} - ${date}\n`;
        });
        const totalReferrals = await User_1.default.countDocuments({ referredBy: user._id });
        message += `\n${(0, locales_1.t)(lang, 'agent_total_referrals', { count: totalReferrals })}`;
        const keyboard = telegraf_1.Markup.inlineKeyboard([
            [telegraf_1.Markup.button.callback((0, locales_1.t)(lang, 'back'), 'agent_back')]
        ]);
        await ctx.editMessageText(message, keyboard);
    }
    catch (error) {
        logger_1.default.error('Agent referrals error:', error);
        await ctx.editMessageText((0, locales_1.t)(lang, 'error_general'));
    }
}
// Handle share referral link
async function handleAgentShare(ctx) {
    const lang = (ctx.session.language || 'en');
    const telegramId = ctx.from?.id;
    if (!telegramId) {
        await ctx.answerCbQuery((0, locales_1.t)(lang, 'error_general'));
        return;
    }
    try {
        await ctx.answerCbQuery();
        const user = await User_1.default.findOne({ telegramId });
        if (!user || !user.isAgent) {
            await ctx.reply((0, locales_1.t)(lang, 'error_not_agent'));
            return;
        }
        const botInfo = await ctx.telegram.getMe();
        const referralLink = `https://t.me/${botInfo.username}?start=ref_${user.agentCode}`;
        const shareMessage = (0, locales_1.t)(lang, 'agent_share_message', {
            link: referralLink,
            commission: config_1.default.agentCommissionPercent
        });
        await ctx.reply(shareMessage, { parse_mode: 'HTML' });
    }
    catch (error) {
        logger_1.default.error('Agent share error:', error);
        await ctx.reply((0, locales_1.t)(lang, 'error_general'));
    }
}
// Handle withdraw (shows balance info)
async function handleAgentWithdraw(ctx) {
    const lang = (ctx.session.language || 'en');
    const telegramId = ctx.from?.id;
    if (!telegramId) {
        await ctx.answerCbQuery((0, locales_1.t)(lang, 'error_general'));
        return;
    }
    try {
        await ctx.answerCbQuery();
        const user = await User_1.default.findOne({ telegramId });
        if (!user || !user.isAgent) {
            await ctx.editMessageText((0, locales_1.t)(lang, 'error_not_agent'));
            return;
        }
        const message = (0, locales_1.t)(lang, 'agent_withdraw_info', {
            balance: user.walletBalance.toFixed(2),
            earnings: user.totalEarnings.toFixed(2)
        });
        const keyboard = telegraf_1.Markup.inlineKeyboard([
            [telegraf_1.Markup.button.callback((0, locales_1.t)(lang, 'back'), 'agent_back')]
        ]);
        await ctx.editMessageText(message, keyboard);
    }
    catch (error) {
        logger_1.default.error('Agent withdraw error:', error);
        await ctx.editMessageText((0, locales_1.t)(lang, 'error_general'));
    }
}
// Handle back to agent dashboard
async function handleAgentBack(ctx) {
    const lang = (ctx.session.language || 'en');
    const telegramId = ctx.from?.id;
    if (!telegramId) {
        await ctx.answerCbQuery((0, locales_1.t)(lang, 'error_general'));
        return;
    }
    try {
        await ctx.answerCbQuery();
        const user = await User_1.default.findOne({ telegramId });
        if (!user) {
            await ctx.editMessageText((0, locales_1.t)(lang, 'error_user_not_found'));
            return;
        }
        if (user.isAgent) {
            // Delete current message and show dashboard
            await ctx.deleteMessage();
            await showAgentDashboard(ctx, user, lang);
        }
    }
    catch (error) {
        logger_1.default.error('Agent back error:', error);
    }
}
// Process referral when new user joins
async function processReferral(telegramId, referralCode) {
    try {
        // Find the agent by code
        const agent = await User_1.default.findOne({ agentCode: referralCode, isAgent: true });
        if (!agent) {
            logger_1.default.warn(`Invalid referral code: ${referralCode}`);
            return false;
        }
        // Don't allow self-referral
        if (agent.telegramId === telegramId) {
            logger_1.default.warn(`Self-referral attempt by ${telegramId}`);
            return false;
        }
        // Check if user already exists
        const existingUser = await User_1.default.findOne({ telegramId });
        if (existingUser) {
            logger_1.default.info(`User ${telegramId} already exists, skipping referral`);
            return false;
        }
        logger_1.default.info(`User ${telegramId} referred by agent ${agent.telegramId} (code: ${referralCode})`);
        return true;
    }
    catch (error) {
        logger_1.default.error('Process referral error:', error);
        return false;
    }
}
// Credit agent commission when referred user makes a purchase
async function creditAgentCommission(userId, amount) {
    try {
        const user = await User_1.default.findById(userId);
        if (!user || !user.referredBy) {
            return;
        }
        const agent = await User_1.default.findById(user.referredBy);
        if (!agent || !agent.isAgent) {
            return;
        }
        const commission = (amount * config_1.default.agentCommissionPercent) / 100;
        agent.walletBalance += commission;
        agent.totalEarnings += commission;
        agent.totalReferrals = await User_1.default.countDocuments({ referredBy: agent._id });
        await agent.save();
        logger_1.default.info(`Credited ${commission} ETB commission to agent ${agent.telegramId} for user ${user.telegramId}`);
    }
    catch (error) {
        logger_1.default.error('Credit agent commission error:', error);
    }
}
exports.default = {
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
//# sourceMappingURL=agentHandler.js.map