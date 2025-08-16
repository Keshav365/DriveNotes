"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultFirebaseService = exports.FirebaseStorageService = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const logger_1 = require("../utils/logger");
const uuid_1 = require("uuid");
class FirebaseStorageService {
    constructor(config) {
        if (!firebase_admin_1.default.apps.length) {
            firebase_admin_1.default.initializeApp({
                credential: firebase_admin_1.default.credential.cert({
                    projectId: config.projectId,
                    clientEmail: config.clientEmail,
                    privateKey: config.privateKey.replace(/\\n/g, '\n'),
                }),
                storageBucket: config.storageBucket,
            });
        }
        this.storage = firebase_admin_1.default.storage();
        this.bucket = this.storage.bucket();
    }
    async uploadFile(file, fileName, contentType, userId, folder) {
        try {
            const fileId = (0, uuid_1.v4)();
            const sanitizedFileName = this.sanitizeFileName(fileName);
            const path = folder
                ? `users/${userId}/${folder}/${fileId}_${sanitizedFileName}`
                : `users/${userId}/${fileId}_${sanitizedFileName}`;
            const fileRef = this.bucket.file(path);
            const stream = fileRef.createWriteStream({
                metadata: {
                    contentType,
                    metadata: {
                        userId,
                        uploadedAt: new Date().toISOString(),
                        originalName: fileName,
                    },
                },
                resumable: false,
            });
            return new Promise((resolve, reject) => {
                stream.on('error', (error) => {
                    logger_1.logger.error('Firebase upload error:', error);
                    reject(new Error('Failed to upload file to Firebase'));
                });
                stream.on('finish', async () => {
                    try {
                        await fileRef.makePublic();
                        const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${path}`;
                        const [url] = await fileRef.getSignedUrl({
                            action: 'read',
                            expires: '03-09-2491',
                        });
                        resolve({
                            url: publicUrl,
                            fileName: sanitizedFileName,
                            size: file.length,
                            contentType,
                            firebaseUrl: url,
                        });
                    }
                    catch (error) {
                        logger_1.logger.error('Error getting file URL:', error);
                        reject(new Error('Failed to get file URL'));
                    }
                });
                stream.end(file);
            });
        }
        catch (error) {
            logger_1.logger.error('Firebase upload error:', error);
            throw new Error('Failed to upload file');
        }
    }
    async deleteFile(filePath) {
        try {
            const fileRef = this.bucket.file(filePath);
            await fileRef.delete();
            logger_1.logger.info(`File deleted successfully: ${filePath}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Firebase delete error:', error);
            return false;
        }
    }
    async getFileMetadata(filePath) {
        try {
            const fileRef = this.bucket.file(filePath);
            const [metadata] = await fileRef.getMetadata();
            return metadata;
        }
        catch (error) {
            logger_1.logger.error('Error getting file metadata:', error);
            throw new Error('Failed to get file metadata');
        }
    }
    async listUserFiles(userId, folder) {
        try {
            const prefix = folder
                ? `users/${userId}/${folder}/`
                : `users/${userId}/`;
            const [files] = await this.bucket.getFiles({ prefix });
            return files.map(file => ({
                name: file.name,
                size: file.metadata.size,
                contentType: file.metadata.contentType,
                created: file.metadata.timeCreated,
                updated: file.metadata.updated,
                publicUrl: `https://storage.googleapis.com/${this.bucket.name}/${file.name}`,
            }));
        }
        catch (error) {
            logger_1.logger.error('Error listing files:', error);
            throw new Error('Failed to list files');
        }
    }
    async getSignedUrl(filePath, expiresIn = 3600) {
        try {
            const fileRef = this.bucket.file(filePath);
            const [url] = await fileRef.getSignedUrl({
                action: 'read',
                expires: Date.now() + expiresIn * 1000,
            });
            return url;
        }
        catch (error) {
            logger_1.logger.error('Error getting signed URL:', error);
            throw new Error('Failed to get signed URL');
        }
    }
    async copyFile(sourcePath, destinationPath) {
        try {
            const sourceFile = this.bucket.file(sourcePath);
            const destinationFile = this.bucket.file(destinationPath);
            await sourceFile.copy(destinationFile);
            logger_1.logger.info(`File copied from ${sourcePath} to ${destinationPath}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error copying file:', error);
            return false;
        }
    }
    async getUserStorageUsage(userId) {
        try {
            const [files] = await this.bucket.getFiles({
                prefix: `users/${userId}/`,
            });
            const totalSize = files.reduce((sum, file) => {
                return sum + (parseInt(file.metadata.size) || 0);
            }, 0);
            return totalSize;
        }
        catch (error) {
            logger_1.logger.error('Error calculating storage usage:', error);
            return 0;
        }
    }
    sanitizeFileName(fileName) {
        return fileName
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .replace(/_+/g, '_')
            .toLowerCase();
    }
    async generateThumbnail(file, fileName, userId) {
        try {
            logger_1.logger.info(`Thumbnail generation requested for ${fileName}`);
            return null;
        }
        catch (error) {
            logger_1.logger.error('Error generating thumbnail:', error);
            return null;
        }
    }
}
exports.FirebaseStorageService = FirebaseStorageService;
exports.defaultFirebaseService = new FirebaseStorageService({
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
});
//# sourceMappingURL=firebaseService.js.map