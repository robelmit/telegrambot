import { BotContext } from './types';
import { t } from '../../locales';
import logger from '../../utils/logger';
import axios from 'axios';
import { generateOptimizedFaydaToken } from '../../services/captcha/optimizedCaptcha';
import User from '../../models/User';
import { WalletService } from '../../services/payment';

const FAYDA_API_BASE = 'https://api-resident.fayda.et';
const NATIONAL_ID_PRICE = parseInt(process.env.NATIONAL_ID_PRICE || '10', 10);
const walletService = new WalletService();

export async function handleIdRequest(ctx: BotContext): Promise<void> {
  const lang = ctx.session.language || 'en';
  const telegramId = ctx.from?.id;

  if (!telegramId) {
    await ctx.reply(t(lang, 'error_user_not_found'));
    return;
  }

  try {
    // Get user and check if they have free Fayda access
    const user = await User.findOne({ telegramId });
    if (!user) {
      await ctx.reply(t(lang, 'error_user_not_found'));
      return;
    }

    // Check if user has free Fayda access
    if (!user.faydaFree) {
      // Check balance
      if (user.walletBalance < NATIONAL_ID_PRICE) {
        await ctx.reply(
          lang === 'am'
            ? `❌ በቂ ሂሳብ የለዎትም። የብሔራዊ መታወቂያ ማውረድ ${NATIONAL_ID_PRICE} ብር ያስከፍላል።\n\n💰 የአሁን ሂሳብ: ${user.walletBalance} ብር\n💳 የሚያስፈልግ: ${NATIONAL_ID_PRICE} ብር\n\nእባክዎ በ/topup ሂሳብዎን ይሙሉ።`
            : `❌ Insufficient balance. National ID download costs ${NATIONAL_ID_PRICE} birr.\n\n💰 Current balance: ${user.walletBalance} birr\n💳 Required: ${NATIONAL_ID_PRICE} birr\n\nPlease top up using /topup.`
        );
        return;
      }

      // Show price info
      await ctx.reply(
        lang === 'am'
          ? `💰 የብሔራዊ መታወቂያ ማውረድ ${NATIONAL_ID_PRICE} ብር ያስከፍላል።\n\nየእርስዎ ሂሳብ: ${user.walletBalance} ብር`
          : `💰 National ID download costs ${NATIONAL_ID_PRICE} birr.\n\nYour balance: ${user.walletBalance} birr`
      );
    } else {
      // User has free access
      await ctx.reply(
        lang === 'am'
          ? '✅ እርስዎ ነፃ የብሔራዊ መታወቂያ ማውረድ መዳረሻ አለዎት!'
          : '✅ You have free National ID download access!'
      );
    }
  
    // Set session state to await FIN number
    ctx.session.awaitingFinNumber = true;
    
    await ctx.reply(
      lang === 'am' 
        ? '🆔 እባክዎ የFCN/FAN ቁጥርዎን ያስገቡ:'
        : '🆔 Please enter your FCN/FAN number:'
    );
  } catch (error) {
    logger.error('ID request error:', error);
    await ctx.reply(t(lang, 'error_processing'));
  }
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

    // Generate captcha token using optimized method (browser reuse)
    logger.info(`Generating captcha token for FIN: ${finNumber}`);
    const captchaToken = await generateOptimizedFaydaToken();
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
    
    // Get user
    const user = await User.findOne({ telegramId });
    if (!user) {
      await ctx.reply(t(lang, 'error_user_not_found'));
      return;
    }

    // Check if user needs to pay
    const needsPayment = !user.faydaFree;
    
    if (needsPayment) {
      // Check balance again before processing
      if (user.walletBalance < NATIONAL_ID_PRICE) {
        await ctx.reply(
          lang === 'am'
            ? `❌ በቂ ሂሳብ የለዎትም። ${NATIONAL_ID_PRICE} ብር ያስፈልጋል።`
            : `❌ Insufficient balance. ${NATIONAL_ID_PRICE} birr required.`
        );
        delete ctx.session.finNumber;
        delete ctx.session.faydaToken;
        return;
      }
    }
    
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

    // Charge user if not free
    if (needsPayment) {
      const debitSuccess = await walletService.debit(
        user._id.toString(),
        NATIONAL_ID_PRICE,
        `national_id_${uin}`
      );

      if (!debitSuccess) {
        await ctx.reply(
          lang === 'am'
            ? '❌ ክፍያ አልተሳካም። እባክዎ እንደገና ይሞክሩ።'
            : '❌ Payment failed. Please try again.'
        );
        delete ctx.session.finNumber;
        delete ctx.session.faydaToken;
        return;
      }

      logger.info(`Charged ${NATIONAL_ID_PRICE} birr to user ${telegramId} for National ID download`);
    }

    // Send PDF to user
    await ctx.replyWithDocument(
      { source: pdfBuffer, filename: `fayda_id_${uin}.pdf` },
      {
        caption: lang === 'am'
          ? `✅ የእርስዎ ብሔራዊ መታወቂያ PDF!\n\n👤 ስም: ${fullName?.amh || fullName?.eng || 'N/A'}\n🆔 UIN: ${uin}${needsPayment ? `\n💰 ክፍያ: ${NATIONAL_ID_PRICE} ብር` : '\n✨ ነፃ'}\n\n📄 አሁን ይህንን PDF ለመስራት መላክ ይችላሉ!`
          : `✅ Your National ID PDF!\n\n👤 Name: ${fullName?.eng || fullName?.amh || 'N/A'}\n🆔 UIN: ${uin}${needsPayment ? `\n💰 Charged: ${NATIONAL_ID_PRICE} birr` : '\n✨ Free'}\n\n📄 You can now send this PDF to generate your ID card!`
      }
    );

    // Clear session data
    delete ctx.session.finNumber;
    delete ctx.session.faydaToken;

    logger.info(`PDF sent successfully to user ${telegramId}${needsPayment ? ` (charged ${NATIONAL_ID_PRICE} birr)` : ' (free)'}`);

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
