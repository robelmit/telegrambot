import { BotContext, TemplateType } from './types';
import { t } from '../../locales';
import { Markup } from 'telegraf';
import { getAvailableTemplates } from '../../services/generator/cardRenderer';
import { getTemplatePreview } from '../../services/generator/templatePreview';
import { Input } from 'telegraf';
import logger from '../../utils/logger';
import User from '../../models/User';

export async function handleTemplate(ctx: BotContext): Promise<void> {
  const lang = ctx.session.language || 'en';
  const telegramId = ctx.from?.id;
  const templates = getAvailableTemplates();
  
  // Load template from database if available
  let currentTemplate = ctx.session.selectedTemplate || 'template2';
  if (telegramId) {
    const user = await User.findOne({ telegramId });
    if (user?.selectedTemplate) {
      currentTemplate = user.selectedTemplate;
      ctx.session.selectedTemplate = currentTemplate;
    }
  }
  
  const buttons = templates.map(template => {
    const isSelected = template.id === currentTemplate;
    const label = isSelected ? `✅ ${template.name}` : template.name;
    return [Markup.button.callback(label, `template_${template.id}`)];
  });
  
  try {
    // Send preview image with selection buttons
    const previewBuffer = getTemplatePreview();
    await ctx.replyWithPhoto(
      Input.fromBuffer(previewBuffer, 'template_preview.png'),
      {
        caption: t(lang, 'select_template'),
        ...Markup.inlineKeyboard(buttons)
      }
    );
  } catch (error) {
    logger.error('Failed to send template preview:', error);
    // Fallback to text-only if preview fails
    await ctx.reply(
      t(lang, 'select_template'),
      Markup.inlineKeyboard(buttons)
    );
  }
}

export async function handleTemplateCallback(ctx: BotContext): Promise<void> {
  const lang = ctx.session.language || 'en';
  const telegramId = ctx.from?.id;
  
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
    return;
  }
  
  const templateId = ctx.callbackQuery.data.replace('template_', '') as TemplateType;
  
  // Save to session
  ctx.session.selectedTemplate = templateId;
  
  // Save to database for persistence
  if (telegramId) {
    await User.findOneAndUpdate(
      { telegramId },
      { selectedTemplate: templateId },
      { upsert: false }
    );
    logger.info(`User ${telegramId} selected template: ${templateId}`);
  }
  
  const templates = getAvailableTemplates();
  const selectedTemplate = templates.find(t => t.id === templateId);
  
  await ctx.answerCbQuery(t(lang, 'template_selected'));
  
  // Update the caption since it's a photo message
  try {
    await ctx.editMessageCaption(
      t(lang, 'template_changed', { template: selectedTemplate?.name || templateId }),
      Markup.inlineKeyboard([])
    );
  } catch {
    // If editing caption fails, try editing message text (for text-only fallback)
    try {
      await ctx.editMessageText(
        t(lang, 'template_changed', { template: selectedTemplate?.name || templateId }),
        Markup.inlineKeyboard([])
      );
    } catch {
      // Ignore if both fail
    }
  }
}

export default { handleTemplate, handleTemplateCallback };
