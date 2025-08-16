interface SMSConfig {
    accountSid: string;
    authToken: string;
    fromNumber: string;
}
export declare class SMSService {
    private client;
    private fromNumber;
    constructor(config: SMSConfig);
    sendOTP(phoneNumber: string, otp: string): Promise<boolean>;
    sendMessage(phoneNumber: string, message: string): Promise<boolean>;
    static generateOTP(): string;
    static validatePhoneNumber(phoneNumber: string): boolean;
}
export declare const defaultSMSService: SMSService;
export {};
//# sourceMappingURL=smsService.d.ts.map