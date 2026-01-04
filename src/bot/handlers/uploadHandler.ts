import { BotContext } from './types';
import { t } from '../../locales';
import { PDFService } from '../../services/pdf';
import { WalletService } from '../../services/payment';
import { getJobQueue } from '../../services/queue';
import JobModel from '../../models/Job';
import User from '../../models/User';
import logger from '../../utils/logger';
import { getAuditLogger } from '../../utils/auditLogger';
import { getRateLimiter } from '../../utils/rateLimiter';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const pdfService = new PDFService();
const walletService = new WalletService();
const SERVICE_PRICE = parseInt(process.env.SERVICE_PRICE || '50', 10);

export async function handleUpload(ctx: BotContext): Promise<void> {
  const lang = ctx.session.language || 'en';
  
  ctx.session.awaitingPdf = true;
  
  await ctx.reply(t(lang, 'upload_prompt'));
  await ctx.reply(t(lang, 'upload_instructions'));
}

export async function handleDocument(ctx: BotContext): Promise<void> {
  const lang = ctx.session.language || 'en';
  const telegramId = ctx.from?.id;
  const document = (ctx.message as any)?.document;

  if (!telegramId || !document) {
    await ctx.reply(t(lang, 'error_no_document'));
    return;
  }

  // Rate limiting check
  const rateLimiter = getRateLimiter();
  const rateLimit = await rateLimiter.checkLimit(telegramId);
  
  if (!rateLimit.allowed) {
    getAuditLogger().logRateLimit(telegramId, 'upload', false);
    await ctx.reply(t(lang, 'error_rate_limit', { seconds: rateLimit.retryAfter || 60 }));
    return;
  }

  try {
    // Validate file type
    const fileName = document.file_name || '';
    if (!fileName.toLowerCase().endsWith('.pdf')) {
      await ctx.reply(t(lang, 'error_not_pdf'));
      return;
    }

    // Check file size (max 10MB)
    if (document.file_size > 10 * 1024 * 1024) {
      await ctx.reply(t(lang, 'error_file_too_large'));
      return;
    }

    // Get user and check balance
    const user = await User.findOne({ telegramId });
    if (!user) {
      await ctx.reply(t(lang, 'error_user_not_found'));
      return;
    }

    if (user.walletBalance < SERVICE_PRICE) {
      await ctx.reply(t(lang, 'error_insufficient_balance', { 
        required: SERVICE_PRICE,
        current: user.walletBalance
      }));
      return;
    }

    // Send processing message
    const processingMsg = await ctx.reply(t(lang, 'processing_upload'));

    // Download file
    const fileLink = await ctx.telegram.getFileLink(document.file_id);
    const response = await fetch(fileLink.href);
    const pdfBuffer = Buffer.from(await response.arrayBuffer());

    // Validate PDF
    const validation = await pdfService.validateDocument(pdfBuffer, fileName);
    if (!validation.isValid) {
      await ctx.telegram.editMessageText(
        ctx.chat!.id,
        processingMsg.message_id,
        undefined,
        t(lang, 'error_invalid_pdf', { errors: validation.errors.join(', ') })
      );
      return;
    }

    // Save PDF to temp directory
    const tempDir = process.env.TEMP_DIR || 'temp';
    await fs.mkdir(tempDir, { recursive: true });
    const pdfPath = path.join(tempDir, `${uuidv4()}.pdf`);
    await fs.writeFile(pdfPath, pdfBuffer);

    // Debit user wallet
    const debitSuccess = await walletService.debit(
      user._id.toString(),
      SERVICE_PRICE,
      `pending_${Date.now()}`
    );

    if (!debitSuccess) {
      await fs.unlink(pdfPath).catch(() => {});
      await ctx.telegram.editMessageText(
        ctx.chat!.id,
        processingMsg.message_id,
        undefined,
        t(lang, 'error_payment_failed')
      );
      return;
    }

    // Create job
    const job = await JobModel.create({
      userId: user._id,
      chatId: ctx.chat!.id,
      status: 'pending',
      pdfPath,
      attempts: 0
    });

    // Add to queue
    const jobQueue = getJobQueue();
    await jobQueue.add(job._id.toString(), {
      jobId: job._id.toString(),
      userId: user._id.toString(),
      telegramId,
      pdfPath,
      chatId: ctx.chat!.id
    });

    getAuditLogger().logJob('created', job._id.toString(), user._id.toString());
    getAuditLogger().logPayment('debit', user._id.toString(), {
      amount: SERVICE_PRICE,
      success: true
    });

    // Update message
    await ctx.telegram.editMessageText(
      ctx.chat!.id,
      processingMsg.message_id,
      undefined,
      t(lang, 'job_queued', { jobId: job._id.toString().slice(-8) })
    );

    await ctx.reply(t(lang, 'job_processing'));

    logger.info(`Job created for user ${telegramId}: ${job._id}`);
  } catch (error) {
    logger.error('Document handler error:', error);
    getAuditLogger().logFileOperation('upload', telegramId, {
      fileType: 'pdf',
      success: false,
      error: (error as Error).message
    });
    await ctx.reply(t(lang, 'error_processing'));
  } finally {
    ctx.session.awaitingPdf = false;
  }
}

export default { handleUpload, handleDocument };
