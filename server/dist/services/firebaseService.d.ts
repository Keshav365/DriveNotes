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
export declare class FirebaseStorageService {
    private storage;
    private bucket;
    constructor(config: FirebaseConfig);
    uploadFile(file: Buffer, fileName: string, contentType: string, userId: string, folder?: string): Promise<FileUploadResult>;
    deleteFile(filePath: string): Promise<boolean>;
    getFileMetadata(filePath: string): Promise<any>;
    listUserFiles(userId: string, folder?: string): Promise<any>;
    getSignedUrl(filePath: string, expiresIn?: number): Promise<string>;
    copyFile(sourcePath: string, destinationPath: string): Promise<boolean>;
    getUserStorageUsage(userId: string): Promise<number>;
    private sanitizeFileName;
    generateThumbnail(file: Buffer, fileName: string, userId: string): Promise<string | null>;
}
export declare const defaultFirebaseService: FirebaseStorageService;
export {};
//# sourceMappingURL=firebaseService.d.ts.map