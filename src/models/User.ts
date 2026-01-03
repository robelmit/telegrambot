import mongoose, { Schema, Document } from 'mongoose';
import { Language, UserSettings } from '../types';

export interface IUser extends Document {
  telegramId: number;
  language: Language;
  walletBalance: number;
  settings: UserSettings;
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
  }
}, {
  timestamps: true
});

// Index for faster lookups
UserSchema.index({ telegramId: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
export default User;
