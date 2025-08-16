"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const User_1 = __importDefault(require("../models/User"));
const smsService_1 = require("../services/smsService");
const logger_1 = require("../utils/logger");
const crypto_1 = __importDefault(require("crypto"));
const router = express_1.default.Router();
const generateTokens = (userId, email) => {
    const payload = { userId, email };
    const accessToken = jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '15m' });
    const refreshToken = jsonwebtoken_1.default.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' });
    return { accessToken, refreshToken };
};
router.post('/register/email', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    (0, express_validator_1.body)('firstName').notEmpty().trim().withMessage('First name is required'),
    (0, express_validator_1.body)('lastName').notEmpty().trim().withMessage('Last name is required'),
], (0, errorHandler_1.catchAsync)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    const { email, password, firstName, lastName } = req.body;
    const existingUser = await User_1.default.findOne({ email });
    if (existingUser) {
        return res.status(400).json({
            success: false,
            message: 'User with this email already exists',
        });
    }
    const verificationToken = crypto_1.default.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const user = new User_1.default({
        email,
        password,
        firstName,
        lastName,
        authMethods: {
            email: true,
            phone: false,
            google: false,
        },
        verification: {
            email: {
                isVerified: false,
                token: verificationToken,
                tokenExpires,
            },
            phone: {
                isVerified: false,
            },
        },
    });
    await user.save();
    const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.email);
    user.refreshToken = refreshToken;
    await user.save();
    logger_1.logger.info(`New user registered with email: ${email}`);
    res.status(201).json({
        success: true,
        message: 'User registered successfully. Please verify your email.',
        user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            authMethods: user.authMethods,
            verification: user.verification,
        },
        accessToken,
        refreshToken,
    });
}));
router.post('/register/phone', [
    (0, express_validator_1.body)('phoneNumber').isMobilePhone().withMessage('Valid phone number is required'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    (0, express_validator_1.body)('firstName').notEmpty().trim().withMessage('First name is required'),
    (0, express_validator_1.body)('lastName').notEmpty().trim().withMessage('Last name is required'),
], (0, errorHandler_1.catchAsync)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    const { phoneNumber, password, firstName, lastName } = req.body;
    const existingUser = await User_1.default.findOne({ phoneNumber });
    if (existingUser) {
        return res.status(400).json({
            success: false,
            message: 'User with this phone number already exists',
        });
    }
    const otp = smsService_1.SMSService.generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    const user = new User_1.default({
        phoneNumber,
        password,
        firstName,
        lastName,
        authMethods: {
            email: false,
            phone: true,
            google: false,
        },
        verification: {
            email: {
                isVerified: false,
            },
            phone: {
                isVerified: false,
                otp,
                otpExpires,
            },
        },
    });
    await user.save();
    const smsSent = await smsService_1.defaultSMSService.sendOTP(phoneNumber, otp);
    if (!smsSent) {
        logger_1.logger.error(`Failed to send OTP to ${phoneNumber}`);
    }
    logger_1.logger.info(`New user registered with phone: ${phoneNumber}`);
    res.status(201).json({
        success: true,
        message: 'User registered successfully. Please verify your phone number with the OTP sent.',
        user: {
            id: user._id,
            phoneNumber: user.phoneNumber,
            firstName: user.firstName,
            lastName: user.lastName,
            authMethods: user.authMethods,
            verification: {
                phone: {
                    isVerified: user.verification.phone.isVerified,
                },
            },
        },
        requiresVerification: true,
    });
}));
router.post('/login/email', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password').exists().withMessage('Password is required'),
], (0, errorHandler_1.catchAsync)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    const { email, password } = req.body;
    const user = await User_1.default.findOne({ email }).select('+password');
    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Invalid email or password',
        });
    }
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
        return res.status(401).json({
            success: false,
            message: 'Invalid email or password',
        });
    }
    const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.email);
    user.refreshToken = refreshToken;
    user.lastActiveAt = new Date();
    await user.save();
    logger_1.logger.info(`User logged in with email: ${email}`);
    res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            authMethods: user.authMethods,
            verification: user.verification,
        },
        accessToken,
        refreshToken,
    });
}));
router.post('/login/phone', [
    (0, express_validator_1.body)('phoneNumber').isMobilePhone().withMessage('Valid phone number is required'),
    (0, express_validator_1.body)('password').exists().withMessage('Password is required'),
], (0, errorHandler_1.catchAsync)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    const { phoneNumber, password } = req.body;
    const user = await User_1.default.findOne({ phoneNumber }).select('+password');
    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Invalid phone number or password',
        });
    }
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
        return res.status(401).json({
            success: false,
            message: 'Invalid phone number or password',
        });
    }
    const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.phoneNumber);
    user.refreshToken = refreshToken;
    user.lastActiveAt = new Date();
    await user.save();
    logger_1.logger.info(`User logged in with phone: ${phoneNumber}`);
    res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
            id: user._id,
            phoneNumber: user.phoneNumber,
            firstName: user.firstName,
            lastName: user.lastName,
            authMethods: user.authMethods,
            verification: user.verification,
        },
        accessToken,
        refreshToken,
    });
}));
router.post('/verify/email', [
    (0, express_validator_1.body)('token').notEmpty().withMessage('Verification token is required'),
], (0, errorHandler_1.catchAsync)(async (req, res) => {
    const { token } = req.body;
    const user = await User_1.default.findOne({
        'verification.email.token': token,
        'verification.email.tokenExpires': { $gt: new Date() },
    });
    if (!user) {
        return res.status(400).json({
            success: false,
            message: 'Invalid or expired verification token',
        });
    }
    user.verification.email.isVerified = true;
    user.verification.email.token = undefined;
    user.verification.email.tokenExpires = undefined;
    await user.save();
    logger_1.logger.info(`Email verified for user: ${user.email}`);
    res.status(200).json({
        success: true,
        message: 'Email verified successfully',
    });
}));
router.post('/verify/phone', [
    (0, express_validator_1.body)('phoneNumber').isMobilePhone().withMessage('Valid phone number is required'),
    (0, express_validator_1.body)('otp').isLength({ min: 6, max: 6 }).withMessage('Valid OTP is required'),
], (0, errorHandler_1.catchAsync)(async (req, res) => {
    const { phoneNumber, otp } = req.body;
    const user = await User_1.default.findOne({
        phoneNumber,
        'verification.phone.otp': otp,
        'verification.phone.otpExpires': { $gt: new Date() },
    });
    if (!user) {
        return res.status(400).json({
            success: false,
            message: 'Invalid or expired OTP',
        });
    }
    user.verification.phone.isVerified = true;
    user.verification.phone.otp = undefined;
    user.verification.phone.otpExpires = undefined;
    await user.save();
    const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.phoneNumber);
    user.refreshToken = refreshToken;
    await user.save();
    logger_1.logger.info(`Phone verified for user: ${phoneNumber}`);
    res.status(200).json({
        success: true,
        message: 'Phone verified successfully',
        user: {
            id: user._id,
            phoneNumber: user.phoneNumber,
            firstName: user.firstName,
            lastName: user.lastName,
            authMethods: user.authMethods,
            verification: user.verification,
        },
        accessToken,
        refreshToken,
    });
}));
router.post('/resend/otp', [
    (0, express_validator_1.body)('phoneNumber').isMobilePhone().withMessage('Valid phone number is required'),
], (0, errorHandler_1.catchAsync)(async (req, res) => {
    const { phoneNumber } = req.body;
    const user = await User_1.default.findOne({ phoneNumber });
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
        });
    }
    if (user.verification.phone.isVerified) {
        return res.status(400).json({
            success: false,
            message: 'Phone number is already verified',
        });
    }
    const otp = smsService_1.SMSService.generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.verification.phone.otp = otp;
    user.verification.phone.otpExpires = otpExpires;
    await user.save();
    const smsSent = await smsService_1.defaultSMSService.sendOTP(phoneNumber, otp);
    if (!smsSent) {
        return res.status(500).json({
            success: false,
            message: 'Failed to send OTP',
        });
    }
    res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
    });
}));
router.post('/refresh', [
    (0, express_validator_1.body)('refreshToken').notEmpty().withMessage('Refresh token is required'),
], (0, errorHandler_1.catchAsync)(async (req, res) => {
    const { refreshToken } = req.body;
    try {
        const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await User_1.default.findById(decoded.userId).select('+refreshToken');
        if (!user || user.refreshToken !== refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token',
            });
        }
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id.toString(), user.email || user.phoneNumber);
        user.refreshToken = newRefreshToken;
        user.lastActiveAt = new Date();
        await user.save();
        res.status(200).json({
            success: true,
            accessToken,
            refreshToken: newRefreshToken,
        });
    }
    catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid refresh token',
        });
    }
}));
router.post('/logout', auth_1.authenticateToken, (0, errorHandler_1.catchAsync)(async (req, res) => {
    const user = req.user;
    user.refreshToken = undefined;
    await user.save();
    logger_1.logger.info(`User logged out: ${user.email || user.phoneNumber}`);
    res.status(200).json({
        success: true,
        message: 'Logout successful',
    });
}));
router.get('/google', (req, res) => {
    res.status(501).json({
        success: false,
        message: 'Google OAuth - Coming soon!',
    });
});
router.get('/google/callback', (req, res) => {
    res.status(501).json({
        success: false,
        message: 'Google OAuth callback - Coming soon!',
    });
});
exports.default = router;
//# sourceMappingURL=auth.js.map