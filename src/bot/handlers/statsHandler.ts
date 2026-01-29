/**
 * Stats handler for monitoring system health
 */
import { BotContext } from './types';
import { getBrowserStats } from '../../services/captcha/optimizedCaptcha';
import logger from '../../utils/logger';

export async function handleStats(ctx: BotContext): Promise<void> {
  const telegramId = ctx.from?.id;
  
  // Only allow admin to see stats (add your admin ID here)
  const ADMIN_IDS = [parseInt(process.env.ADMIN_TELEGRAM_ID || '0')];
  
  if (!telegramId || !ADMIN_IDS.includes(telegramId)) {
    await ctx.reply('❌ Unauthorized');
    return;
  }

  try {
    const stats = getBrowserStats();
    const memoryUsage = process.memoryUsage();
    
    const message = `
📊 **System Statistics**

**Browser Status:**
🌐 Connected: ${stats.browserConnected ? '✅' : '❌'}
📄 Active Pages: ${stats.activePages}/${stats.currentMaxConcurrent} (adaptive)
📊 Total Pages: ${stats.totalPagesCreated}
⏳ Queue: ${stats.queueSize}/${stats.maxQueue}
✅ Success Rate: ${stats.successRate}

**Memory Usage:**
💾 RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)} MB
💾 Heap: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB

**Limits:**
🎯 Current Limit: ${stats.currentMaxConcurrent} concurrent
📈 Max Limit: ${stats.maxConcurrent} concurrent
📦 Max Queue: ${stats.maxQueue} requests
🔄 Browser Restart: Every ${100} pages

**Status:**
${stats.activePages >= stats.currentMaxConcurrent ? '🔴 At capacity' : '🟢 Available'}
${stats.queueSize > stats.maxQueue * 0.8 ? '⚠️ Queue filling up' : ''}
${stats.queueSize > stats.maxQueue * 0.5 ? `⏱️ Est. wait: ~${Math.ceil(stats.queueSize * 6 / stats.currentMaxConcurrent)} seconds` : ''}
    `.trim();
    
    await ctx.reply(message, { parse_mode: 'Markdown' });
    
  } catch (error) {
    logger.error('Stats error:', error);
    await ctx.reply('❌ Error fetching stats');
  }
}

export default {
  handleStats
};
