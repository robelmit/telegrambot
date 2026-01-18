/**
 * Optional: Notify users about template change
 * 
 * This script can be used to send a one-time notification to all users
 * about the template default change.
 * 
 * Usage: npx ts-node notify-template-change.ts
 */

import { Telegraf } from 'telegraf';
import mongoose from 'mongoose';
import User from './src/models/User';
import { t } from './src/locales';
import logger from './src/utils/logger';
import dotenv from 'dotenv';

dotenv.config();

async function notifyUsers() {
  const BOT_TOKEN = process.env.BOT_TOKEN;
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!BOT_TOKEN || !MONGODB_URI) {
    console.error('Missing BOT_TOKEN or MONGODB_URI in .env');
    process.exit(1);
  }

  // Connect to MongoDB
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const bot = new Telegraf(BOT_TOKEN);

  // Get all users
  const users = await User.find({});
  console.log(`Found ${users.length} users`);

  let successCount = 0;
  let failCount = 0;

  for (const user of users) {
    try {
      const lang = user.language || 'en';
      
      // Check if user has template preference set
      const hasTemplateSet = user.selectedTemplate !== undefined;
      
      let message = '';
      
      if (!hasTemplateSet || user.selectedTemplate === 'template0' || user.selectedTemplate === 'template1') {
        // User might be affected by the change
        message = `
🔔 *Template Update Notice*

We've updated the default ID card template to *Template 3*, which includes important improvements:

✅ Better name detection
✅ Accurate address extraction  
✅ Fixed Ethiopian calendar dates

${hasTemplateSet ? 'Your current template preference has been preserved.' : 'You can select your preferred template using /template command.'}

If you have any questions, use /help command.
        `.trim();
      } else {
        // User already has Template 3 - just inform
        message = `
🔔 *System Update*

We've improved the ID card generation system with better data extraction and fixed Template 3 as the default.

Your template preference (Template 3) remains unchanged. ✅

If you have any questions, use /help command.
        `.trim();
      }

      await bot.telegram.sendMessage(user.telegramId, message, {
        parse_mode: 'Markdown'
      });

      successCount++;
      console.log(`✓ Notified user ${user.telegramId}`);

      // Rate limiting - wait 100ms between messages
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      failCount++;
      console.error(`✗ Failed to notify user ${user.telegramId}:`, error);
    }
  }

  console.log('\n=== Notification Complete ===');
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total: ${users.length}`);

  await mongoose.disconnect();
  process.exit(0);
}

// Run if executed directly
if (require.main === module) {
  notifyUsers().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

export default notifyUsers;
