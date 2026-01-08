import mongoose, { Document, Types } from 'mongoose';
import { Language, UserSettings } from '../types';
export interface IUser extends Document {
    telegramId: number;
    language: Language;
    walletBalance: number;
    settings: UserSettings;
    isAdmin: boolean;
    isAgent: boolean;
    agentCode: string | null;
    referredBy: Types.ObjectId | null;
    referredByTelegramId: number | null;
    totalEarnings: number;
    totalReferrals: number;
    totalOrders: number;
    isBanned: boolean;
    banReason: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export declare const User: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default User;
//# sourceMappingURL=User.d.ts.map