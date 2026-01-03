import { BotContext } from './types';
import { t } from '../../locales';

const SUPPORT_CONTACT = process.env.SUPPORT_CONTACT || '@efayda_support';

export async function handleHelp(ctx: BotContext): Promise<void> {
  const lang = ctx.session.language || 'en';

  let message = `❓ ${t(lang, 'help_title')}\n\n`;
  
  // How to use
  message += `📖 ${t(lang, 'how_to_use')}:\n\n`;
  
  message += `1️⃣ ${t(lang, 'step_topup')}\n`;
  message += `   ${t(lang, 'step_topup_desc')}\n\n`;
  
  message += `2️⃣ ${t(lang, 'step_upload')}\n`;
  message += `   ${t(lang, 'step_upload_desc')}\n\n`;
  
  message += `3️⃣ ${t(lang, 'step_receive')}\n`;
  message += `   ${t(lang, 'step_receive_desc')}\n\n`;
  
  // Commands
  message += `📋 ${t(lang, 'commands')}:\n`;
  message += `/start - ${t(lang, 'cmd_start_desc')}\n`;
  message += `/upload - ${t(lang, 'cmd_upload_desc')}\n`;
  message += `/balance - ${t(lang, 'cmd_balance_desc')}\n`;
  message += `/topup - ${t(lang, 'cmd_topup_desc')}\n`;
  message += `/pricing - ${t(lang, 'cmd_pricing_desc')}\n`;
  message += `/language - ${t(lang, 'cmd_language_desc')}\n`;
  message += `/settings - ${t(lang, 'cmd_settings_desc')}\n`;
  message += `/help - ${t(lang, 'cmd_help_desc')}\n\n`;
  
  // FAQ
  message += `❔ ${t(lang, 'faq')}:\n\n`;
  
  message += `Q: ${t(lang, 'faq_q1')}\n`;
  message += `A: ${t(lang, 'faq_a1')}\n\n`;
  
  message += `Q: ${t(lang, 'faq_q2')}\n`;
  message += `A: ${t(lang, 'faq_a2')}\n\n`;
  
  message += `Q: ${t(lang, 'faq_q3')}\n`;
  message += `A: ${t(lang, 'faq_a3')}\n\n`;
  
  // Support
  message += `📞 ${t(lang, 'support')}:\n`;
  message += `${t(lang, 'contact_support')}: ${SUPPORT_CONTACT}\n`;

  await ctx.reply(message);
}

export default handleHelp;
