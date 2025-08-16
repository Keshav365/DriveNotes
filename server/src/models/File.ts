import mongoose, { Document, Schema } from 'mongoose';

export interface IFile extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  originalName: string;
  size: number;
  contentType: string;
  extension: string;
  
  // Storage information
  firebasePath: string;
  firebaseUrl: string;
  publicUrl: string;
  
  // Organization
  folderId?: mongoose.Types.ObjectId;
  parentPath: string; // breadcrumb path like "folder1/subfolder2"
  
  // Ownership and permissions
  ownerId: mongoose.Types.ObjectId;
  permissions: {
    isPublic: boolean;
    allowedUsers: {
      userId: mongoose.Types.ObjectId;
      permission: 'read' | 'write' | 'admin';
    }[];
    shareLink?: {
      token: string;
      expiresAt?: Date;
      password?: string;
      allowDownload: boolean;
    };
  };
  
  // Metadata
  description?: string;
  tags: string[];
  
  // File processing
  thumbnail?: string;
  preview?: string;
  textContent?: string; // extracted text for search
  
  // Versioning
  version: number;
  previousVersions: {
    version: number;
    firebasePath: string;
    size: number;
    uploadedAt: Date;
    uploadedBy: mongoose.Types.ObjectId;
  }[];
  
  // Activity tracking
  uploadedAt: Date;
  uploadedBy: mongoose.Types.ObjectId;
  lastModified: Date;
  lastAccessedAt: Date;
  downloadCount: number;
  
  // Status
  status: 'uploading' | 'processing' | 'ready' | 'error';
  processingProgress?: number;
  errorMessage?: string;
  
  // AI analysis
  aiAnalysis?: {
    extractedText?: string;
    summary?: string;
    keywords: string[];
    category?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    analyzedAt: Date;
  };
  
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  canUserAccess(userId: string, action: 'read' | 'write' | 'admin'): boolean;
  generateShareLink(expiresAt?: Date, password?: string): string;
  getFormattedSize(): string;
  getFileIcon(): string;
  isImage(): boolean;
  isDocument(): boolean;
  isVideo(): boolean;
  isAudio(): boolean;
}

const fileSchema = new Schema<IFile>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255,
  },
  originalName: {
    type: String,
    required: true,
    trim: true,
  },
  size: {
    type: Number,
    required: true,
    min: 0,
  },
  contentType: {
    type: String,
    required: true,
  },
  extension: {
    type: String,
    required: true,
    lowercase: true,
  },
  
  // Storage information
  firebasePath: {
    type: String,
    required: true,
    unique: true,
  },
  firebaseUrl: {
    type: String,
    required: true,
  },
  publicUrl: {
    type: String,
    required: true,
  },
  
  // Organization
  folderId: {
    type: Schema.Types.ObjectId,
    ref: 'Folder',
    index: true,
  },
  parentPath: {
    type: String,
    default: '',
    index: true,
  },
  
  // Ownership and permissions
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  permissions: {
    isPublic: {
      type: Boolean,
      default: false,
    },
    allowedUsers: [{
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      permission: {
        type: String,
        enum: ['read', 'write', 'admin'],
        default: 'read',
      },
    }],
    shareLink: {
      token: String,
      expiresAt: Date,
      password: String,
      allowDownload: {
        type: Boolean,
        default: true,
      },
    },
  },
  
  // Metadata
  description: {
    type: String,
    maxlength: 1000,
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  
  // File processing
  thumbnail: String,
  preview: String,
  textContent: String, // for full-text search
  
  // Versioning
  version: {
    type: Number,
    default: 1,
  },
  previousVersions: [{
    version: Number,
    firebasePath: String,
    size: Number,
    uploadedAt: Date,
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  }],
  
  // Activity tracking
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  lastModified: {
    type: Date,
    default: Date.now,
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now,
  },
  downloadCount: {
    type: Number,
    default: 0,
  },
  
  // Status
  status: {
    type: String,
    enum: ['uploading', 'processing', 'ready', 'error'],
    default: 'uploading',
  },
  processingProgress: {
    type: Number,
    min: 0,
    max: 100,
  },
  errorMessage: String,
  
  // AI analysis
  aiAnalysis: {
    extractedText: String,
    summary: String,
    keywords: [String],
    category: String,
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
    },
    analyzedAt: Date,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      // Don't expose internal Firebase paths in API responses
      delete ret.firebasePath;
      return ret;
    },
  },
});

// Indexes for better performance
fileSchema.index({ ownerId: 1, createdAt: -1 });
fileSchema.index({ ownerId: 1, folderId: 1 });
fileSchema.index({ ownerId: 1, name: 'text', textContent: 'text', tags: 'text' });
fileSchema.index({ 'permissions.shareLink.token': 1 });
fileSchema.index({ status: 1 });
fileSchema.index({ lastAccessedAt: -1 });

// Instance methods
fileSchema.methods.canUserAccess = function(userId: string, action: 'read' | 'write' | 'admin'): boolean {
  const fileDoc = this as IFile;
  
  // Owner has all permissions
  if (fileDoc.ownerId.toString() === userId) {
    return true;
  }
  
  // Public files allow read access
  if (action === 'read' && fileDoc.permissions.isPublic) {
    return true;
  }
  
  // Check explicit permissions
  const userPermission = fileDoc.permissions.allowedUsers.find(
    perm => perm.userId.toString() === userId
  );
  
  if (!userPermission) {
    return false;
  }
  
  // Check permission hierarchy: admin > write > read
  const permissionLevels = { read: 1, write: 2, admin: 3 };
  const requiredLevel = permissionLevels[action];
  const userLevel = permissionLevels[userPermission.permission];
  
  return userLevel >= requiredLevel;
};

fileSchema.methods.generateShareLink = function(expiresAt?: Date, password?: string): string {
  const fileDoc = this as IFile;
  const token = require('crypto').randomBytes(32).toString('hex');
  
  fileDoc.permissions.shareLink = {
    token,
    expiresAt,
    password,
    allowDownload: true,
  };
  
  return `${process.env.CLIENT_URL}/share/${token}`;
};

fileSchema.methods.getFormattedSize = function(): string {
  const fileDoc = this as IFile;
  const bytes = fileDoc.size;
  
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

fileSchema.methods.getFileIcon = function(): string {
  const fileDoc = this as IFile;
  const ext = fileDoc.extension.toLowerCase();
  
  // Image files
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
    return 'image';
  }
  
  // Document files
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
    return 'document';
  }
  
  // Spreadsheet files
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
    return 'spreadsheet';
  }
  
  // Presentation files
  if (['ppt', 'pptx', 'odp'].includes(ext)) {
    return 'presentation';
  }
  
  // Video files
  if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'].includes(ext)) {
    return 'video';
  }
  
  // Audio files
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'].includes(ext)) {
    return 'audio';
  }
  
  // Archive files
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return 'archive';
  }
  
  // Code files
  if (['js', 'ts', 'html', 'css', 'py', 'java', 'cpp', 'c', 'php', 'rb'].includes(ext)) {
    return 'code';
  }
  
  return 'file';
};

fileSchema.methods.isImage = function(): boolean {
  return this.getFileIcon() === 'image';
};

fileSchema.methods.isDocument = function(): boolean {
  return ['document', 'spreadsheet', 'presentation'].includes(this.getFileIcon());
};

fileSchema.methods.isVideo = function(): boolean {
  return this.getFileIcon() === 'video';
};

fileSchema.methods.isAudio = function(): boolean {
  return this.getFileIcon() === 'audio';
};

// Pre-save middleware
fileSchema.pre('save', function(next) {
  if (this.isNew) {
    this.lastModified = new Date();
  }
  next();
});

export default mongoose.model<IFile>('File', fileSchema);
