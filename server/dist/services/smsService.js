"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultSMSService = exports.SMSService = void 0;
const twilio_1 = __importDefault(require("twilio"));
const logger_1 = require("../utils/logger");
class SMSService {
    constructor(config) {
        this.client = (0, twilio_1.default)(config.accountSid, config.authToken);
        this.fromNumber = config.fromNumber;
    }
    async sendOTP(phoneNumber, otp) {
        try {
            const message = `Your DriveNotes verification code is: ${otp}. This code will expire in 10 minutes.`;
            const result = await this.client.messages.create({
                body: message,
                from: this.fromNumber,
                to: phoneNumber,
            });
            logger_1.logger.info(`SMS sent successfully to ${phoneNumber}, SID: ${result.sid}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to send SMS:', error);
            return false;
        }
    }
    async sendMessage(phoneNumber, message) {
        try {
            const result = await this.client.messages.create({
                body: message,
                from: this.fromNumber,
                to: phoneNumber,
            });
            logger_1.logger.info(`SMS sent successfully to ${phoneNumber}, SID: ${result.sid}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to send SMS:', error);
            return false;
        }
    }
    static generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    static validatePhoneNumber(phoneNumber) {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        return phoneRegex.test(phoneNumber);
    }
}
exports.SMSService = SMSService;
exports.defaultSMSService = new SMSService({
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_PHONE_NUMBER || '',
});
//# sourceMappingURL=smsService.js.map