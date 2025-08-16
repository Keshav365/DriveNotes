import mongoose, { Document, Schema } from 'mongoose';

export interface IFolder extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  
  // Organization
  parentId?: mongoose.Types.ObjectId;
  parentPath: string; // breadcrumb path like "folder1/subfolder2"
  level: number; // depth level in folder hierarchy
  
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
      allowUpload: boolean;
    };
  };
  
  // Metadata
  color?: string; // hex color for folder customization
  icon?: string; // custom icon identifier
  tags: string[];
  
  // Statistics
  fileCount: number;
  totalSize: number;
  subfolderCount: number;
  
  // Activity tracking
  createdAt: Date;
  updatedAt: Date;
  lastModified: Date;
  lastAccessedAt: Date;
  
  // Methods
  canUserAccess(userId: string, action: 'read' | 'write' | 'admin'): boolean;
  generateShareLink(expiresAt?: Date, password?: string): string;
  getFormattedSize(): string;
  updateStatistics(): Promise<void>;
  getFullPath(): string;
  getAllSubfolders(): Promise<IFolder[]>;
  isAncestorOf(folderId: string): Promise<boolean>;
}

const folderSchema = new Schema<IFolder>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255,
  },
  description: {
    type: String,
    maxlength: 1000,
  },
  
  // Organization
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'Folder',
    index: true,
  },
  parentPath: {
    type: String,
    default: '',
    index: true,
  },
  level: {
    type: Number,
    default: 0,
    min: 0,
    max: 20, // Prevent infinitely deep folder structures
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
      allowUpload: {
        type: Boolean,
        default: false,
      },
    },
  },
  
  // Metadata
  color: {
    type: String,
    match: /^#[0-9A-F]{6}$/i,
    default: '#3B82F6', // blue-500
  },
  icon: {
    type: String,
    default: 'folder',
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  
  // Statistics
  fileCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalSize: {
    type: Number,
    default: 0,
    min: 0,
  },
  subfolderCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  
  // Activity tracking
  lastModified: {
    type: Date,
    default: Date.now,
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes for better performance
folderSchema.index({ ownerId: 1, createdAt: -1 });
folderSchema.index({ ownerId: 1, parentId: 1 });
folderSchema.index({ ownerId: 1, name: 'text', tags: 'text' });
folderSchema.index({ 'permissions.shareLink.token': 1 });
folderSchema.index({ parentPath: 1 });

// Prevent circular references
folderSchema.pre('save', async function(next) {
  if (this.parentId) {
    // Check if trying to set parent as itself
    if (this.parentId.toString() === this._id.toString()) {
      return next(new Error('Folder cannot be its own parent'));
    }
    
    // Check for circular reference
    const isCircular = await this.isAncestorOf(this.parentId.toString());
    if (isCircular) {
      return next(new Error('Circular folder reference detected'));
    }
  }
  next();
});

// Instance methods
folderSchema.methods.canUserAccess = function(userId: string, action: 'read' | 'write' | 'admin'): boolean {
  const folderDoc = this as IFolder;
  
  // Owner has all permissions
  if (folderDoc.ownerId.toString() === userId) {
    return true;
  }
  
  // Public folders allow read access
  if (action === 'read' && folderDoc.permissions.isPublic) {
    return true;
  }
  
  // Check explicit permissions
  const userPermission = folderDoc.permissions.allowedUsers.find(
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

folderSchema.methods.generateShareLink = function(expiresAt?: Date, password?: string): string {
  const folderDoc = this as IFolder;
  const token = require('crypto').randomBytes(32).toString('hex');
  
  folderDoc.permissions.shareLink = {
    token,
    expiresAt,
    password,
    allowUpload: false,
  };
  
  return `${process.env.CLIENT_URL}/share/${token}`;
};

folderSchema.methods.getFormattedSize = function(): string {
  const folderDoc = this as IFolder;
  const bytes = folderDoc.totalSize;
  
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

folderSchema.methods.updateStatistics = async function(): Promise<void> {
  const folderDoc = this as IFolder;
  const File = mongoose.model('File');
  const Folder = mongoose.model('Folder');
  
  // Count direct files and their total size
  const fileStats = await File.aggregate([
    { $match: { folderId: folderDoc._id } },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        totalSize: { $sum: '$size' },
      },
    },
  ]);
  
  // Count direct subfolders
  const subfolderCount = await Folder.countDocuments({ parentId: folderDoc._id });
  
  folderDoc.fileCount = fileStats[0]?.count || 0;
  folderDoc.totalSize = fileStats[0]?.totalSize || 0;
  folderDoc.subfolderCount = subfolderCount;
  folderDoc.lastModified = new Date();
};

folderSchema.methods.getFullPath = function(): string {
  const folderDoc = this as IFolder;
  return folderDoc.parentPath ? `${folderDoc.parentPath}/${folderDoc.name}` : folderDoc.name;
};

folderSchema.methods.getAllSubfolders = async function(): Promise<IFolder[]> {
  const folderDoc = this as IFolder;
  const Folder = mongoose.model('Folder');
  
  return await Folder.find({
    ownerId: folderDoc.ownerId,
    parentPath: { $regex: `^${folderDoc.getFullPath()}` },
  });
};

folderSchema.methods.isAncestorOf = async function(folderId: string): Promise<boolean> {
  const folderDoc = this as IFolder;
  const Folder = mongoose.model('Folder');
  
  if (!folderId || folderId === folderDoc._id.toString()) {
    return false;
  }
  
  const targetFolder = await Folder.findById(folderId);
  if (!targetFolder) {
    return false;
  }
  
  // Check if this folder is in the target's parent path
  const thisPath = folderDoc.getFullPath();
  return targetFolder.parentPath.startsWith(thisPath);
};

// Compound unique index to prevent duplicate folder names within the same parent
folderSchema.index({ ownerId: 1, parentId: 1, name: 1 }, { unique: true });

export default mongoose.model<IFolder>('Folder', folderSchema);
