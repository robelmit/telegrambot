// Language types
export type Language = 'en' | 'am' | 'ti';

// Payment provider types
export type PaymentProvider = 'telebirr' | 'cbe';

// Job status types
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Transaction types
export type TransactionType = 'credit' | 'debit';

// eFayda extracted data interface
export interface EfaydaData {
  // Personal Information
  fullNameAmharic: string;
  fullNameEnglish: string;
  dateOfBirthEthiopian: string;
  dateOfBirthGregorian: string;
  sex: 'Male' | 'Female';
  nationality: string;
  phoneNumber: string;
  
  // Address
  region: string;
  city: string;
  subcity: string;
  
  // Identifiers
  fcn: string;  // Fayda Card Number
  fin: string;  // Fayda Identification Number
  fan: string;  // Fayda Account Number
  serialNumber: string;
  
  // Dates
  issueDate: string;
  issueDateEthiopian?: string;
  expiryDate: string;
  expiryDateGregorian?: string;
  expiryDateEthiopian?: string;
  
  // Images (Base64 or Buffer)
  photo?: string | Buffer;
  qrCode?: string | Buffer;
  barcode?: string;
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Transaction verification result
export interface TransactionVerification {
  isValid: boolean;
  amount?: number;
  receiver?: string;
  sender?: string;
  timestamp?: Date;
  error?: string;
}

// Generated files interface
export interface GeneratedFiles {
  colorMirroredPng: string;
  grayscaleMirroredPng: string;
  colorMirroredPdf: string;
  grayscaleMirroredPdf: string;
}

// Card generator options
export interface CardGeneratorOptions {
  variant: 'color' | 'grayscale';
  mirrored: boolean;
  dpi: number;
}

// User settings interface
export interface UserSettings {
  language: Language;
  notifications: boolean;
}

// Wallet transaction interface
export interface WalletTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  reference: string;
  timestamp: Date;
}

// Top-up amounts (exactly 8 options)
export const TOPUP_AMOUNTS = [100, 200, 300, 400, 500, 600, 800, 1000] as const;
export type TopupAmount = typeof TOPUP_AMOUNTS[number];
