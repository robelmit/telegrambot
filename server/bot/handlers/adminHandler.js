"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminOnly = adminOnly;
exports.handleAdmin = handleAdmin;
exports.handleAdminStats = handleAdminStats;
exports.handleAdminUsers = handleAdminUsers;
exports.handleAdminTransactions = handleAdminTransactions;
exports.handleAdminPendingTx = handleAdminPendingTx;
exports.handleAdminApproveTx = handleAdminApproveTx;
exports.handleAdminRejectTx = handleAdminRejectTx;
exports.handleAdminJobs = handleAdminJobs;
exports.handleAdminFindUser = handleAdminFindUser;
exports.handleAdminAddBalance = handleAdminAddBalance;
exports.handleAdminBan = handleAdminBan;
exports.handleAdminUnban = handleAdminUnban;
exports.handleAdminMakeAdmin = handleAdminMakeAdmin;
exports.handleAdminBroadcast = handleAdminBroadcast;
exports.handleAdminBack = handleAdminBack;
exports.handleAdminTextInput = handleAdminTextInput;
const User_1 = require("../../models/User");
const Job_1 = require("../../models/Job");
const Transaction_1 = require("../../models/Transaction");
const logger_1 = __importDefault(require("../../utils/logger"));
const config_1 = require("../../config");
// Admin Telegram IDs (set in .env)
const ADMIN_IDS = (process.env.ADMIN_TELEGRAM_IDS || '')
    .split(',')
    .map(id => parseInt(id.trim(), 10))
    .filter(id => !isNaN(id));
// Check if user is admin
async function isAdmin(telegramId) {
    // Check env-based admin list first
    if (ADMIN_IDS.includes(telegramId))
        return true;
    // Check database
    const user = await User_1.User.findOne({ telegramId });
    return user?.isAdmin === true;
}
// Admin middleware
async function adminOnly(ctx, next) {
    const telegramId = ctx.from?.id;
    if (!telegramId || !(await isAdmin(telegramId))) {
        await ctx.reply('⛔ Access denied. Admin only.');
        return;
    }
    return next();
}
// Main admin panel
async function handleAdmin(ctx) {
    const telegramId = ctx.from?.id;
    if (!telegramId || !(await isAdmin(telegramId))) {
        await ctx.reply('⛔ Access denied.');
        return;
    }
    const keyboard = {
        inline_keyboard: [
            [
                { text: '📊 Stats', callback_data: 'admin_stats' },
                { text: '👥 Users', callback_data: 'admin_users' }
            ],
            [
                { text: '💰 Transactions', callback_data: 'admin_transactions' },
                { text: '📋 Jobs', callback_data: 'admin_jobs' }
            ],
            [
                { text: '🔍 Find User', callback_data: 'admin_find_user' },
                { text: '💵 Add Balance', callback_data: 'admin_add_balance' }
            ],
            [
                { text: '🚫 Ban User', callback_data: 'admin_ban' },
                { text: '✅ Unban User', callback_data: 'admin_unban' }
            ],
            [
                { text: '👑 Make Admin', callback_data: 'admin_make_admin' },
                { text: '📢 Broadcast', callback_data: 'admin_broadcast' }
            ]
        ]
    };
    await ctx.reply('🔐 *Admin Panel*\n\nSelect an option:', {
        parse_mode: 'Markdown',
        reply_markup: keyboard
    });
}
// Stats overview
async function handleAdminStats(ctx) {
    const telegramId = ctx.from?.id;
    if (!telegramId || !(await isAdmin(telegramId)))
        return;
    try {
        const [totalUsers, totalAgents, totalAdmins, bannedUsers, totalJobs, completedJobs, pendingJobs, totalTransactions, pendingTransactions, totalRevenue] = await Promise.all([
            User_1.User.countDocuments(),
            User_1.User.countDocuments({ isAgent: true }),
            User_1.User.countDocuments({ isAdmin: true }),
            User_1.User.countDocuments({ isBanned: true }),
            Job_1.Job.countDocuments(),
            Job_1.Job.countDocuments({ status: 'completed' }),
            Job_1.Job.countDocuments({ status: 'pending' }),
            Transaction_1.Transaction.countDocuments(),
            Transaction_1.Transaction.countDocuments({ status: 'pending' }),
            Transaction_1.Transaction.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ])
        ]);
        const revenue = totalRevenue[0]?.total || 0;
        const stats = `📊 *Bot Statistics*

👥 *Users*
├ Total: ${totalUsers}
├ Agents: ${totalAgents}
├ Admins: ${totalAdmins}
└ Banned: ${bannedUsers}

📋 *Jobs*
├ Total: ${totalJobs}
├ Completed: ${completedJobs}
└ Pending: ${pendingJobs}

💰 *Transactions*
├ Total: ${totalTransactions}
├ Pending: ${pendingTransactions}
└ Revenue: ${revenue} ETB

⚙️ *Config*
├ Service Fee: ${config_1.config.serviceFee} ETB
└ Agent Commission: ${config_1.config.agentCommissionPercent}%`;
        await ctx.editMessageText(stats, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[{ text: '« Back', callback_data: 'admin_back' }]]
            }
        });
    }
    catch (error) {
        logger_1.default.error('Admin stats error:', error);
        await ctx.reply('Error fetching stats.');
    }
}
// Recent users list
async function handleAdminUsers(ctx) {
    const telegramId = ctx.from?.id;
    if (!telegramId || !(await isAdmin(telegramId)))
        return;
    try {
        const users = await User_1.User.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select('telegramId walletBalance isAgent isAdmin isBanned createdAt');
        let message = '👥 *Recent Users (Last 10)*\n\n';
        for (const user of users) {
            const flags = [
                user.isAdmin ? '👑' : '',
                user.isAgent ? '🤝' : '',
                user.isBanned ? '🚫' : ''
            ].filter(Boolean).join('');
            message += `• \`${user.telegramId}\` ${flags}\n`;
            message += `  Balance: ${user.walletBalance} ETB\n`;
            message += `  Joined: ${user.createdAt.toLocaleDateString()}\n\n`;
        }
        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[{ text: '« Back', callback_data: 'admin_back' }]]
            }
        });
    }
    catch (error) {
        logger_1.default.error('Admin users error:', error);
        await ctx.reply('Error fetching users.');
    }
}
// Recent transactions
async function handleAdminTransactions(ctx) {
    const telegramId = ctx.from?.id;
    if (!telegramId || !(await isAdmin(telegramId)))
        return;
    try {
        const transactions = await Transaction_1.Transaction.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select('telegramId amount status provider createdAt');
        let message = '💰 *Recent Transactions (Last 10)*\n\n';
        for (const tx of transactions) {
            const statusIcon = tx.status === 'completed' ? '✅' : tx.status === 'pending' ? '⏳' : '❌';
            message += `${statusIcon} \`${tx.telegramId}\`\n`;
            message += `   ${tx.amount} ETB via ${tx.provider}\n`;
            message += `   ${tx.createdAt.toLocaleString()}\n\n`;
        }
        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '⏳ Pending Only', callback_data: 'admin_pending_tx' }],
                    [{ text: '« Back', callback_data: 'admin_back' }]
                ]
            }
        });
    }
    catch (error) {
        logger_1.default.error('Admin transactions error:', error);
        await ctx.reply('Error fetching transactions.');
    }
}
// Pending transactions (for manual approval)
async function handleAdminPendingTx(ctx) {
    const telegramId = ctx.from?.id;
    if (!telegramId || !(await isAdmin(telegramId)))
        return;
    try {
        const transactions = await Transaction_1.Transaction.find({ status: 'pending' })
            .sort({ createdAt: -1 })
            .limit(20);
        if (transactions.length === 0) {
            await ctx.editMessageText('✅ No pending transactions.', {
                reply_markup: {
                    inline_keyboard: [[{ text: '« Back', callback_data: 'admin_transactions' }]]
                }
            });
            return;
        }
        let message = '⏳ *Pending Transactions*\n\n';
        const buttons = [];
        for (const tx of transactions) {
            message += `• \`${tx.transactionId || 'N/A'}\`\n`;
            message += `  User: \`${tx.telegramId}\`\n`;
            message += `  Amount: ${tx.amount} ETB (${tx.provider})\n\n`;
            buttons.push([
                { text: `✅ Approve ${tx.transactionId?.slice(-6) || 'N/A'}`, callback_data: `admin_approve_${tx._id}` },
                { text: `❌ Reject`, callback_data: `admin_reject_${tx._id}` }
            ]);
        }
        buttons.push([{ text: '« Back', callback_data: 'admin_transactions' }]);
        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: buttons }
        });
    }
    catch (error) {
        logger_1.default.error('Admin pending tx error:', error);
        await ctx.reply('Error fetching pending transactions.');
    }
}
// Approve transaction
async function handleAdminApproveTx(ctx, txId) {
    const telegramId = ctx.from?.id;
    if (!telegramId || !(await isAdmin(telegramId)))
        return;
    try {
        const tx = await Transaction_1.Transaction.findById(txId);
        if (!tx) {
            await ctx.answerCbQuery('Transaction not found');
            return;
        }
        // Update transaction status
        tx.status = 'completed';
        tx.verifiedAt = new Date();
        tx.verifiedBy = telegramId;
        await tx.save();
        // Add balance to user
        await User_1.User.findOneAndUpdate({ telegramId: tx.telegramId }, { $inc: { walletBalance: tx.amount } });
        // Notify user
        try {
            await ctx.telegram.sendMessage(tx.telegramId, `✅ Your top-up of ${tx.amount} ETB has been approved!\n\nYour balance has been updated.`);
        }
        catch (e) {
            // User may have blocked the bot
        }
        await ctx.answerCbQuery('✅ Transaction approved!');
        logger_1.default.info(`Admin ${telegramId} approved transaction ${txId}`);
        // Refresh the list
        await handleAdminPendingTx(ctx);
    }
    catch (error) {
        logger_1.default.error('Admin approve tx error:', error);
        await ctx.answerCbQuery('Error approving transaction');
    }
}
// Reject transaction
async function handleAdminRejectTx(ctx, txId) {
    const telegramId = ctx.from?.id;
    if (!telegramId || !(await isAdmin(telegramId)))
        return;
    try {
        const tx = await Transaction_1.Transaction.findById(txId);
        if (!tx) {
            await ctx.answerCbQuery('Transaction not found');
            return;
        }
        tx.status = 'failed';
        tx.verifiedAt = new Date();
        tx.verifiedBy = telegramId;
        await tx.save();
        // Notify user
        try {
            await ctx.telegram.sendMessage(tx.telegramId, `❌ Your top-up of ${tx.amount} ETB was rejected.\n\nPlease contact support if you believe this is an error.`);
        }
        catch (e) {
            // User may have blocked the bot
        }
        await ctx.answerCbQuery('❌ Transaction rejected');
        logger_1.default.info(`Admin ${telegramId} rejected transaction ${txId}`);
        await handleAdminPendingTx(ctx);
    }
    catch (error) {
        logger_1.default.error('Admin reject tx error:', error);
        await ctx.answerCbQuery('Error rejecting transaction');
    }
}
// Recent jobs
async function handleAdminJobs(ctx) {
    const telegramId = ctx.from?.id;
    if (!telegramId || !(await isAdmin(telegramId)))
        return;
    try {
        const jobs = await Job_1.Job.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select('telegramId status createdAt completedAt');
        let message = '📋 *Recent Jobs (Last 10)*\n\n';
        for (const job of jobs) {
            const statusIcon = job.status === 'completed' ? '✅' : job.status === 'pending' ? '⏳' : '❌';
            message += `${statusIcon} \`${job.telegramId}\`\n`;
            message += `   Status: ${job.status}\n`;
            message += `   Created: ${job.createdAt.toLocaleString()}\n\n`;
        }
        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[{ text: '« Back', callback_data: 'admin_back' }]]
            }
        });
    }
    catch (error) {
        logger_1.default.error('Admin jobs error:', error);
        await ctx.reply('Error fetching jobs.');
    }
}
// Find user prompt
async function handleAdminFindUser(ctx) {
    const telegramId = ctx.from?.id;
    if (!telegramId || !(await isAdmin(telegramId)))
        return;
    ctx.session.adminAction = 'find_user';
    await ctx.editMessageText('🔍 *Find User*\n\nSend the Telegram ID of the user you want to find:', {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[{ text: '« Cancel', callback_data: 'admin_back' }]]
        }
    });
}
// Add balance prompt
async function handleAdminAddBalance(ctx) {
    const telegramId = ctx.from?.id;
    if (!telegramId || !(await isAdmin(telegramId)))
        return;
    ctx.session.adminAction = 'add_balance';
    await ctx.editMessageText('💵 *Add Balance*\n\nSend in format:\n`TELEGRAM_ID AMOUNT`\n\nExample: `123456789 100`', {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[{ text: '« Cancel', callback_data: 'admin_back' }]]
        }
    });
}
// Ban user prompt
async function handleAdminBan(ctx) {
    const telegramId = ctx.from?.id;
    if (!telegramId || !(await isAdmin(telegramId)))
        return;
    ctx.session.adminAction = 'ban_user';
    await ctx.editMessageText('🚫 *Ban User*\n\nSend in format:\n`TELEGRAM_ID REASON`\n\nExample: `123456789 Spam`', {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[{ text: '« Cancel', callback_data: 'admin_back' }]]
        }
    });
}
// Unban user prompt
async function handleAdminUnban(ctx) {
    const telegramId = ctx.from?.id;
    if (!telegramId || !(await isAdmin(telegramId)))
        return;
    ctx.session.adminAction = 'unban_user';
    await ctx.editMessageText('✅ *Unban User*\n\nSend the Telegram ID of the user to unban:', {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[{ text: '« Cancel', callback_data: 'admin_back' }]]
        }
    });
}
// Make admin prompt
async function handleAdminMakeAdmin(ctx) {
    const telegramId = ctx.from?.id;
    if (!telegramId || !(await isAdmin(telegramId)))
        return;
    ctx.session.adminAction = 'make_admin';
    await ctx.editMessageText('👑 *Make Admin*\n\nSend the Telegram ID of the user to make admin:', {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[{ text: '« Cancel', callback_data: 'admin_back' }]]
        }
    });
}
// Broadcast prompt
async function handleAdminBroadcast(ctx) {
    const telegramId = ctx.from?.id;
    if (!telegramId || !(await isAdmin(telegramId)))
        return;
    ctx.session.adminAction = 'broadcast';
    await ctx.editMessageText('📢 *Broadcast Message*\n\nSend the message you want to broadcast to all users:\n\n⚠️ This will send to ALL users!', {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[{ text: '« Cancel', callback_data: 'admin_back' }]]
        }
    });
}
// Back to admin panel
async function handleAdminBack(ctx) {
    ctx.session.adminAction = undefined;
    await handleAdmin(ctx);
}
// Handle admin text input
async function handleAdminTextInput(ctx) {
    const telegramId = ctx.from?.id;
    if (!telegramId || !(await isAdmin(telegramId)))
        return false;
    const action = ctx.session.adminAction;
    if (!action)
        return false;
    const text = ctx.message?.text?.trim();
    if (!text)
        return false;
    try {
        switch (action) {
            case 'find_user': {
                const userId = parseInt(text, 10);
                if (isNaN(userId)) {
                    await ctx.reply('❌ Invalid Telegram ID. Please send a number.');
                    return true;
                }
                const user = await User_1.User.findOne({ telegramId: userId });
                if (!user) {
                    await ctx.reply('❌ User not found.');
                    return true;
                }
                const flags = [
                    user.isAdmin ? '👑 Admin' : '',
                    user.isAgent ? '🤝 Agent' : '',
                    user.isBanned ? '🚫 Banned' : ''
                ].filter(Boolean).join(', ') || 'Regular user';
                await ctx.reply(`👤 *User Details*\n\n` +
                    `ID: \`${user.telegramId}\`\n` +
                    `Status: ${flags}\n` +
                    `Balance: ${user.walletBalance} ETB\n` +
                    `Orders: ${user.totalOrders || 0}\n` +
                    `Language: ${user.language}\n` +
                    `Joined: ${user.createdAt.toLocaleDateString()}\n` +
                    (user.isBanned ? `Ban Reason: ${user.banReason}\n` : ''), { parse_mode: 'Markdown' });
                ctx.session.adminAction = undefined;
                return true;
            }
            case 'add_balance': {
                const parts = text.split(/\s+/);
                if (parts.length < 2) {
                    await ctx.reply('❌ Invalid format. Use: TELEGRAM_ID AMOUNT');
                    return true;
                }
                const userId = parseInt(parts[0], 10);
                const amount = parseFloat(parts[1]);
                if (isNaN(userId) || isNaN(amount) || amount <= 0) {
                    await ctx.reply('❌ Invalid ID or amount.');
                    return true;
                }
                const user = await User_1.User.findOneAndUpdate({ telegramId: userId }, { $inc: { walletBalance: amount } }, { new: true });
                if (!user) {
                    await ctx.reply('❌ User not found.');
                    return true;
                }
                // Notify user
                try {
                    await ctx.telegram.sendMessage(userId, `💰 Your balance has been credited with ${amount} ETB by admin.\n\nNew balance: ${user.walletBalance} ETB`);
                }
                catch (e) { }
                await ctx.reply(`✅ Added ${amount} ETB to user ${userId}.\nNew balance: ${user.walletBalance} ETB`);
                logger_1.default.info(`Admin ${telegramId} added ${amount} ETB to user ${userId}`);
                ctx.session.adminAction = undefined;
                return true;
            }
            case 'ban_user': {
                const parts = text.split(/\s+/);
                const userId = parseInt(parts[0], 10);
                const reason = parts.slice(1).join(' ') || 'No reason provided';
                if (isNaN(userId)) {
                    await ctx.reply('❌ Invalid Telegram ID.');
                    return true;
                }
                const user = await User_1.User.findOneAndUpdate({ telegramId: userId }, { isBanned: true, banReason: reason }, { new: true });
                if (!user) {
                    await ctx.reply('❌ User not found.');
                    return true;
                }
                // Notify user
                try {
                    await ctx.telegram.sendMessage(userId, `🚫 Your account has been banned.\n\nReason: ${reason}\n\nContact support if you believe this is an error.`);
                }
                catch (e) { }
                await ctx.reply(`🚫 User ${userId} has been banned.\nReason: ${reason}`);
                logger_1.default.info(`Admin ${telegramId} banned user ${userId}: ${reason}`);
                ctx.session.adminAction = undefined;
                return true;
            }
            case 'unban_user': {
                const userId = parseInt(text, 10);
                if (isNaN(userId)) {
                    await ctx.reply('❌ Invalid Telegram ID.');
                    return true;
                }
                const user = await User_1.User.findOneAndUpdate({ telegramId: userId }, { isBanned: false, banReason: null }, { new: true });
                if (!user) {
                    await ctx.reply('❌ User not found.');
                    return true;
                }
                // Notify user
                try {
                    await ctx.telegram.sendMessage(userId, '✅ Your account has been unbanned. Welcome back!');
                }
                catch (e) { }
                await ctx.reply(`✅ User ${userId} has been unbanned.`);
                logger_1.default.info(`Admin ${telegramId} unbanned user ${userId}`);
                ctx.session.adminAction = undefined;
                return true;
            }
            case 'make_admin': {
                const userId = parseInt(text, 10);
                if (isNaN(userId)) {
                    await ctx.reply('❌ Invalid Telegram ID.');
                    return true;
                }
                const user = await User_1.User.findOneAndUpdate({ telegramId: userId }, { isAdmin: true }, { new: true });
                if (!user) {
                    await ctx.reply('❌ User not found.');
                    return true;
                }
                // Notify user
                try {
                    await ctx.telegram.sendMessage(userId, '👑 You have been granted admin privileges!');
                }
                catch (e) { }
                await ctx.reply(`👑 User ${userId} is now an admin.`);
                logger_1.default.info(`Admin ${telegramId} made user ${userId} an admin`);
                ctx.session.adminAction = undefined;
                return true;
            }
            case 'broadcast': {
                const users = await User_1.User.find({ isBanned: false }).select('telegramId');
                let sent = 0;
                let failed = 0;
                await ctx.reply(`📢 Broadcasting to ${users.length} users...`);
                for (const user of users) {
                    try {
                        await ctx.telegram.sendMessage(user.telegramId, text);
                        sent++;
                        // Small delay to avoid rate limits
                        await new Promise(r => setTimeout(r, 50));
                    }
                    catch (e) {
                        failed++;
                    }
                }
                await ctx.reply(`📢 Broadcast complete!\n✅ Sent: ${sent}\n❌ Failed: ${failed}`);
                logger_1.default.info(`Admin ${telegramId} broadcast message to ${sent} users`);
                ctx.session.adminAction = undefined;
                return true;
            }
        }
    }
    catch (error) {
        logger_1.default.error('Admin text input error:', error);
        await ctx.reply('❌ An error occurred.');
    }
    return false;
}
//# sourceMappingURL=adminHandler.js.map