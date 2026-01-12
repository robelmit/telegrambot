"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleLanguage = handleLanguage;
exports.handleLanguageCallback = handleLanguageCallback;
const telegraf_1 = require("telegraf");
const locales_1 = require("../../locales");
const User_1 = __importDefault(require("../../models/User"));
const logger_1 = __importDefault(require("../../utils/logger"));
async function handleLanguage(ctx) {
    const lang = ctx.session.language || 'en';
    const keyboard = telegraf_1.Markup.inlineKeyboard([
        [
            telegraf_1.Markup.button.callback('🇬🇧 English', 'lang_en'),
            telegraf_1.Markup.button.callback('🇪🇹 አማርኛ', 'lang_am'),
            telegraf_1.Markup.button.callback('🇪🇹 ትግርኛ', 'lang_ti')
        ]
    ]);
    await ctx.reply((0, locales_1.t)(lang, 'select_language'), keyboard);
}
async function handleLanguageCallback(ctx) {
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData || !callbackData.startsWith('lang_')) {
        return;
    }
    const newLang = callbackData.replace('lang_', '');
    if (!locales_1.SUPPORTED_LANGUAGES.includes(newLang)) {
        await ctx.answerCbQuery('Invalid language selection');
        return;
    }
    const telegramId = ctx.from?.id;
    if (!telegramId) {
        await ctx.answerCbQuery('Error: User not found');
        return;
    }
    try {
        // Update user language in database
        await User_1.default.findOneAndUpdate({ telegramId }, {
            language: newLang,
            'settings.language': newLang
        });
        // Update session
        ctx.session.language = newLang;
        // Confirm change
        await ctx.answerCbQuery((0, locales_1.t)(newLang, 'language_changed'));
        // Update the message
        const langNames = {
            en: '🇬🇧 English',
            am: '🇪🇹 አማርኛ (Amharic)',
            ti: '🇪🇹 ትግርኛ (Tigrigna)'
        };
        await ctx.editMessageText(`✅ ${(0, locales_1.t)(newLang, 'language_set_to')} ${langNames[newLang]}`);
        // Show updated main menu - Bulk on top row, no Pricing button
        const keyboard = telegraf_1.Markup.keyboard([
            [(0, locales_1.t)(newLang, 'btn_upload'), (0, locales_1.t)(newLang, 'btn_bulk')],
            [(0, locales_1.t)(newLang, 'btn_topup'), (0, locales_1.t)(newLang, 'btn_balance')],
            [(0, locales_1.t)(newLang, 'btn_template'), (0, locales_1.t)(newLang, 'btn_agent')],
            [(0, locales_1.t)(newLang, 'btn_help'), (0, locales_1.t)(newLang, 'btn_language')]
        ]).resize();
        await ctx.reply((0, locales_1.t)(newLang, 'menu_updated'), keyboard);
        logger_1.default.info(`User ${telegramId} changed language to ${newLang}`);
    }
    catch (error) {
        logger_1.default.error('Language change error:', error);
        await ctx.answerCbQuery('Error changing language');
    }
}
exports.default = { handleLanguage, handleLanguageCallback };
//# sourceMappingURL=languageHandler.js.map