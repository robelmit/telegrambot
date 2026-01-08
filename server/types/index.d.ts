export type Language = 'en' | 'am' | 'ti';
export type PaymentProvider = 'telebirr' | 'cbe';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type TransactionType = 'credit' | 'debit';
export interface EfaydaData {
    fullNameAmharic: string;
    fullNameEnglish: string;
    dateOfBirthEthiopian: string;
    dateOfBirthGregorian: string;
    sex: 'Male' | 'Female';
    nationality: string;
    phoneNumber: string;
    region: string;
    city: string;
    subcity: string;
    regionAmharic?: string;
    zoneAmharic?: string;
    woredaAmharic?: string;
    sexAmharic?: string;
    fcn: string;
    fin: string;
    fan: string;
    serialNumber: string;
    issueDate: string;
    issueDateEthiopian?: string;
    expiryDate: string;
    expiryDateGregorian?: string;
    expiryDateEthiopian?: string;
    photo?: string | Buffer;
    qrCode?: string | Buffer;
    barcode?: string;
}
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}
export interface TransactionVerification {
    isValid: boolean;
    amount?: number;
    receiver?: string;
    sender?: string;
    timestamp?: Date;
    error?: string;
}
export interface GeneratedFiles {
    colorMirroredPng: string;
    grayscaleMirroredPng: string;
    colorMirroredPdf: string;
    grayscaleMirroredPdf: string;
}
export interface CardGeneratorOptions {
    variant: 'color' | 'grayscale';
    mirrored: boolean;
    dpi: number;
}
export interface UserSettings {
    language: Language;
    notifications: boolean;
}
export interface WalletTransaction {
    id: string;
    userId: string;
    type: TransactionType;
    amount: number;
    reference: string;
    timestamp: Date;
}
export declare const TOPUP_AMOUNTS: readonly [100, 500, 1000, 3000, 5000, 10000];
export type TopupAmount = typeof TOPUP_AMOUNTS[number];
//# sourceMappingURL=index.d.ts.map