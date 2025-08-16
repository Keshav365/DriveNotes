import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  
  // Authentication fields
  email?: string;
  phoneNumber?: string;
  password?: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  
  // OAuth fields
  googleId?: string;
  refreshToken?: string;
  googleTokens?: {
    access_token: string;
    refresh_token: string;
    scope: string;
    token_type: string;
    expiry_date: number;
  };
  
  // Authentication methods used
  authMethods: {
    email: boolean;
    phone: boolean;
    google: boolean;
  };
  
  // Verification status
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
  
  // AI Provider settings
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
    used: number; // in bytes
    limit: number; // in bytes
  };
  
  // Security
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

const userSchema = new Schema<IUser>({
  // Authentication fields
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
  
  // OAuth fields
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
  
  // Authentication methods used
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
  
  // Verification status
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
  
  // AI Provider settings
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
      default: 5 * 1024 * 1024 * 1024, // 5GB for free users
    },
  },
  
  // Security
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastActiveAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.refreshToken;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      return ret;
    },
  },
});

// Indexes
userSchema.index({ email: 1, googleId: 1 });
userSchema.index({ lastActiveAt: 1 });
userSchema.index({ createdAt: 1 });

// Pre-save hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Get full name
userSchema.methods.getFullName = function(): string {
  return `${this.firstName} ${this.lastName}`.trim();
};

// Get storage usage percentage
userSchema.methods.getStorageUsagePercentage = function(): number {
  return Math.round((this.storage.used / this.storage.limit) * 100);
};

// Check if user can upload file
userSchema.methods.canUpload = function(fileSize: number): boolean {
  return (this.storage.used + fileSize) <= this.storage.limit;
};

export default mongoose.model<IUser>('User', userSchema);
