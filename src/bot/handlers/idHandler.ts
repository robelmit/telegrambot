import { BotContext } from './types';
import { t } from '../../locales';
import logger from '../../utils/logger';
import axios from 'axios';
import { generateSimpleFaydaToken } from '../../services/captcha/simpleCaptcha';

const FAYDA_API_BASE = 'https://api-resident.fayda.et';

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

  if (!telegramId) {
    await ctx.reply(t(lang, 'error_user_not_found'));
    return;
  }

  try {
    // Clear the awaiting state
    ctx.session.awaitingFinNumber = false;
    
    await ctx.reply(
      lang === 'am'
        ? '⏳ በማረጋገጥ ላይ...'
        : '⏳ Verifying...'
    );

    // Generate captcha token using simple method
    logger.info(`Generating captcha token for FIN: ${finNumber}`);
    const captchaToken = await generateSimpleFaydaToken();
    logger.info('Captcha token generated successfully');

    // Step 1: Verify captcha and get token
    logger.info(`Verifying FIN with Fayda API...`);
    const verifyResponse = await axios.post(`${FAYDA_API_BASE}/verify`, {
      captchaValue: captchaToken,
      idNumber: finNumber,
      verificationMethod: 'FCN'
    });

    if (!verifyResponse.data?.token) {
      throw new Error('Failed to get verification token');
    }

    const faydaToken = verifyResponse.data.token;
    logger.info('Fayda token received');

    // Store token and FIN in session for OTP validation
    ctx.session.faydaToken = faydaToken;
    ctx.session.finNumber = finNumber;
    ctx.session.awaitingOtp = true;

    await ctx.reply(
      lang === 'am'
        ? '📱 የOTP ኮድዎን ያስገቡ (በስልክዎ የተቀበሉትን):'
        : '📱 Please enter your OTP code (received on your phone):'
    );

  } catch (error: any) {
    logger.error('FIN verification error:', error);
    logger.error('Error details:', error.response?.data);
    ctx.session.awaitingFinNumber = false;
    
    const errorMsg = lang === 'am'
      ? `❌ ማረጋገጥ አልተሳካም። እባክዎ የFCN/FAN ቁጥርዎን ያረጋግጡ እና እንደገና ይሞክሩ።\n\nስህተት: ${error.response?.data?.message || error.message}`
      : `❌ Verification failed. Please check your FCN/FAN number and try again.\n\nError: ${error.response?.data?.message || error.message}`;
    
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

  const finNumber = ctx.session.finNumber;
  const faydaToken = ctx.session.faydaToken;

  if (!finNumber || !faydaToken) {
    await ctx.reply(
      lang === 'am'
        ? '❌ ክፍለ ጊዜ አልቋል። እባክዎ በ/id እንደገና ይጀምሩ።'
        : '❌ Session expired. Please start again with /id.'
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

    // Step 2: Validate OTP
    logger.info(`Validating OTP for FIN: ${finNumber}`);
    const otpResponse = await axios.post(`${FAYDA_API_BASE}/validateOtp`, {
      otp: otp,
      uniqueId: finNumber,
      verificationMethod: 'FCN'
    }, {
      headers: {
        'Authorization': `Bearer ${faydaToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!otpResponse.data?.signature || !otpResponse.data?.uin) {
      throw new Error('Failed to validate OTP');
    }

    const { signature, uin, fullName } = otpResponse.data;
    logger.info(`OTP validated for ${fullName?.eng || 'user'}`);

    // Step 3: Download PDF
    const pdfResponse = await axios.post(`${FAYDA_API_BASE}/printableCredentialRoute`, {
      signature: signature,
      uin: uin
    }, {
      headers: {
        'Authorization': `Bearer ${faydaToken}`,
        'Content-Type': 'application/json'
      }
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
    delete ctx.session.faydaToken;

    logger.info(`PDF sent successfully to user ${telegramId}`);

  } catch (error: any) {
    logger.error('OTP validation error:', error);
    logger.error('Error response:', error.response?.data);
    ctx.session.awaitingOtp = false;
    delete ctx.session.finNumber;
    delete ctx.session.faydaToken;
    
    const errorMsg = lang === 'am'
      ? `❌ OTP ማረጋገጥ አልተሳካም። እባክዎ ትክክለኛውን ኮድ እንዳስገቡ ያረጋግጡ።\n\nስህተት: ${error.response?.data?.message || error.message}`
      : `❌ OTP validation failed. Please make sure you entered the correct code.\n\nError: ${error.response?.data?.message || error.message}`;
    
    await ctx.reply(errorMsg);
  }
}

export default {
  handleIdRequest,
  handleFinNumber,
  handleOtp
};
