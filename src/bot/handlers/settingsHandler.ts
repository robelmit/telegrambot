import { Markup } from 'telegraf';
import { BotContext } from './types';
import { t } from '../../locales';
import User from '../../models/User';
import logger from '../../utils/logger';

export async function handleSettings(ctx: BotContext): Promise<void> {
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

    const langNames: Record<string, string> = {
      en: '🇬🇧 English',
      am: '🇪🇹 አማርኛ',
      ti: '🇪🇹 ትግርኛ'
    };

    let message = `⚙️ ${t(lang, 'settings_title')}\n\n`;
    message += `🌐 ${t(lang, 'current_language')}: ${langNames[user.language]}\n`;
    message += `🔔 ${t(lang, 'notifications')}: ${user.settings.notifications ? '✅' : '❌'}\n`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(`🌐 ${t(lang, 'change_language')}`, 'settings_language')],
      [Markup.button.callback(
        `🔔 ${user.settings.notifications ? t(lang, 'disable_notifications') : t(lang, 'enable_notifications')}`,
        'settings_toggle_notifications'
      )]
    ]);

    await ctx.reply(message, keyboard);
  } catch (error) {
    logger.error('Settings handler error:', error);
    await ctx.reply(t(lang, 'error_loading_settings'));
  }
}

export async function handleSettingsCallback(ctx: BotContext): Promise<void> {
  const lang = ctx.session.language || 'en';
  const callbackData = (ctx.callbackQuery as any)?.data;
  const telegramId = ctx.from?.id;

  if (!telegramId || !callbackData) {
    return;
  }

  try {
    if (callbackData === 'settings_language') {
      // Redirect to language handler
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('🇬🇧 English', 'lang_en'),
          Markup.button.callback('🇪🇹 አማርኛ', 'lang_am'),
          Markup.button.callback('🇪🇹 ትግርኛ', 'lang_ti')
        ]
      ]);

      await ctx.answerCbQuery();
      await ctx.editMessageText(t(lang, 'select_language'), keyboard);
    } else if (callbackData === 'settings_toggle_notifications') {
      const user = await User.findOne({ telegramId });
      
      if (!user) {
        await ctx.answerCbQuery(t(lang, 'error_user_not_found'));
        return;
      }

      const newValue = !user.settings.notifications;
      
      await User.findOneAndUpdate(
        { telegramId },
        { 'settings.notifications': newValue }
      );

      await ctx.answerCbQuery(
        newValue ? t(lang, 'notifications_enabled') : t(lang, 'notifications_disabled')
      );

      // Refresh settings view
      await handleSettings(ctx);
    }
  } catch (error) {
    logger.error('Settings callback error:', error);
    await ctx.answerCbQuery(t(lang, 'error_updating_settings'));
  }
}

export default { handleSettings, handleSettingsCallback };
