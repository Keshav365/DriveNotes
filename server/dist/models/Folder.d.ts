import mongoose, { Document } from 'mongoose';
export interface IFolder extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    parentId?: mongoose.Types.ObjectId;
    parentPath: string;
    level: number;
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
    color?: string;
    icon?: string;
    tags: string[];
    fileCount: number;
    totalSize: number;
    subfolderCount: number;
    createdAt: Date;
    updatedAt: Date;
    lastModified: Date;
    lastAccessedAt: Date;
    canUserAccess(userId: string, action: 'read' | 'write' | 'admin'): boolean;
    generateShareLink(expiresAt?: Date, password?: string): string;
    getFormattedSize(): string;
    updateStatistics(): Promise<void>;
    getFullPath(): string;
    getAllSubfolders(): Promise<IFolder[]>;
    isAncestorOf(folderId: string): Promise<boolean>;
}
declare const _default: mongoose.Model<IFolder, {}, {}, {}, mongoose.Document<unknown, {}, IFolder, {}, {}> & IFolder & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Folder.d.ts.map