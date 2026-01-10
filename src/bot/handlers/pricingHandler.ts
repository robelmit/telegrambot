import { BotContext } from './types';
import { t } from '../../locales';
import { TOPUP_AMOUNTS } from '../../types';

const SERVICE_PRICE = parseInt(process.env.SERVICE_PRICE || '50', 10);

export async function handlePricing(ctx: BotContext): Promise<void> {
  const lang = ctx.session.language || 'en';

  let message = `💰 ${t(lang, 'pricing_title')}\n\n`;
  
  // Service pricing
  message += `📋 ${t(lang, 'service_pricing')}:\n`;
  message += `• ${t(lang, 'id_generation')}: ${SERVICE_PRICE} ETB\n\n`;
  
  // What you get
  message += `📦 ${t(lang, 'what_you_get')}:\n`;
  message += `• 2 ${t(lang, 'mirrored_png_images')}\n`;
  message += `  - ${t(lang, 'color_version')}\n`;
  message += `  - ${t(lang, 'grayscale_version')}\n`;
  message += `• 2 ${t(lang, 'mirrored_a4_pdfs')}\n`;
  message += `  - ${t(lang, 'color_version')}\n`;
  message += `  - ${t(lang, 'grayscale_version')}\n\n`;
  
  // Top-up amounts
  message += `💳 ${t(lang, 'topup_amounts')}:\n`;
  for (const amount of TOPUP_AMOUNTS) {
    const jobs = Math.floor(amount / SERVICE_PRICE);
    message += `• ${amount} ETB (${jobs} ${t(lang, 'id_generations')})\n`;
  }
  
  message += `\n📱 ${t(lang, 'payment_methods')}:\n`;
  message += `• Telebirr\n`;
  message += `• CBE\n\n`;
  
  message += `ℹ️ ${t(lang, 'pricing_note')}`;

  await ctx.reply(message);
}

export default handlePricing;
