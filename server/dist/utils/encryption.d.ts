export declare class EncryptionService {
    private static secretKey;
    static encrypt(text: string): string;
    static decrypt(encryptedText: string): string;
    static hash(text: string): string;
    static generateKey(): string;
    static validateKey(key: string): boolean;
}
//# sourceMappingURL=encryption.d.ts.map