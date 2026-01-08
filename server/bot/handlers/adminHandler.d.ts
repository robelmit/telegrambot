/**
 * Admin Handler - Bot management commands
 * Commands: /admin - Admin panel
 */
import { BotContext } from './types';
export declare function adminOnly(ctx: BotContext, next: () => Promise<void>): Promise<void>;
export declare function handleAdmin(ctx: BotContext): Promise<void>;
export declare function handleAdminStats(ctx: BotContext): Promise<void>;
export declare function handleAdminUsers(ctx: BotContext): Promise<void>;
export declare function handleAdminTransactions(ctx: BotContext): Promise<void>;
export declare function handleAdminPendingTx(ctx: BotContext): Promise<void>;
export declare function handleAdminApproveTx(ctx: BotContext, txId: string): Promise<void>;
export declare function handleAdminRejectTx(ctx: BotContext, txId: string): Promise<void>;
export declare function handleAdminJobs(ctx: BotContext): Promise<void>;
export declare function handleAdminFindUser(ctx: BotContext): Promise<void>;
export declare function handleAdminAddBalance(ctx: BotContext): Promise<void>;
export declare function handleAdminBan(ctx: BotContext): Promise<void>;
export declare function handleAdminUnban(ctx: BotContext): Promise<void>;
export declare function handleAdminMakeAdmin(ctx: BotContext): Promise<void>;
export declare function handleAdminBroadcast(ctx: BotContext): Promise<void>;
export declare function handleAdminBack(ctx: BotContext): Promise<void>;
export declare function handleAdminTextInput(ctx: BotContext): Promise<boolean>;
//# sourceMappingURL=adminHandler.d.ts.map