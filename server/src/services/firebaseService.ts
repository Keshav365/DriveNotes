import admin from 'firebase-admin';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

interface FirebaseConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  storageBucket: string;
}

export interface FileUploadResult {
  url: string;
  fileName: string;
  size: number;
  contentType: string;
  firebaseUrl: string;
}

export class FirebaseStorageService {
  private storage: admin.storage.Storage;
  private bucket: admin.storage.Bucket;

  constructor(config: FirebaseConfig) {
    // Initialize Firebase Admin SDK
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.projectId,
          clientEmail: config.clientEmail,
          privateKey: config.privateKey.replace(/\\n/g, '\n'),
        }),
        storageBucket: config.storageBucket,
      });
    }

    this.storage = admin.storage();
    this.bucket = this.storage.bucket();
  }

  /**
   * Upload file to Firebase Storage
   */
  async uploadFile(
    file: Buffer,
    fileName: string,
    contentType: string,
    userId: string,
    folder?: string
  ): Promise<FileUploadResult> {
    try {
      const fileId = uuidv4();
      const sanitizedFileName = this.sanitizeFileName(fileName);
      const path = folder 
        ? `users/${userId}/${folder}/${fileId}_${sanitizedFileName}`
        : `users/${userId}/${fileId}_${sanitizedFileName}`;

      const fileRef = this.bucket.file(path);
      
      // Create write stream
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
          logger.error('Firebase upload error:', error);
          reject(new Error('Failed to upload file to Firebase'));
        });

        stream.on('finish', async () => {
          try {
            // Make file publicly accessible
            await fileRef.makePublic();
            
            // Get public URL
            const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${path}`;
            
            // Get Firebase download URL
            const [url] = await fileRef.getSignedUrl({
              action: 'read',
              expires: '03-09-2491', // Long expiry
            });

            resolve({
              url: publicUrl,
              fileName: sanitizedFileName,
              size: file.length,
              contentType,
              firebaseUrl: url,
            });
          } catch (error) {
            logger.error('Error getting file URL:', error);
            reject(new Error('Failed to get file URL'));
          }
        });

        stream.end(file);
      });
    } catch (error) {
      logger.error('Firebase upload error:', error);
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Delete file from Firebase Storage
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const fileRef = this.bucket.file(filePath);
      await fileRef.delete();
      logger.info(`File deleted successfully: ${filePath}`);
      return true;
    } catch (error) {
      logger.error('Firebase delete error:', error);
      return false;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(filePath: string) {
    try {
      const fileRef = this.bucket.file(filePath);
      const [metadata] = await fileRef.getMetadata();
      return metadata;
    } catch (error) {
      logger.error('Error getting file metadata:', error);
      throw new Error('Failed to get file metadata');
    }
  }

  /**
   * List files for a user
   */
  async listUserFiles(userId: string, folder?: string) {
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
    } catch (error) {
      logger.error('Error listing files:', error);
      throw new Error('Failed to list files');
    }
  }

  /**
   * Get signed URL for temporary access
   */
  async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    try {
      const fileRef = this.bucket.file(filePath);
      const [url] = await fileRef.getSignedUrl({
        action: 'read',
        expires: Date.now() + expiresIn * 1000,
      });
      return url;
    } catch (error) {
      logger.error('Error getting signed URL:', error);
      throw new Error('Failed to get signed URL');
    }
  }

  /**
   * Copy file to new location
   */
  async copyFile(sourcePath: string, destinationPath: string): Promise<boolean> {
    try {
      const sourceFile = this.bucket.file(sourcePath);
      const destinationFile = this.bucket.file(destinationPath);
      
      await sourceFile.copy(destinationFile);
      logger.info(`File copied from ${sourcePath} to ${destinationPath}`);
      return true;
    } catch (error) {
      logger.error('Error copying file:', error);
      return false;
    }
  }

  /**
   * Get storage usage for a user
   */
  async getUserStorageUsage(userId: string): Promise<number> {
    try {
      const [files] = await this.bucket.getFiles({
        prefix: `users/${userId}/`,
      });

      const totalSize = files.reduce((sum, file) => {
        return sum + (parseInt(file.metadata.size) || 0);
      }, 0);

      return totalSize;
    } catch (error) {
      logger.error('Error calculating storage usage:', error);
      return 0;
    }
  }

  /**
   * Sanitize file name for safe storage
   */
  private sanitizeFileName(fileName: string): string {
    // Remove or replace unsafe characters
    return fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
  }

  /**
   * Generate thumbnail for images
   */
  async generateThumbnail(
    file: Buffer,
    fileName: string,
    userId: string
  ): Promise<string | null> {
    try {
      // This would require additional image processing library like Sharp
      // For now, return null - can be implemented later
      logger.info(`Thumbnail generation requested for ${fileName}`);
      return null;
    } catch (error) {
      logger.error('Error generating thumbnail:', error);
      return null;
    }
  }
}

// Default Firebase service instance
export const defaultFirebaseService = new FirebaseStorageService({
  projectId: process.env.FIREBASE_PROJECT_ID || '',
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  privateKey: process.env.FIREBASE_PRIVATE_KEY || '',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
});
