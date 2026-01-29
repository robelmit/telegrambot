import mongoose, { Schema, Document, Types } from 'mongoose';
import { Language, UserSettings } from '../types';

export type TemplateType = 'template0' | 'template1' | 'template2';

export interface IUser extends Document {
  telegramId: number;
  language: Language;
  walletBalance: number;
  settings: UserSettings;
  // Admin field
  isAdmin: boolean;
  // Fayda free access (for National ID downloads)
  faydaFree: boolean;
  // Agent/Referral fields
  isAgent: boolean;
  agentCode: string | null;
  referredBy: Types.ObjectId | null;
  referredByTelegramId: number | null;
  totalEarnings: number;
  totalReferrals: number;
  // Stats
  totalOrders: number;
  isBanned: boolean;
  banReason: string | null;
  // Template preference (persisted)
  selectedTemplate: TemplateType;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  telegramId: { 
    type: Number, 
    required: true, 
    unique: true, 
    index: true 
  },
  language: { 
    type: String, 
    enum: ['en', 'am', 'ti'], 
    default: 'en' 
  },
  walletBalance: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  settings: {
    language: { 
      type: String, 
      enum: ['en', 'am', 'ti'], 
      default: 'en' 
    },
    notifications: { 
      type: Boolean, 
      default: true 
    }
  },
  // Admin field
  isAdmin: {
    type: Boolean,
    default: false
  },
  // Fayda free access (for National ID downloads)
  faydaFree: {
    type: Boolean,
    default: false
  },
  // Agent/Referral fields
  isAgent: {
    type: Boolean,
    default: false
  },
  agentCode: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  referredBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  referredByTelegramId: {
    type: Number,
    default: null
  },
  totalEarnings: {
    type: Number,
    default: 0,
    min: 0
  },
  totalReferrals: {
    type: Number,
    default: 0,
    min: 0
  },
  // Stats
  totalOrders: {
    type: Number,
    default: 0,
    min: 0
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  banReason: {
    type: String,
    default: null
  },
  // Template preference (persisted across sessions)
  selectedTemplate: {
    type: String,
    enum: ['template0', 'template1', 'template2'],
    default: 'template2'  // Template 3 is the default
  }
}, {
  timestamps: true
});

export const User = mongoose.model<IUser>('User', UserSchema);
export default User;
