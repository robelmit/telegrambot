import { BotContext, TemplateType } from './types';
import { t } from '../../locales';
import { Markup } from 'telegraf';
import { getAvailableTemplates } from '../../services/generator/cardRenderer';

export async function handleTemplate(ctx: BotContext): Promise<void> {
  const lang = ctx.session.language || 'en';
  const templates = getAvailableTemplates();
  const currentTemplate = ctx.session.selectedTemplate || 'template0';
  
  const buttons = templates.map(template => {
    const isSelected = template.id === currentTemplate;
    const label = isSelected ? `✅ ${template.name}` : template.name;
    return [Markup.button.callback(label, `template_${template.id}`)];
  });
  
  await ctx.reply(
    t(lang, 'select_template'),
    Markup.inlineKeyboard(buttons)
  );
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
  
  await ctx.editMessageText(
    t(lang, 'template_changed', { template: selectedTemplate?.name || templateId }),
    Markup.inlineKeyboard([])
  );
}

export default { handleTemplate, handleTemplateCallback };
