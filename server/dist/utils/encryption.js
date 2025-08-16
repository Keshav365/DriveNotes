"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionService = void 0;
const crypto_js_1 = __importDefault(require("crypto-js"));
const logger_1 = require("./logger");
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-encryption-key-should-be-32-chars';
class EncryptionService {
    static encrypt(text) {
        try {
            const encrypted = crypto_js_1.default.AES.encrypt(text, this.secretKey).toString();
            return encrypted;
        }
        catch (error) {
            logger_1.logger.error('Encryption failed:', error);
            throw new Error('Encryption failed');
        }
    }
    static decrypt(encryptedText) {
        try {
            const bytes = crypto_js_1.default.AES.decrypt(encryptedText, this.secretKey);
            const decrypted = bytes.toString(crypto_js_1.default.enc.Utf8);
            if (!decrypted) {
                throw new Error('Decryption failed - invalid key or corrupted data');
            }
            return decrypted;
        }
        catch (error) {
            logger_1.logger.error('Decryption failed:', error);
            throw new Error('Decryption failed');
        }
    }
    static hash(text) {
        return crypto_js_1.default.SHA256(text).toString();
    }
    static generateKey() {
        return crypto_js_1.default.lib.WordArray.random(32).toString();
    }
    static validateKey(key) {
        return key.length >= 32;
    }
}
exports.EncryptionService = EncryptionService;
EncryptionService.secretKey = ENCRYPTION_KEY;
//# sourceMappingURL=encryption.js.map