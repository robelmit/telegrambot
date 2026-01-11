type ShutdownCallback = () => Promise<void>;
export declare function registerShutdownCallback(callback: ShutdownCallback): void;
export declare function gracefulShutdown(signal: string): Promise<void>;
export declare function setupShutdownHandlers(): void;
export declare function registerShutdownHandlers(callback: ShutdownCallback): void;
export {};
//# sourceMappingURL=shutdown.d.ts.map