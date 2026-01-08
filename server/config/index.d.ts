export interface Config {
    telegramBotToken: string;
    mongodbUri: string;
    telebirrMerchantPhone: string;
    telebirrMerchantName: string;
    cbeMerchantAccount: string;
    cbeMerchantName: string;
    serviceFee: number;
    nodeEnv: string;
    agentCommissionPercent: number;
    rateLimitMax: number;
    rateLimitWindowMs: number;
    fileCleanupIntervalMs: number;
    fileMaxAgeMs: number;
    logLevel: string;
    tempDir: string;
}
export declare const config: Config;
export default config;
//# sourceMappingURL=index.d.ts.map