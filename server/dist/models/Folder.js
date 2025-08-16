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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const folderSchema = new mongoose_1.Schema({
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
    parentId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        max: 20,
    },
    ownerId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
                    type: mongoose_1.Schema.Types.ObjectId,
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
    color: {
        type: String,
        match: /^#[0-9A-F]{6}$/i,
        default: '#3B82F6',
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
folderSchema.index({ ownerId: 1, createdAt: -1 });
folderSchema.index({ ownerId: 1, parentId: 1 });
folderSchema.index({ ownerId: 1, name: 'text', tags: 'text' });
folderSchema.index({ 'permissions.shareLink.token': 1 });
folderSchema.index({ parentPath: 1 });
folderSchema.pre('save', async function (next) {
    if (this.parentId) {
        if (this.parentId.toString() === this._id.toString()) {
            return next(new Error('Folder cannot be its own parent'));
        }
        const isCircular = await this.isAncestorOf(this.parentId.toString());
        if (isCircular) {
            return next(new Error('Circular folder reference detected'));
        }
    }
    next();
});
folderSchema.methods.canUserAccess = function (userId, action) {
    const folderDoc = this;
    if (folderDoc.ownerId.toString() === userId) {
        return true;
    }
    if (action === 'read' && folderDoc.permissions.isPublic) {
        return true;
    }
    const userPermission = folderDoc.permissions.allowedUsers.find(perm => perm.userId.toString() === userId);
    if (!userPermission) {
        return false;
    }
    const permissionLevels = { read: 1, write: 2, admin: 3 };
    const requiredLevel = permissionLevels[action];
    const userLevel = permissionLevels[userPermission.permission];
    return userLevel >= requiredLevel;
};
folderSchema.methods.generateShareLink = function (expiresAt, password) {
    const folderDoc = this;
    const token = require('crypto').randomBytes(32).toString('hex');
    folderDoc.permissions.shareLink = {
        token,
        expiresAt,
        password,
        allowUpload: false,
    };
    return `${process.env.CLIENT_URL}/share/${token}`;
};
folderSchema.methods.getFormattedSize = function () {
    const folderDoc = this;
    const bytes = folderDoc.totalSize;
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
folderSchema.methods.updateStatistics = async function () {
    const folderDoc = this;
    const File = mongoose_1.default.model('File');
    const Folder = mongoose_1.default.model('Folder');
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
    const subfolderCount = await Folder.countDocuments({ parentId: folderDoc._id });
    folderDoc.fileCount = fileStats[0]?.count || 0;
    folderDoc.totalSize = fileStats[0]?.totalSize || 0;
    folderDoc.subfolderCount = subfolderCount;
    folderDoc.lastModified = new Date();
};
folderSchema.methods.getFullPath = function () {
    const folderDoc = this;
    return folderDoc.parentPath ? `${folderDoc.parentPath}/${folderDoc.name}` : folderDoc.name;
};
folderSchema.methods.getAllSubfolders = async function () {
    const folderDoc = this;
    const Folder = mongoose_1.default.model('Folder');
    return await Folder.find({
        ownerId: folderDoc.ownerId,
        parentPath: { $regex: `^${folderDoc.getFullPath()}` },
    });
};
folderSchema.methods.isAncestorOf = async function (folderId) {
    const folderDoc = this;
    const Folder = mongoose_1.default.model('Folder');
    if (!folderId || folderId === folderDoc._id.toString()) {
        return false;
    }
    const targetFolder = await Folder.findById(folderId);
    if (!targetFolder) {
        return false;
    }
    const thisPath = folderDoc.getFullPath();
    return targetFolder.parentPath.startsWith(thisPath);
};
folderSchema.index({ ownerId: 1, parentId: 1, name: 1 }, { unique: true });
exports.default = mongoose_1.default.model('Folder', folderSchema);
//# sourceMappingURL=Folder.js.map