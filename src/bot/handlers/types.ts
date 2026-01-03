import { Context } from 'telegraf';
import { Update, Message } from 'telegraf/types';
import { Language } from '../../types';

export interface SessionData {
  userId?: string;
  language: Language;
  awaitingTransactionId?: boolean;
  selectedProvider?: 'telebirr' | 'cbe';
  selectedAmount?: number;
  awaitingPdf?: boolean;
}

export interface BotContext extends Context<Update> {
  session: SessionData;
}

export interface CommandHandler {
  command: string;
  description: string;
  handler: (ctx: BotContext) => Promise<void>;
}

export interface CallbackHandler {
  pattern: string | RegExp;
  handler: (ctx: BotContext) => Promise<void>;
}

export interface MessageHandler {
  filter: (ctx: BotContext) => boolean;
  handler: (ctx: BotContext) => Promise<void>;
}
