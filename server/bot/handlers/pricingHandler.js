"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePricing = handlePricing;
const locales_1 = require("../../locales");
const types_1 = require("../../types");
const SERVICE_PRICE = parseInt(process.env.SERVICE_PRICE || '50', 10);
async function handlePricing(ctx) {
    const lang = ctx.session.language || 'en';
    let message = `💰 ${(0, locales_1.t)(lang, 'pricing_title')}\n\n`;
    // Service pricing
    message += `📋 ${(0, locales_1.t)(lang, 'service_pricing')}:\n`;
    message += `• ${(0, locales_1.t)(lang, 'id_generation')}: ${SERVICE_PRICE} ETB\n\n`;
    // What you get
    message += `📦 ${(0, locales_1.t)(lang, 'what_you_get')}:\n`;
    message += `• 2 ${(0, locales_1.t)(lang, 'mirrored_png_images')}\n`;
    message += `  - ${(0, locales_1.t)(lang, 'color_version')}\n`;
    message += `  - ${(0, locales_1.t)(lang, 'grayscale_version')}\n`;
    message += `• 2 ${(0, locales_1.t)(lang, 'mirrored_a4_pdfs')}\n`;
    message += `  - ${(0, locales_1.t)(lang, 'color_version')}\n`;
    message += `  - ${(0, locales_1.t)(lang, 'grayscale_version')}\n\n`;
    // Top-up amounts
    message += `💳 ${(0, locales_1.t)(lang, 'topup_amounts')}:\n`;
    for (const amount of types_1.TOPUP_AMOUNTS) {
        const jobs = Math.floor(amount / SERVICE_PRICE);
        message += `• ${amount} ETB (${jobs} ${(0, locales_1.t)(lang, 'id_generations')})\n`;
    }
    message += `\n📱 ${(0, locales_1.t)(lang, 'payment_methods')}:\n`;
    message += `• Telebirr\n`;
    message += `• CBE\n\n`;
    message += `ℹ️ ${(0, locales_1.t)(lang, 'pricing_note')}`;
    await ctx.reply(message);
}
exports.default = handlePricing;
//# sourceMappingURL=pricingHandler.js.map