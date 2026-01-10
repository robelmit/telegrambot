import { BotContext, TemplateType } from './types';
import { t } from '../../locales';
import { Markup } from 'telegraf';
import { getAvailableTemplates } from '../../services/generator/cardRenderer';
import { getTemplatePreview } from '../../services/generator/templatePreview';
import { Input } from 'telegraf';
import logger from '../../utils/logger';

export async function handleTemplate(ctx: BotContext): Promise<void> {
  const lang = ctx.session.language || 'en';
  const templates = getAvailableTemplates();
  const currentTemplate = ctx.session.selectedTemplate || 'template0';
  
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
  
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
    return;
  }
  
  const templateId = ctx.callbackQuery.data.replace('template_', '') as TemplateType;
  ctx.session.selectedTemplate = templateId;
  
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
