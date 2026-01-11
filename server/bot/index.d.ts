import { Telegraf } from 'telegraf';
import { BotContext } from './handlers/types';
export declare function createBot(token: string): Telegraf<BotContext>;
export declare function startBot(bot: Telegraf<BotContext>): Promise<void>;
export declare function stopBot(bot: Telegraf<BotContext>): Promise<void>;
declare const _default: {
    createBot: typeof createBot;
    startBot: typeof startBot;
    stopBot: typeof stopBot;
};
export default _default;
//# sourceMappingURL=index.d.ts.map