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
const fileSchema = new mongoose_1.Schema({
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
    folderId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Folder',
        index: true,
    },
    parentPath: {
        type: String,
        default: '',
        index: true,
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
            allowDownload: {
                type: Boolean,
                default: true,
            },
        },
    },
    description: {
        type: String,
        maxlength: 1000,
    },
    tags: [{
            type: String,
            trim: true,
            lowercase: true,
        }],
    thumbnail: String,
    preview: String,
    textContent: String,
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
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User',
            },
        }],
    uploadedAt: {
        type: Date,
        default: Date.now,
    },
    uploadedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        transform: function (doc, ret) {
            delete ret.firebasePath;
            return ret;
        },
    },
});
fileSchema.index({ ownerId: 1, createdAt: -1 });
fileSchema.index({ ownerId: 1, folderId: 1 });
fileSchema.index({ ownerId: 1, name: 'text', textContent: 'text', tags: 'text' });
fileSchema.index({ 'permissions.shareLink.token': 1 });
fileSchema.index({ status: 1 });
fileSchema.index({ lastAccessedAt: -1 });
fileSchema.methods.canUserAccess = function (userId, action) {
    const fileDoc = this;
    if (fileDoc.ownerId.toString() === userId) {
        return true;
    }
    if (action === 'read' && fileDoc.permissions.isPublic) {
        return true;
    }
    const userPermission = fileDoc.permissions.allowedUsers.find(perm => perm.userId.toString() === userId);
    if (!userPermission) {
        return false;
    }
    const permissionLevels = { read: 1, write: 2, admin: 3 };
    const requiredLevel = permissionLevels[action];
    const userLevel = permissionLevels[userPermission.permission];
    return userLevel >= requiredLevel;
};
fileSchema.methods.generateShareLink = function (expiresAt, password) {
    const fileDoc = this;
    const token = require('crypto').randomBytes(32).toString('hex');
    fileDoc.permissions.shareLink = {
        token,
        expiresAt,
        password,
        allowDownload: true,
    };
    return `${process.env.CLIENT_URL}/share/${token}`;
};
fileSchema.methods.getFormattedSize = function () {
    const fileDoc = this;
    const bytes = fileDoc.size;
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
fileSchema.methods.getFileIcon = function () {
    const fileDoc = this;
    const ext = fileDoc.extension.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
        return 'image';
    }
    if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
        return 'document';
    }
    if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
        return 'spreadsheet';
    }
    if (['ppt', 'pptx', 'odp'].includes(ext)) {
        return 'presentation';
    }
    if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'].includes(ext)) {
        return 'video';
    }
    if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'].includes(ext)) {
        return 'audio';
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
        return 'archive';
    }
    if (['js', 'ts', 'html', 'css', 'py', 'java', 'cpp', 'c', 'php', 'rb'].includes(ext)) {
        return 'code';
    }
    return 'file';
};
fileSchema.methods.isImage = function () {
    return this.getFileIcon() === 'image';
};
fileSchema.methods.isDocument = function () {
    return ['document', 'spreadsheet', 'presentation'].includes(this.getFileIcon());
};
fileSchema.methods.isVideo = function () {
    return this.getFileIcon() === 'video';
};
fileSchema.methods.isAudio = function () {
    return this.getFileIcon() === 'audio';
};
fileSchema.pre('save', function (next) {
    if (this.isNew) {
        this.lastModified = new Date();
    }
    next();
});
exports.default = mongoose_1.default.model('File', fileSchema);
//# sourceMappingURL=File.js.map