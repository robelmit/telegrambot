import { BotContext } from './types';
/**
 * Handle /bulk command - Start bulk upload session
 */
export declare function handleBulk(ctx: BotContext): Promise<void>;
/**
 * Handle bulk document upload
 */
export declare function handleBulkDocument(ctx: BotContext): Promise<void>;
/**
 * Handle bulk_done callback - Process all bulk files
 */
export declare function handleBulkDoneCallback(ctx: BotContext): Promise<void>;
/**
 * Handle bulk_cancel callback - Cancel bulk session
 */
export declare function handleBulkCancelCallback(ctx: BotContext): Promise<void>;
/**
 * Handle /bulkdone command - Process all bulk files
 */
export declare function handleBulkDone(ctx: BotContext): Promise<void>;
/**
 * Handle /bulkcancel command - Cancel bulk session
 */
export declare function handleBulkCancel(ctx: BotContext): Promise<void>;
/**
 * Check if user is in bulk upload mode
 */
export declare function isInBulkMode(ctx: BotContext): boolean;
//# sourceMappingURL=bulkHandler.d.ts.map