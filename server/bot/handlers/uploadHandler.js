"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUpload = handleUpload;
exports.handleDocument = handleDocument;
const locales_1 = require("../../locales");
const pdf_1 = require("../../services/pdf");
const payment_1 = require("../../services/payment");
const queue_1 = require("../../services/queue");
const Job_1 = __importDefault(require("../../models/Job"));
const User_1 = __importDefault(require("../../models/User"));
const logger_1 = __importDefault(require("../../utils/logger"));
const auditLogger_1 = require("../../utils/auditLogger");
const rateLimiter_1 = require("../../utils/rateLimiter");
const agentHandler_1 = require("./agentHandler");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const pdfService = new pdf_1.PDFService();
const walletService = new payment_1.WalletService();
const SERVICE_PRICE = parseInt(process.env.SERVICE_PRICE || '50', 10);
async function handleUpload(ctx) {
    const lang = ctx.session.language || 'en';
    ctx.session.awaitingPdf = true;
    await ctx.reply((0, locales_1.t)(lang, 'upload_prompt'));
    await ctx.reply((0, locales_1.t)(lang, 'upload_instructions'));
}
async function handleDocument(ctx) {
    const lang = ctx.session.language || 'en';
    const telegramId = ctx.from?.id;
    const document = ctx.message?.document;
    if (!telegramId || !document) {
        await ctx.reply((0, locales_1.t)(lang, 'error_no_document'));
        return;
    }
    // Rate limiting check
    const rateLimiter = (0, rateLimiter_1.getRateLimiter)();
    const rateLimit = await rateLimiter.checkLimit(telegramId);
    if (!rateLimit.allowed) {
        (0, auditLogger_1.getAuditLogger)().logRateLimit(telegramId, 'upload', false);
        await ctx.reply((0, locales_1.t)(lang, 'error_rate_limit', { seconds: rateLimit.retryAfter || 60 }));
        return;
    }
    try {
        // Validate file type
        const fileName = document.file_name || '';
        if (!fileName.toLowerCase().endsWith('.pdf')) {
            await ctx.reply((0, locales_1.t)(lang, 'error_not_pdf'));
            return;
        }
        // Check file size (max 10MB)
        if (document.file_size > 10 * 1024 * 1024) {
            await ctx.reply((0, locales_1.t)(lang, 'error_file_too_large'));
            return;
        }
        // Get user and check balance
        const user = await User_1.default.findOne({ telegramId });
        if (!user) {
            await ctx.reply((0, locales_1.t)(lang, 'error_user_not_found'));
            return;
        }
        if (user.walletBalance < SERVICE_PRICE) {
            await ctx.reply((0, locales_1.t)(lang, 'error_insufficient_balance', {
                required: SERVICE_PRICE,
                current: user.walletBalance
            }));
            return;
        }
        // Send processing message
        const processingMsg = await ctx.reply((0, locales_1.t)(lang, 'processing_upload'));
        // Download file
        const fileLink = await ctx.telegram.getFileLink(document.file_id);
        const response = await fetch(fileLink.href);
        const pdfBuffer = Buffer.from(await response.arrayBuffer());
        // Validate PDF
        const validation = await pdfService.validateDocument(pdfBuffer, fileName);
        if (!validation.isValid) {
            await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, undefined, (0, locales_1.t)(lang, 'error_invalid_pdf', { errors: validation.errors.join(', ') }));
            return;
        }
        // Save PDF to temp directory
        const tempDir = process.env.TEMP_DIR || 'temp';
        await promises_1.default.mkdir(tempDir, { recursive: true });
        const pdfPath = path_1.default.join(tempDir, `${(0, uuid_1.v4)()}.pdf`);
        await promises_1.default.writeFile(pdfPath, pdfBuffer);
        // Debit user wallet
        const debitSuccess = await walletService.debit(user._id.toString(), SERVICE_PRICE, `pending_${Date.now()}`);
        if (!debitSuccess) {
            await promises_1.default.unlink(pdfPath).catch(() => { });
            await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, undefined, (0, locales_1.t)(lang, 'error_payment_failed'));
            return;
        }
        // Create job
        const job = await Job_1.default.create({
            userId: user._id,
            telegramId,
            chatId: ctx.chat.id,
            status: 'pending',
            pdfPath,
            attempts: 0
        });
        // Add to queue
        const jobQueue = (0, queue_1.getJobQueue)();
        await jobQueue.add(job._id.toString(), {
            jobId: job._id.toString(),
            userId: user._id.toString(),
            telegramId,
            pdfPath,
            chatId: ctx.chat.id,
            template: ctx.session.selectedTemplate || 'template0'
        });
        (0, auditLogger_1.getAuditLogger)().logJob('created', job._id.toString(), user._id.toString());
        (0, auditLogger_1.getAuditLogger)().logPayment('debit', user._id.toString(), {
            amount: SERVICE_PRICE,
            success: true
        });
        // Credit agent commission if user was referred
        await (0, agentHandler_1.creditAgentCommission)(user._id.toString(), SERVICE_PRICE);
        // Update message
        await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, undefined, (0, locales_1.t)(lang, 'job_queued', { jobId: job._id.toString().slice(-8) }));
        logger_1.default.info(`Job created for user ${telegramId}: ${job._id}`);
    }
    catch (error) {
        logger_1.default.error('Document handler error:', error);
        (0, auditLogger_1.getAuditLogger)().logFileOperation('upload', telegramId, {
            fileType: 'pdf',
            success: false,
            error: error.message
        });
        await ctx.reply((0, locales_1.t)(lang, 'error_processing'));
    }
    finally {
        ctx.session.awaitingPdf = false;
    }
}
exports.default = { handleUpload, handleDocument };
//# sourceMappingURL=uploadHandler.js.map