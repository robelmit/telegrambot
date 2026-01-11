import { Context } from 'telegraf';
import { Update } from 'telegraf/types';
import { Language } from '../../types';
export type TemplateType = 'template0' | 'template1' | 'template2';
export interface SessionData {
    userId?: string;
    language: Language;
    awaitingTransactionId?: boolean;
    selectedProvider?: 'telebirr' | 'cbe';
    selectedAmount?: number;
    awaitingPdf?: boolean;
    selectedTemplate?: TemplateType;
    adminAction?: 'find_user' | 'add_balance' | 'ban_user' | 'unban_user' | 'make_admin' | 'broadcast';
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
//# sourceMappingURL=types.d.ts.map