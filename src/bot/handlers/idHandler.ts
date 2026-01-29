import { BotContext } from './types';
import { t } from '../../locales';
import logger from '../../utils/logger';
import axios from 'axios';
import crypto from 'crypto';

const FAYDA_API_BASE = 'https://api-resident.fayda.et';

// Store pending verification sessions (in production, use Redis)
export const pendingSessions = new Map<string, { 
  finNumber: string; 
  chatId: number; 
  timestamp: number;
  captchaToken?: string;
  faydaToken?: string;
}>();

// Cleanup old sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of pendingSessions.entries()) {
    if (now - session.timestamp > 10 * 60 * 1000) { // 10 minutes
      pendingSessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000);

export async function handleIdRequest(ctx: BotContext): Promise<void> {
  const lang = ctx.session.language || 'en';
  
  // Set session state to await FIN number
  ctx.session.awaitingFinNumber = true;
  
  await ctx.reply(
    lang === 'am' 
      ? '🆔 እባክዎ የFCN/FAN ቁጥርዎን ያስገቡ:'
      : '🆔 Please enter your FCN/FAN number:'
  );
}

export async function handleFinNumber(ctx: BotContext, finNumber: string): Promise<void> {
  const lang = ctx.session.language || 'en';
  const telegramId = ctx.from?.id;
  const chatId = ctx.chat?.id;

  if (!telegramId || !chatId) {
    await ctx.reply(t(lang, 'error_user_not_found'));
    return;
  }

  try {
    // Clear the awaiting state
    ctx.session.awaitingFinNumber = false;
    
    // Generate a unique session ID
    const sessionId = crypto.randomBytes(16).toString('hex');
    
    // Store the session
    pendingSessions.set(sessionId, {
      finNumber,
      chatId,
      timestamp: Date.now()
    });
    
    // Create verification URL
    const baseUrl = process.env.BOT_WEBHOOK_URL || `http://localhost:3000`;
    const verificationUrl = `${baseUrl}/verify-captcha?session=${sessionId}`;
    
    await ctx.reply(
      lang === 'am'
        ? `🔐 እባክዎ reCAPTCHA ያረጋግጡ:\n\n👇 ይህን አገናኝ ጠቅ ያድርጉ እና reCAPTCHA ያጠናቅቁ።\n\nማረጋገጫውን ካጠናቀቁ በኋላ፣ የOTP ኮድዎን እዚህ ይላኩ።`
        : `🔐 Please verify reCAPTCHA:\n\n👇 Click the link below and complete the reCAPTCHA.\n\nAfter completing verification, send your OTP code here.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === 'am' ? '🔐 reCAPTCHA ያረጋግጡ' : '🔐 Verify reCAPTCHA', url: verificationUrl }]
          ]
        }
      }
    );
    
    // Set session to await OTP
    ctx.session.awaitingOtp = true;
    ctx.session.finNumber = finNumber;
    ctx.session.verificationSessionId = sessionId;

  } catch (error: any) {
    logger.error('FIN verification error:', error);
    ctx.session.awaitingFinNumber = false;
    
    const errorMsg = lang === 'am'
      ? `❌ ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።\n\nስህተት: ${error.message}`
      : `❌ An error occurred. Please try again.\n\nError: ${error.message}`;
    
    await ctx.reply(errorMsg);
  }
}

export async function handleOtp(ctx: BotContext, otp: string): Promise<void> {
  const lang = ctx.session.language || 'en';
  const telegramId = ctx.from?.id;

  if (!telegramId) {
    await ctx.reply(t(lang, 'error_user_not_found'));
    return;
  }

  const sessionId = ctx.session.verificationSessionId;
  const finNumber = ctx.session.finNumber;

  if (!sessionId || !finNumber) {
    await ctx.reply(
      lang === 'am'
        ? '❌ ክፍለ ጊዜ አልቋል። እባክዎ በ/id እንደገና ይጀምሩ።'
        : '❌ Session expired. Please start again with /id.'
    );
    return;
  }

  // Get session data
  const session = pendingSessions.get(sessionId);
  if (!session || !session.captchaToken) {
    await ctx.reply(
      lang === 'am'
        ? '❌ እባክዎ መጀመሪያ reCAPTCHA ያረጋግጡ።'
        : '❌ Please verify reCAPTCHA first.'
    );
    return;
  }

  try {
    ctx.session.awaitingOtp = false;
    
    await ctx.reply(
      lang === 'am'
        ? '⏳ OTP በማረጋገጥ ላይ...'
        : '⏳ Validating OTP...'
    );

    // Step 1: Verify captcha and get token (using the captcha token from web verification)
    logger.info(`Verifying with captcha token for FIN: ${finNumber}`);
    const verifyResponse = await axios.post(`${FAYDA_API_BASE}/verifycaptcha`, {
      captchaValue: session.captchaToken,
      idNumber: finNumber,
      verificationMethod: 'FCN'
    });

    if (!verifyResponse.data?.token) {
      throw new Error('Failed to get verification token');
    }

    const faydaToken = verifyResponse.data.token;
    logger.info('Fayda token received:', faydaToken);

    // Step 2: Validate OTP
    const otpResponse = await axios.post(`${FAYDA_API_BASE}/validateOtp`, {
      otp: otp,
      uniqueId: finNumber,
      verificationMethod: 'FCN'
    });

    if (!otpResponse.data?.signature || !otpResponse.data?.uin) {
      throw new Error('Failed to validate OTP');
    }

    const { signature, uin, fullName } = otpResponse.data;
    logger.info(`OTP validated for ${fullName?.eng || 'user'}`);

    await ctx.reply(
      lang === 'am'
        ? '⏳ የPDF ፋይልዎን በማውረድ ላይ...'
        : '⏳ Downloading your PDF...'
    );

    // Step 3: Download PDF
    const pdfResponse = await axios.post(`${FAYDA_API_BASE}/printableCredentialRoute`, {
      signature: signature,
      uin: uin
    });

    if (!pdfResponse.data?.pdf) {
      throw new Error('Failed to download PDF');
    }

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pdfResponse.data.pdf, 'base64');

    // Send PDF to user
    await ctx.replyWithDocument(
      { source: pdfBuffer, filename: `fayda_id_${uin}.pdf` },
      {
        caption: lang === 'am'
          ? `✅ የእርስዎ ብሔራዊ መታወቂያ PDF!\n\n👤 ስም: ${fullName?.amh || fullName?.eng || 'N/A'}\n🆔 UIN: ${uin}`
          : `✅ Your National ID PDF!\n\n👤 Name: ${fullName?.eng || fullName?.amh || 'N/A'}\n🆔 UIN: ${uin}`
      }
    );

    // Clear session data
    delete ctx.session.finNumber;
    delete ctx.session.verificationSessionId;
    pendingSessions.delete(sessionId);

    logger.info(`PDF sent successfully to user ${telegramId}`);

  } catch (error: any) {
    logger.error('OTP validation error:', error);
    logger.error('Error response:', error.response?.data);
    ctx.session.awaitingOtp = false;
    delete ctx.session.finNumber;
    delete ctx.session.verificationSessionId;
    
    const errorMsg = lang === 'am'
      ? `❌ OTP ማረጋገጥ አልተሳካም። እባክዎ ትክክለኛውን ኮድ እንዳስገቡ ያረጋግጡ።\n\nስህተት: ${error.response?.data?.message || error.message}`
      : `❌ OTP validation failed. Please make sure you entered the correct code.\n\nError: ${error.response?.data?.message || error.message}`;
    
    await ctx.reply(errorMsg);
  }
}

export default {
  handleIdRequest,
  handleFinNumber,
  handleOtp,
  pendingSessions
};
