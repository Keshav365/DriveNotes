"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const userSchema = new mongoose_1.Schema({
    email: {
        type: String,
        sparse: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    phoneNumber: {
        type: String,
        sparse: true,
        unique: true,
        trim: true,
        index: true,
    },
    password: {
        type: String,
        minlength: 6,
        select: false,
    },
    firstName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
    },
    avatar: {
        type: String,
    },
    googleId: {
        type: String,
        sparse: true,
        index: true,
    },
    refreshToken: {
        type: String,
        select: false,
    },
    googleTokens: {
        access_token: String,
        refresh_token: String,
        scope: String,
        token_type: String,
        expiry_date: Number,
    },
    authMethods: {
        email: {
            type: Boolean,
            default: false,
        },
        phone: {
            type: Boolean,
            default: false,
        },
        google: {
            type: Boolean,
            default: false,
        },
    },
    verification: {
        email: {
            isVerified: {
                type: Boolean,
                default: false,
            },
            token: String,
            tokenExpires: Date,
        },
        phone: {
            isVerified: {
                type: Boolean,
                default: false,
            },
            otp: String,
            otpExpires: Date,
        },
    },
    aiSettings: {
        provider: {
            type: String,
            enum: ['openai', 'gemini', 'claude', 'custom'],
            default: 'openai',
        },
        apiKeys: {
            openai: {
                key: String,
                encrypted: {
                    type: Boolean,
                    default: true,
                },
            },
            gemini: {
                key: String,
                encrypted: {
                    type: Boolean,
                    default: true,
                },
            },
            claude: {
                key: String,
                encrypted: {
                    type: Boolean,
                    default: true,
                },
            },
        },
        preferences: {
            defaultModel: {
                type: String,
                default: 'gpt-3.5-turbo',
            },
            maxTokens: {
                type: Number,
                default: 1000,
            },
            temperature: {
                type: Number,
                default: 0.7,
                min: 0,
                max: 2,
            },
        },
    },
    preferences: {
        theme: {
            type: String,
            enum: ['light', 'dark', 'system'],
            default: 'system',
        },
        notifications: {
            email: {
                type: Boolean,
                default: true,
            },
            push: {
                type: Boolean,
                default: true,
            },
            reminders: {
                type: Boolean,
                default: true,
            },
            sms: {
                type: Boolean,
                default: false,
            },
        },
        language: {
            type: String,
            default: 'en',
        },
        timezone: {
            type: String,
            default: 'UTC',
        },
    },
    subscription: {
        plan: {
            type: String,
            enum: ['free', 'pro', 'enterprise'],
            default: 'free',
        },
        status: {
            type: String,
            enum: ['active', 'cancelled', 'past_due'],
            default: 'active',
        },
        expiresAt: Date,
    },
    storage: {
        used: {
            type: Number,
            default: 0,
        },
        limit: {
            type: Number,
            default: 5 * 1024 * 1024 * 1024,
        },
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    lastActiveAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            delete ret.password;
            delete ret.refreshToken;
            delete ret.passwordResetToken;
            delete ret.passwordResetExpires;
            return ret;
        },
    },
});
userSchema.index({ email: 1, googleId: 1 });
userSchema.index({ lastActiveAt: 1 });
userSchema.index({ createdAt: 1 });
userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password)
        return next();
    try {
        const salt = await bcryptjs_1.default.genSalt(12);
        this.password = await bcryptjs_1.default.hash(this.password, salt);
        next();
    }
    catch (error) {
        next(error);
    }
});
userSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password)
        return false;
    return bcryptjs_1.default.compare(candidatePassword, this.password);
};
userSchema.methods.getFullName = function () {
    return `${this.firstName} ${this.lastName}`.trim();
};
userSchema.methods.getStorageUsagePercentage = function () {
    return Math.round((this.storage.used / this.storage.limit) * 100);
};
userSchema.methods.canUpload = function (fileSize) {
    return (this.storage.used + fileSize) <= this.storage.limit;
};
exports.default = mongoose_1.default.model('User', userSchema);
//# sourceMappingURL=User.js.map