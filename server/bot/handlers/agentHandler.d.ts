import { BotContext } from './types';
export declare function handleAgent(ctx: BotContext): Promise<void>;
export declare function handleAgentRegister(ctx: BotContext): Promise<void>;
export declare function handleAgentCancel(ctx: BotContext): Promise<void>;
export declare function handleAgentReferrals(ctx: BotContext): Promise<void>;
export declare function handleAgentShare(ctx: BotContext): Promise<void>;
export declare function handleAgentWithdraw(ctx: BotContext): Promise<void>;
export declare function handleAgentBack(ctx: BotContext): Promise<void>;
export declare function processReferral(telegramId: number, referralCode: string): Promise<boolean>;
export declare function creditAgentCommission(userId: string, amount: number): Promise<void>;
declare const _default: {
    handleAgent: typeof handleAgent;
    handleAgentRegister: typeof handleAgentRegister;
    handleAgentCancel: typeof handleAgentCancel;
    handleAgentReferrals: typeof handleAgentReferrals;
    handleAgentShare: typeof handleAgentShare;
    handleAgentWithdraw: typeof handleAgentWithdraw;
    handleAgentBack: typeof handleAgentBack;
    processReferral: typeof processReferral;
    creditAgentCommission: typeof creditAgentCommission;
};
export default _default;
//# sourceMappingURL=agentHandler.d.ts.map