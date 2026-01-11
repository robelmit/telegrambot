import { BotContext } from './types';
export declare function handleTopup(ctx: BotContext): Promise<void>;
export declare function handleTopupAmountCallback(ctx: BotContext): Promise<void>;
export declare function handleTopupProviderCallback(ctx: BotContext): Promise<void>;
export declare function handleTransactionIdMessage(ctx: BotContext): Promise<void>;
export declare function handleTopupCancel(ctx: BotContext): Promise<void>;
declare const _default: {
    handleTopup: typeof handleTopup;
    handleTopupAmountCallback: typeof handleTopupAmountCallback;
    handleTopupProviderCallback: typeof handleTopupProviderCallback;
    handleTransactionIdMessage: typeof handleTransactionIdMessage;
    handleTopupCancel: typeof handleTopupCancel;
};
export default _default;
//# sourceMappingURL=topupHandler.d.ts.map