import mongoose, { Document } from 'mongoose';
export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    email?: string;
    phoneNumber?: string;
    password?: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    googleId?: string;
    refreshToken?: string;
    googleTokens?: {
        access_token: string;
        refresh_token: string;
        scope: string;
        token_type: string;
        expiry_date: number;
    };
    authMethods: {
        email: boolean;
        phone: boolean;
        google: boolean;
    };
    verification: {
        email: {
            isVerified: boolean;
            token?: string;
            tokenExpires?: Date;
        };
        phone: {
            isVerified: boolean;
            otp?: string;
            otpExpires?: Date;
        };
    };
    aiSettings: {
        provider: 'openai' | 'gemini' | 'claude' | 'custom';
        apiKeys: {
            openai?: {
                key: string;
                encrypted: boolean;
            };
            gemini?: {
                key: string;
                encrypted: boolean;
            };
            claude?: {
                key: string;
                encrypted: boolean;
            };
        };
        preferences: {
            defaultModel: string;
            maxTokens: number;
            temperature: number;
        };
    };
    preferences: {
        theme: 'light' | 'dark' | 'system';
        notifications: {
            email: boolean;
            push: boolean;
            reminders: boolean;
            sms: boolean;
        };
        language: string;
        timezone: string;
    };
    subscription: {
        plan: 'free' | 'pro' | 'enterprise';
        status: 'active' | 'cancelled' | 'past_due';
        expiresAt?: Date;
    };
    storage: {
        used: number;
        limit: number;
    };
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    lastActiveAt: Date;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
    getFullName(): string;
    getStorageUsagePercentage(): number;
    canUpload(fileSize: number): boolean;
}
declare const _default: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=User.d.ts.map