"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSettings = handleSettings;
exports.handleSettingsCallback = handleSettingsCallback;
const telegraf_1 = require("telegraf");
const locales_1 = require("../../locales");
const User_1 = __importDefault(require("../../models/User"));
const logger_1 = __importDefault(require("../../utils/logger"));
async function handleSettings(ctx) {
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
        const langNames = {
            en: '🇬🇧 English',
            am: '🇪🇹 አማርኛ',
            ti: '🇪🇹 ትግርኛ'
        };
        let message = `⚙️ ${(0, locales_1.t)(lang, 'settings_title')}\n\n`;
        message += `🌐 ${(0, locales_1.t)(lang, 'current_language')}: ${langNames[user.language]}\n`;
        message += `🔔 ${(0, locales_1.t)(lang, 'notifications')}: ${user.settings.notifications ? '✅' : '❌'}\n`;
        const keyboard = telegraf_1.Markup.inlineKeyboard([
            [telegraf_1.Markup.button.callback(`🌐 ${(0, locales_1.t)(lang, 'change_language')}`, 'settings_language')],
            [telegraf_1.Markup.button.callback(`🔔 ${user.settings.notifications ? (0, locales_1.t)(lang, 'disable_notifications') : (0, locales_1.t)(lang, 'enable_notifications')}`, 'settings_toggle_notifications')]
        ]);
        await ctx.reply(message, keyboard);
    }
    catch (error) {
        logger_1.default.error('Settings handler error:', error);
        await ctx.reply((0, locales_1.t)(lang, 'error_loading_settings'));
    }
}
async function handleSettingsCallback(ctx) {
    const lang = ctx.session.language || 'en';
    const callbackData = ctx.callbackQuery?.data;
    const telegramId = ctx.from?.id;
    if (!telegramId || !callbackData) {
        return;
    }
    try {
        if (callbackData === 'settings_language') {
            // Redirect to language handler
            const keyboard = telegraf_1.Markup.inlineKeyboard([
                [
                    telegraf_1.Markup.button.callback('🇬🇧 English', 'lang_en'),
                    telegraf_1.Markup.button.callback('🇪🇹 አማርኛ', 'lang_am'),
                    telegraf_1.Markup.button.callback('🇪🇹 ትግርኛ', 'lang_ti')
                ]
            ]);
            await ctx.answerCbQuery();
            await ctx.editMessageText((0, locales_1.t)(lang, 'select_language'), keyboard);
        }
        else if (callbackData === 'settings_toggle_notifications') {
            const user = await User_1.default.findOne({ telegramId });
            if (!user) {
                await ctx.answerCbQuery((0, locales_1.t)(lang, 'error_user_not_found'));
                return;
            }
            const newValue = !user.settings.notifications;
            await User_1.default.findOneAndUpdate({ telegramId }, { 'settings.notifications': newValue });
            await ctx.answerCbQuery(newValue ? (0, locales_1.t)(lang, 'notifications_enabled') : (0, locales_1.t)(lang, 'notifications_disabled'));
            // Refresh settings view
            await handleSettings(ctx);
        }
    }
    catch (error) {
        logger_1.default.error('Settings callback error:', error);
        await ctx.answerCbQuery((0, locales_1.t)(lang, 'error_updating_settings'));
    }
}
exports.default = { handleSettings, handleSettingsCallback };
//# sourceMappingURL=settingsHandler.js.map