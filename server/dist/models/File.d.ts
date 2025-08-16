import mongoose, { Document } from 'mongoose';
export interface IFile extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    originalName: string;
    size: number;
    contentType: string;
    extension: string;
    firebasePath: string;
    firebaseUrl: string;
    publicUrl: string;
    folderId?: mongoose.Types.ObjectId;
    parentPath: string;
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
    description?: string;
    tags: string[];
    thumbnail?: string;
    preview?: string;
    textContent?: string;
    version: number;
    previousVersions: {
        version: number;
        firebasePath: string;
        size: number;
        uploadedAt: Date;
        uploadedBy: mongoose.Types.ObjectId;
    }[];
    uploadedAt: Date;
    uploadedBy: mongoose.Types.ObjectId;
    lastModified: Date;
    lastAccessedAt: Date;
    downloadCount: number;
    status: 'uploading' | 'processing' | 'ready' | 'error';
    processingProgress?: number;
    errorMessage?: string;
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
    canUserAccess(userId: string, action: 'read' | 'write' | 'admin'): boolean;
    generateShareLink(expiresAt?: Date, password?: string): string;
    getFormattedSize(): string;
    getFileIcon(): string;
    isImage(): boolean;
    isDocument(): boolean;
    isVideo(): boolean;
    isAudio(): boolean;
}
declare const _default: mongoose.Model<IFile, {}, {}, {}, mongoose.Document<unknown, {}, IFile, {}, {}> & IFile & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=File.d.ts.map