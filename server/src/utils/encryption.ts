import CryptoJS from 'crypto-js';
import { logger } from './logger';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-encryption-key-should-be-32-chars';

export class EncryptionService {
  private static secretKey: string = ENCRYPTION_KEY;

  /**
   * Encrypt sensitive data like API keys
   */
  static encrypt(text: string): string {
    try {
      const encrypted = CryptoJS.AES.encrypt(text, this.secretKey).toString();
      return encrypted;
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedText: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedText, this.secretKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decrypted) {
        throw new Error('Decryption failed - invalid key or corrupted data');
      }
      
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Hash data using SHA256
   */
  static hash(text: string): string {
    return CryptoJS.SHA256(text).toString();
  }

  /**
   * Generate a random key for encryption
   */
  static generateKey(): string {
    return CryptoJS.lib.WordArray.random(32).toString();
  }

  /**
   * Validate encryption key strength
   */
  static validateKey(key: string): boolean {
    return key.length >= 32;
  }
}
