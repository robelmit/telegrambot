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
  
  // Address (English)
  region: string;
  city: string;
  subcity: string;
  
  // Address (Amharic) - for rendering
  regionAmharic?: string;
  zoneAmharic?: string;
  woredaAmharic?: string;
  sexAmharic?: string;
  
  // Identifiers
  fcn: string;  // Fayda Card Number (16 digits) - same as FAN
  fin: string;  // Fayda Identification Number (12 digits)
  fan: string;  // Fayda Account Number (16 digits) - same as FCN
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
// Normal = regular orientation, Mirrored = back card flipped for printing
export interface GeneratedFiles {
  colorNormalPng: string;       // Color PNG (normal orientation)
  colorMirroredPng: string;     // Color PNG (back mirrored for printing)
  colorNormalPdf: string;       // Color PDF (normal orientation)
  colorMirroredPdf: string;     // Color PDF (back mirrored for printing)
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

// Top-up amounts (exactly 6 options)
export const TOPUP_AMOUNTS = [100, 500, 1000, 3000, 5000, 10000] as const;
export type TopupAmount = typeof TOPUP_AMOUNTS[number];
