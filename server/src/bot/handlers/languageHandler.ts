import { Markup } from 'telegraf';
import { BotContext } from './types';
import { t, SUPPORTED_LANGUAGES } from '../../locales';
import { Language } from '../../types';
import User from '../../models/User';
import logger from '../../utils/logger';

export async function handleLanguage(ctx: BotContext): Promise<void> {
  const lang = ctx.session.language || 'en';

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🇬🇧 English', 'lang_en'),
      Markup.button.callback('🇪🇹 አማርኛ', 'lang_am'),
      Markup.button.callback('🇪🇹 ትግርኛ', 'lang_ti')
    ]
  ]);

  await ctx.reply(t(lang, 'select_language'), keyboard);
}

export async function handleLanguageCallback(ctx: BotContext): Promise<void> {
  const callbackData = (ctx.callbackQuery as any)?.data;
  
  if (!callbackData || !callbackData.startsWith('lang_')) {
    return;
  }

  const newLang = callbackData.replace('lang_', '') as Language;
  
  if (!SUPPORTED_LANGUAGES.includes(newLang)) {
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
    await User.findOneAndUpdate(
      { telegramId },
      { 
        language: newLang,
        'settings.language': newLang
      }
    );

    // Update session
    ctx.session.language = newLang;

    // Confirm change
    await ctx.answerCbQuery(t(newLang, 'language_changed'));
    
    // Update the message
    const langNames: Record<Language, string> = {
      en: '🇬🇧 English',
      am: '🇪🇹 አማርኛ (Amharic)',
      ti: '🇪🇹 ትግርኛ (Tigrigna)'
    };

    await ctx.editMessageText(
      `✅ ${t(newLang, 'language_set_to')} ${langNames[newLang]}`
    );

    // Show updated main menu
    const keyboard = Markup.keyboard([
      [t(newLang, 'btn_upload'), t(newLang, 'btn_balance')],
      [t(newLang, 'btn_topup'), t(newLang, 'btn_pricing')],
      [t(newLang, 'btn_language'), t(newLang, 'btn_help')]
    ]).resize();

    await ctx.reply(t(newLang, 'menu_updated'), keyboard);

    logger.info(`User ${telegramId} changed language to ${newLang}`);
  } catch (error) {
    logger.error('Language change error:', error);
    await ctx.answerCbQuery('Error changing language');
  }
}

export default { handleLanguage, handleLanguageCallback };
