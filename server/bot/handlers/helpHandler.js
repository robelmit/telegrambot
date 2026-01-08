"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleHelp = handleHelp;
const locales_1 = require("../../locales");
const SUPPORT_CONTACT = process.env.SUPPORT_CONTACT || '@efayda_support';
async function handleHelp(ctx) {
    const lang = ctx.session.language || 'en';
    let message = `❓ ${(0, locales_1.t)(lang, 'help_title')}\n\n`;
    // How to use
    message += `📖 ${(0, locales_1.t)(lang, 'how_to_use')}:\n\n`;
    message += `1️⃣ ${(0, locales_1.t)(lang, 'step_topup')}\n`;
    message += `   ${(0, locales_1.t)(lang, 'step_topup_desc')}\n\n`;
    message += `2️⃣ ${(0, locales_1.t)(lang, 'step_upload')}\n`;
    message += `   ${(0, locales_1.t)(lang, 'step_upload_desc')}\n\n`;
    message += `3️⃣ ${(0, locales_1.t)(lang, 'step_receive')}\n`;
    message += `   ${(0, locales_1.t)(lang, 'step_receive_desc')}\n\n`;
    // Commands
    message += `📋 ${(0, locales_1.t)(lang, 'commands')}:\n`;
    message += `/start - ${(0, locales_1.t)(lang, 'cmd_start_desc')}\n`;
    message += `/upload - ${(0, locales_1.t)(lang, 'cmd_upload_desc')}\n`;
    message += `/balance - ${(0, locales_1.t)(lang, 'cmd_balance_desc')}\n`;
    message += `/topup - ${(0, locales_1.t)(lang, 'cmd_topup_desc')}\n`;
    message += `/pricing - ${(0, locales_1.t)(lang, 'cmd_pricing_desc')}\n`;
    message += `/language - ${(0, locales_1.t)(lang, 'cmd_language_desc')}\n`;
    message += `/settings - ${(0, locales_1.t)(lang, 'cmd_settings_desc')}\n`;
    message += `/help - ${(0, locales_1.t)(lang, 'cmd_help_desc')}\n\n`;
    // FAQ
    message += `❔ ${(0, locales_1.t)(lang, 'faq')}:\n\n`;
    message += `Q: ${(0, locales_1.t)(lang, 'faq_q1')}\n`;
    message += `A: ${(0, locales_1.t)(lang, 'faq_a1')}\n\n`;
    message += `Q: ${(0, locales_1.t)(lang, 'faq_q2')}\n`;
    message += `A: ${(0, locales_1.t)(lang, 'faq_a2')}\n\n`;
    message += `Q: ${(0, locales_1.t)(lang, 'faq_q3')}\n`;
    message += `A: ${(0, locales_1.t)(lang, 'faq_a3')}\n\n`;
    // Support
    message += `📞 ${(0, locales_1.t)(lang, 'support')}:\n`;
    message += `${(0, locales_1.t)(lang, 'contact_support')}: ${SUPPORT_CONTACT}\n`;
    await ctx.reply(message);
}
exports.default = handleHelp;
//# sourceMappingURL=helpHandler.js.map