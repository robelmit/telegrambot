"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTemplate = handleTemplate;
exports.handleTemplateCallback = handleTemplateCallback;
const locales_1 = require("../../locales");
const telegraf_1 = require("telegraf");
const cardRenderer_1 = require("../../services/generator/cardRenderer");
const templatePreview_1 = require("../../services/generator/templatePreview");
const telegraf_2 = require("telegraf");
const logger_1 = __importDefault(require("../../utils/logger"));
async function handleTemplate(ctx) {
    const lang = ctx.session.language || 'en';
    const templates = (0, cardRenderer_1.getAvailableTemplates)();
    const currentTemplate = ctx.session.selectedTemplate || 'template0';
    const buttons = templates.map(template => {
        const isSelected = template.id === currentTemplate;
        const label = isSelected ? `✅ ${template.name}` : template.name;
        return [telegraf_1.Markup.button.callback(label, `template_${template.id}`)];
    });
    try {
        // Send preview image with selection buttons
        const previewBuffer = (0, templatePreview_1.getTemplatePreview)();
        await ctx.replyWithPhoto(telegraf_2.Input.fromBuffer(previewBuffer, 'template_preview.png'), {
            caption: (0, locales_1.t)(lang, 'select_template'),
            ...telegraf_1.Markup.inlineKeyboard(buttons)
        });
    }
    catch (error) {
        logger_1.default.error('Failed to send template preview:', error);
        // Fallback to text-only if preview fails
        await ctx.reply((0, locales_1.t)(lang, 'select_template'), telegraf_1.Markup.inlineKeyboard(buttons));
    }
}
async function handleTemplateCallback(ctx) {
    const lang = ctx.session.language || 'en';
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
        return;
    }
    const templateId = ctx.callbackQuery.data.replace('template_', '');
    ctx.session.selectedTemplate = templateId;
    const templates = (0, cardRenderer_1.getAvailableTemplates)();
    const selectedTemplate = templates.find(t => t.id === templateId);
    await ctx.answerCbQuery((0, locales_1.t)(lang, 'template_selected'));
    // Update the caption since it's a photo message
    try {
        await ctx.editMessageCaption((0, locales_1.t)(lang, 'template_changed', { template: selectedTemplate?.name || templateId }), telegraf_1.Markup.inlineKeyboard([]));
    }
    catch {
        // If editing caption fails, try editing message text (for text-only fallback)
        try {
            await ctx.editMessageText((0, locales_1.t)(lang, 'template_changed', { template: selectedTemplate?.name || templateId }), telegraf_1.Markup.inlineKeyboard([]));
        }
        catch {
            // Ignore if both fail
        }
    }
}
exports.default = { handleTemplate, handleTemplateCallback };
//# sourceMappingURL=templateHandler.js.map