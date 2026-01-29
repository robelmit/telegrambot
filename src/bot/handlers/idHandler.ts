import { BotContext } from './types';
import { t } from '../../locales';
import logger from '../../utils/logger';
import axios from 'axios';

const FAYDA_API_BASE = 'https://api-resident.fayda.et';
const CAPTCHA_VALUE = '0cAFcWeA7zXs5uGgw4NBLFlhqgkXGvMxM5udY_wLQzvp54SvHKkMQLPPEnllXV68A0pGyQwuU0K5VdWOkF0KuFclOYnF2rG08Q6oJW9gZsDkH6PsK_c8a5AWkZDjwXcU4bzWdmF7Zw3CVBIxItmKF1E6RldRva74Oq7eH81CTdXjldH1ryAZdEG_Ro4wr-rsQ2-qhP_3DO1foITqyL33NstPQronMEKoUOld6qSeAqSDUnTEMsNOyVCyA7XP-6GBdu-anPYSBSRX0LeWGnGOkn6DtGwoEJ96fJ5jz2oR9jknxj5IUZixmjTZWZ7Yk6RtLUYOmpCQD1kuR8AFnlW-oIA5eSf0ORmxs6KuBRFLvjmSWtIGTL6-C5tXu-aRsWJ5_3SSq1MmYLIHDbDFcwY5NcW-WTS72oX3ma2vWBQLlqpOCeciACYuNCsH-pEmPJXfFQWRsNu6fkzZM-k5uPWCH3obgkbbbYjTFlWC7weXnrLOiw83FFbB2rXkN1E09ZuKH5dnjE5_ylm__sORzgXe7ADM5DM6DRODEDehzwNfLbxzLd_ZmSYihTUWfQsu8_Y89tHELMyjrE7jnQy5JIHoOgqPR3T3m3jbybM7QUXOLpxlVKwvyJckYFVtrtciY5O2gGvM2rgD3F5VmiVxTX4hHdMosPBSj5cNmHhoNqssTU29jG4QZ7U9uyjFtbSgso7mBbahbCMjx5B7TkeUU_RLJflur12ajUWbhMlThNzGzY145RwW-T_D9BJSOGnzTdOMHjnboTWhGcSf4DrkBxlnmRhyi8SywcUoRVPF2oX1ynC4sfYwSHTPKCazlMGgQ7ceXX_wZM_OWCTgpIiqcxjTP13lyh3IFUocGuqYSch4Bj3rtPlrPnH9W_p9Bx_O528Uyjumw6ww5TDIuUuCfA8CVFMFoX6k8H4kL3FxEodR4MQAxuBU22hACyfSAbJHTLRF0mJUAOSi6gT_9SEaL0-ovY3wtGQUc2WKfRwCIddlUFD7Lxi_AHAUrPehHFomreHeCtEclvltbYjAMtS58jhLIX4luqc-hqeFxuhHUofVox1QX-9W85DnpxI46SeS5RTQ0_6THPfY6exraFHJCP4YJgxrPfpGnOV6Xj2e0tA2frivQWMcEJmD9VhE-tlekgj36pb2Id6EdMyV7Va4Fa8EGcRCkujiNEOG4sQJBl-5W9kox8v2JvitwKWD2XFxh4-y-bkLqXBu3cpGDzxCKES5Usdax-fpBGncuLCY4IlBWbvmf00ZMd0UQmAbhIzUqmAjVe_ov7IU5DbgPuh-X1xno2tJ-886JHkTpxDN09K4IOBHwq-29wQy3bjXZbyBK_VyPMQ6P5THRAVj7J2OrMMYLmLb8wYPXeUy3DANDRCsbLXax8_XY1cvYFJgrRKkQ3xB-oAVI15TuNo43Pt45FsQMOuBktyIOENM7JzfOshKbqV-prU7heL4EGsjcj6hyeiPY2HS7QmSewE9Zht7PJbpJt4pPLIz84lstdPOaeVIbtRvlNQOBWJ20MLHD4YPKR0pK-Gg2X6uYFNcrix7iUMX394f19iQRu3MTW1j2ZYJwar04kd7gSH8S-tSuuoSOD6RkSVm_mMA3xofF6VId4HB05zJovmxUfCCtaYCXrqaPiMV7g_yKiDuueAxGvjpE_IMiAmxxw0DFVUSjXqK5mev_dhsKeTD_gmHScwUfqmuyUYB4X9prQvUN9Qsw';

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

    // Step 1: Verify captcha and get token
    const verifyResponse = await axios.post(`${FAYDA_API_BASE}/verifycaptcha`, {
      captchaValue: CAPTCHA_VALUE,
      idNumber: finNumber,
      verificationMethod: 'FCN'
    });

    if (!verifyResponse.data?.token) {
      throw new Error('Failed to get verification token');
    }

    const token = verifyResponse.data.token;
    logger.info(`Token received for FIN ${finNumber}`);

    // Store token and FIN in session for OTP validation
    ctx.session.faydaToken = token;
    ctx.session.finNumber = finNumber;
    ctx.session.awaitingOtp = true;

    await ctx.reply(
      lang === 'am'
        ? '📱 የOTP ኮድዎን ያስገቡ (በስልክዎ የተቀበሉትን):'
        : '📱 Please enter your OTP code (received on your phone):'
    );

  } catch (error: any) {
    logger.error('FIN verification error:', error);
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

  if (!ctx.session.faydaToken || !ctx.session.finNumber) {
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
    const otpResponse = await axios.post(`${FAYDA_API_BASE}/validateOtp`, {
      otp: otp,
      uniqueId: ctx.session.finNumber,
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
    delete ctx.session.faydaToken;
    delete ctx.session.finNumber;

    logger.info(`PDF sent successfully to user ${telegramId}`);

  } catch (error: any) {
    logger.error('OTP validation error:', error);
    ctx.session.awaitingOtp = false;
    delete ctx.session.faydaToken;
    delete ctx.session.finNumber;
    
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
