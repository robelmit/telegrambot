import { Markup } from 'telegraf';
import { BotContext } from './types';
import { t } from '../../locales';
import { PDFService } from '../../services/pdf';
import { WalletService } from '../../services/payment';
import { getJobQueue } from '../../services/queue';
import JobModel from '../../models/Job';
import User from '../../models/User';
import logger from '../../utils/logger';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const pdfService = new PDFService();
const walletService = new WalletService();

// Store for bulk upload sessions
const bulkSessions = new Map<number, {
  files: Array<{ path: string; name: string }>;
  startTime: number;
  messageId?: number;
}>();

// Maximum files per bulk upload
const MAX_BULK_FILES = 20;
// Files per combined PDF output
const FILES_PER_PDF = 5;
// Session timeout (10 minutes for larger uploads)
const SESSION_TIMEOUT = 10 * 60 * 1000;
// Price per file in bulk
const BULK_PRICE_PER_FILE = parseInt(process.env.SERVICE_PRICE || '50', 10);

/**
 * Handle /bulk command - Start bulk upload session
 */
export async function handleBulk(ctx: BotContext): Promise<void> {
  const lang = ctx.session.language || 'en';
  const telegramId = ctx.from?.id;

  if (!telegramId) {
    await ctx.reply(t(lang, 'error_generic'));
    return;
  }

  // Check if user exists
  const user = await User.findOne({ telegramId });
  if (!user) {
    await ctx.reply(t(lang, 'error_user_not_found'));
    return;
  }
  
  if (user.walletBalance < BULK_PRICE_PER_FILE) {
    await ctx.reply(t(lang, 'error_insufficient_balance', {
      required: BULK_PRICE_PER_FILE,
      current: user.walletBalance
    }));
    return;
  }

  // Clear any existing session
  const existingSession = bulkSessions.get(telegramId);
  if (existingSession) {
    // Cleanup old files
    for (const file of existingSession.files) {
      try {
        await fs.unlink(file.path);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  // Start new bulk session
  bulkSessions.set(telegramId, {
    files: [],
    startTime: Date.now()
  });

  // Enable bulk upload mode
  ctx.session.awaitingBulkPdf = true;

  const message = `📦 *Bulk Upload Mode*

Send up to ${MAX_BULK_FILES} PDF files one by one.

💰 Cost: ${BULK_PRICE_PER_FILE} ETB per file
💳 Your balance: ${user.walletBalance} ETB (max ${Math.floor(user.walletBalance / BULK_PRICE_PER_FILE)} files)

📤 Files received: 0/${MAX_BULK_FILES}

📋 Results will be combined into PDFs (${FILES_PER_PDF} IDs per PDF)`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('✅ Process Files', 'bulk_done')],
    [Markup.button.callback('❌ Cancel', 'bulk_cancel')]
  ]);

  await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
}

/**
 * Handle bulk document upload
 */
export async function handleBulkDocument(ctx: BotContext): Promise<void> {
  const telegramId = ctx.from?.id;
  const document = (ctx.message as any)?.document;

  if (!telegramId || !document) {
    return;
  }

  // Check if in bulk mode
  if (!ctx.session.awaitingBulkPdf) {
    return;
  }

  const session = bulkSessions.get(telegramId);
  if (!session) {
    ctx.session.awaitingBulkPdf = false;
    await ctx.reply('❌ Bulk session expired. Use /bulk to start again.');
    return;
  }

  // Check session timeout
  if (Date.now() - session.startTime > SESSION_TIMEOUT) {
    await cleanupBulkSession(telegramId);
    ctx.session.awaitingBulkPdf = false;
    await ctx.reply('❌ Bulk session timed out. Use /bulk to start again.');
    return;
  }

  // Check max files
  if (session.files.length >= MAX_BULK_FILES) {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('✅ Process Files', 'bulk_done')],
      [Markup.button.callback('❌ Cancel', 'bulk_cancel')]
    ]);
    await ctx.reply(`📦 Maximum ${MAX_BULK_FILES} files reached. Tap Process to continue.`, keyboard);
    return;
  }

  // Check if user can afford more files
  const user = await User.findOne({ telegramId });
  if (user) {
    const maxAffordable = Math.floor(user.walletBalance / BULK_PRICE_PER_FILE);
    if (session.files.length >= maxAffordable) {
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('✅ Process Files', 'bulk_done')],
        [Markup.button.callback('❌ Cancel', 'bulk_cancel')]
      ]);
      await ctx.reply(
        `💰 You can only afford ${maxAffordable} files with your current balance.\n` +
        `Tap Process to continue or top up for more.`,
        keyboard
      );
      return;
    }
  }

  // Validate file type
  const fileName = document.file_name || '';
  if (!fileName.toLowerCase().endsWith('.pdf')) {
    await ctx.reply('❌ Only PDF files are accepted.');
    return;
  }

  // Check file size (max 10MB)
  if (document.file_size > 10 * 1024 * 1024) {
    await ctx.reply('❌ File too large. Maximum size is 10MB.');
    return;
  }

  try {
    // Download file
    const fileLink = await ctx.telegram.getFileLink(document.file_id);
    const response = await fetch(fileLink.href);
    const pdfBuffer = Buffer.from(await response.arrayBuffer());

    // Validate PDF
    const validation = await pdfService.validateDocument(pdfBuffer, fileName);
    if (!validation.isValid) {
      await ctx.reply(`❌ Invalid PDF: ${validation.errors.join(', ')}`);
      return;
    }

    // Save to temp directory
    const tempDir = process.env.TEMP_DIR || 'temp';
    await fs.mkdir(tempDir, { recursive: true });
    
    const tempPath = path.join(tempDir, `bulk_${telegramId}_${uuidv4()}.pdf`);
    await fs.writeFile(tempPath, pdfBuffer);

    // Add to session
    session.files.push({
      path: tempPath,
      name: fileName
    });

    const remaining = MAX_BULK_FILES - session.files.length;
    const pdfCount = Math.ceil(session.files.length / FILES_PER_PDF);
    
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(`✅ Process ${session.files.length} Files`, 'bulk_done')],
      [Markup.button.callback('❌ Cancel', 'bulk_cancel')]
    ]);

    await ctx.reply(
      `✅ File ${session.files.length}/${MAX_BULK_FILES} received: ${fileName}\n\n` +
      `📄 Will generate: ${pdfCount} combined PDF${pdfCount > 1 ? 's' : ''}\n` +
      (remaining > 0 
        ? `📤 Send more files or tap Process when ready.`
        : `📦 Maximum files reached. Tap Process to continue.`),
      keyboard
    );

  } catch (error) {
    logger.error('Bulk file upload error:', error);
    await ctx.reply('❌ Failed to process file. Please try again.');
  }
}

/**
 * Handle bulk_done callback - Process all bulk files
 */
export async function handleBulkDoneCallback(ctx: BotContext): Promise<void> {
  await ctx.answerCbQuery();
  await handleBulkDone(ctx);
}

/**
 * Handle bulk_cancel callback - Cancel bulk session
 */
export async function handleBulkCancelCallback(ctx: BotContext): Promise<void> {
  await ctx.answerCbQuery();
  await handleBulkCancel(ctx);
}

/**
 * Handle /bulkdone command - Process all bulk files
 */
export async function handleBulkDone(ctx: BotContext): Promise<void> {
  const lang = ctx.session.language || 'en';
  const telegramId = ctx.from?.id;

  if (!telegramId) {
    await ctx.reply(t(lang, 'error_generic'));
    return;
  }

  const session = bulkSessions.get(telegramId);
  if (!session || session.files.length === 0) {
    ctx.session.awaitingBulkPdf = false;
    await ctx.reply('❌ No files to process. Use /bulk to start a new session.');
    return;
  }

  // Check user balance
  const user = await User.findOne({ telegramId });
  if (!user) {
    await cleanupBulkSession(telegramId);
    ctx.session.awaitingBulkPdf = false;
    await ctx.reply(t(lang, 'error_user_not_found'));
    return;
  }

  const totalCost = BULK_PRICE_PER_FILE * session.files.length;
  
  if (user.walletBalance < totalCost) {
    await ctx.reply(t(lang, 'error_insufficient_balance', {
      required: totalCost,
      current: user.walletBalance
    }));
    return;
  }

  // Disable bulk mode
  ctx.session.awaitingBulkPdf = false;

  const processingMsg = await ctx.reply(
    `⏳ Processing ${session.files.length} files...\n` +
    `💰 Total cost: ${totalCost} ETB\n` +
    `📄 Will generate: ${Math.ceil(session.files.length / FILES_PER_PDF)} combined PDF(s)`
  );

  try {
    // Deduct balance using debit method
    const bulkJobId = `bulk_${uuidv4()}`;
    const debitSuccess = await walletService.debit(user._id.toString(), totalCost, bulkJobId);
    
    if (!debitSuccess) {
      await ctx.telegram.editMessageText(
        ctx.chat!.id,
        processingMsg.message_id,
        undefined,
        '❌ Insufficient balance. Please top up and try again.'
      );
      await cleanupBulkSession(telegramId);
      return;
    }

    // Process all files and combine into batched PDFs
    const template = ctx.session.selectedTemplate || 'template0';
    const jobQueue = getJobQueue();

    // Calculate batch info
    const totalBatches = Math.ceil(session.files.length / FILES_PER_PDF);

    // Create jobs for each file with batch info
    const jobIds: string[] = [];
    
    for (let i = 0; i < session.files.length; i++) {
      const file = session.files[i];
      const batchIndex = Math.floor(i / FILES_PER_PDF);
      const indexInBatch = i % FILES_PER_PDF;
      
      // Create job record
      const job = await JobModel.create({
        userId: user._id,
        telegramId,
        chatId: ctx.chat!.id,
        status: 'pending',
        pdfPath: file.path,
        template,
        isBulk: true,
        bulkIndex: i,
        bulkGroupId: bulkJobId,
        bulkBatchIndex: batchIndex,
        bulkIndexInBatch: indexInBatch,
        bulkTotalFiles: session.files.length,
        bulkFilesPerPdf: FILES_PER_PDF,
        bulkTotalBatches: totalBatches
      });

      jobIds.push(job._id.toString());

      // Add to queue with job ID
      await jobQueue.add(job._id.toString(), {
        jobId: job._id.toString(),
        userId: user._id.toString(),
        telegramId,
        pdfPath: file.path,
        chatId: ctx.chat!.id,
        template,
        isBulk: true,
        bulkGroupId: bulkJobId,
        bulkBatchIndex: batchIndex,
        bulkIndexInBatch: indexInBatch,
        bulkTotalFiles: session.files.length,
        bulkFilesPerPdf: FILES_PER_PDF
      });
    }

    await ctx.telegram.editMessageText(
      ctx.chat!.id,
      processingMsg.message_id,
      undefined,
      `✅ ${session.files.length} files queued for processing!\n\n` +
      `💰 Charged: ${totalCost} ETB\n` +
      `💳 New balance: ${user.walletBalance - totalCost} ETB\n` +
      `📄 Output: ${totalBatches} combined PDF(s)\n\n` +
      `📬 You will receive your files shortly.`
    );

    // Clear session
    bulkSessions.delete(telegramId);

  } catch (error) {
    logger.error('Bulk processing error:', error);
    
    // Refund on error
    try {
      await walletService.refund(user._id.toString(), totalCost, `bulk_refund_${Date.now()}`);
    } catch (refundError) {
      logger.error('Refund failed:', refundError);
    }

    await ctx.telegram.editMessageText(
      ctx.chat!.id,
      processingMsg.message_id,
      undefined,
      '❌ Failed to process files. Your balance has been refunded.'
    );

    await cleanupBulkSession(telegramId);
  }
}

/**
 * Handle /bulkcancel command - Cancel bulk session
 */
export async function handleBulkCancel(ctx: BotContext): Promise<void> {
  const telegramId = ctx.from?.id;

  if (!telegramId) {
    return;
  }

  ctx.session.awaitingBulkPdf = false;
  await cleanupBulkSession(telegramId);
  
  await ctx.reply('❌ Bulk upload cancelled. All uploaded files have been deleted.');
}

/**
 * Cleanup bulk session and files
 */
async function cleanupBulkSession(telegramId: number): Promise<void> {
  const session = bulkSessions.get(telegramId);
  if (session) {
    for (const file of session.files) {
      try {
        await fs.unlink(file.path);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    bulkSessions.delete(telegramId);
  }
}

/**
 * Check if user is in bulk upload mode
 */
export function isInBulkMode(ctx: BotContext): boolean {
  return ctx.session.awaitingBulkPdf === true;
}
