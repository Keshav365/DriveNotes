"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const errorHandler_1 = require("../middleware/errorHandler");
const encryption_1 = require("../utils/encryption");
const aiProviderService_1 = require("../services/aiProviderService");
const logger_1 = require("../utils/logger");
const User_1 = __importDefault(require("../models/User"));
const router = express_1.default.Router();
router.get('/profile', (0, errorHandler_1.catchAsync)(async (req, res) => {
    const user = req.user;
    console.log('🔍 Profile endpoint - User ID:', user._id);
    console.log('🔍 Profile endpoint - User storage field:', user.storage);
    console.log('🔍 Profile endpoint - User object keys:', Object.keys(user.toObject ? user.toObject() : user));
    const freshUser = await User_1.default.findById(user._id);
    console.log('🔍 Fresh user from DB - storage field:', freshUser?.storage);
    const responseData = {
        id: user._id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        authMethods: user.authMethods,
        verification: user.verification,
        preferences: user.preferences,
        subscription: user.subscription,
        storage: freshUser?.storage || user.storage,
        aiSettings: {
            provider: user.aiSettings.provider,
            preferences: user.aiSettings.preferences,
            hasApiKeys: {
                openai: !!user.aiSettings.apiKeys.openai?.key,
                gemini: !!user.aiSettings.apiKeys.gemini?.key,
                claude: !!user.aiSettings.apiKeys.claude?.key,
            },
        },
        lastActiveAt: user.lastActiveAt,
        createdAt: user.createdAt,
    };
    console.log('🔍 Response storage field:', responseData.storage);
    res.status(200).json({
        success: true,
        data: responseData,
    });
}));
router.put('/profile', [
    (0, express_validator_1.body)('firstName').optional().trim().isLength({ min: 1 }).withMessage('First name cannot be empty'),
    (0, express_validator_1.body)('lastName').optional().trim().isLength({ min: 1 }).withMessage('Last name cannot be empty'),
    (0, express_validator_1.body)('avatar').optional().isURL().withMessage('Avatar must be a valid URL'),
], (0, errorHandler_1.catchAsync)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    const user = req.user;
    const { firstName, lastName, avatar } = req.body;
    if (firstName !== undefined)
        user.firstName = firstName;
    if (lastName !== undefined)
        user.lastName = lastName;
    if (avatar !== undefined)
        user.avatar = avatar;
    await user.save();
    logger_1.logger.info(`User profile updated: ${user.email || user.phoneNumber}`);
    res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
        },
    });
}));
router.put('/preferences', [
    (0, express_validator_1.body)('theme').optional().isIn(['light', 'dark', 'system']).withMessage('Invalid theme'),
    (0, express_validator_1.body)('language').optional().isLength({ min: 2, max: 5 }).withMessage('Invalid language code'),
    (0, express_validator_1.body)('timezone').optional().isLength({ min: 1 }).withMessage('Timezone is required'),
    (0, express_validator_1.body)('notifications.email').optional().isBoolean(),
    (0, express_validator_1.body)('notifications.push').optional().isBoolean(),
    (0, express_validator_1.body)('notifications.reminders').optional().isBoolean(),
    (0, express_validator_1.body)('notifications.sms').optional().isBoolean(),
], (0, errorHandler_1.catchAsync)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    const user = req.user;
    const { theme, language, timezone, notifications } = req.body;
    if (theme !== undefined)
        user.preferences.theme = theme;
    if (language !== undefined)
        user.preferences.language = language;
    if (timezone !== undefined)
        user.preferences.timezone = timezone;
    if (notifications) {
        if (notifications.email !== undefined)
            user.preferences.notifications.email = notifications.email;
        if (notifications.push !== undefined)
            user.preferences.notifications.push = notifications.push;
        if (notifications.reminders !== undefined)
            user.preferences.notifications.reminders = notifications.reminders;
        if (notifications.sms !== undefined)
            user.preferences.notifications.sms = notifications.sms;
    }
    await user.save();
    logger_1.logger.info(`User preferences updated: ${user.email || user.phoneNumber}`);
    res.status(200).json({
        success: true,
        message: 'Preferences updated successfully',
        data: user.preferences,
    });
}));
router.get('/ai-providers', (0, errorHandler_1.catchAsync)(async (req, res) => {
    const providers = aiProviderService_1.AIProviderFactory.getAvailableProviders();
    res.status(200).json({
        success: true,
        data: providers,
    });
}));
router.put('/ai-settings', [
    (0, express_validator_1.body)('provider').optional().isIn(['openai', 'gemini', 'claude']).withMessage('Invalid AI provider'),
    (0, express_validator_1.body)('preferences.defaultModel').optional().isString().withMessage('Default model must be a string'),
    (0, express_validator_1.body)('preferences.maxTokens').optional().isInt({ min: 1, max: 32000 }).withMessage('Max tokens must be between 1 and 32000'),
    (0, express_validator_1.body)('preferences.temperature').optional().isFloat({ min: 0, max: 2 }).withMessage('Temperature must be between 0 and 2'),
], (0, errorHandler_1.catchAsync)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    const user = req.user;
    const { provider, preferences } = req.body;
    if (provider !== undefined)
        user.aiSettings.provider = provider;
    if (preferences) {
        if (preferences.defaultModel !== undefined)
            user.aiSettings.preferences.defaultModel = preferences.defaultModel;
        if (preferences.maxTokens !== undefined)
            user.aiSettings.preferences.maxTokens = preferences.maxTokens;
        if (preferences.temperature !== undefined)
            user.aiSettings.preferences.temperature = preferences.temperature;
    }
    await user.save();
    logger_1.logger.info(`AI settings updated for user: ${user.email || user.phoneNumber}`);
    res.status(200).json({
        success: true,
        message: 'AI settings updated successfully',
        data: {
            provider: user.aiSettings.provider,
            preferences: user.aiSettings.preferences,
        },
    });
}));
router.post('/ai-settings/api-key', [
    (0, express_validator_1.body)('provider').isIn(['openai', 'gemini', 'claude']).withMessage('Invalid AI provider'),
    (0, express_validator_1.body)('apiKey').isLength({ min: 1 }).withMessage('API key is required'),
], (0, errorHandler_1.catchAsync)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    const user = req.user;
    const { provider, apiKey } = req.body;
    try {
        const testConfig = {
            provider,
            apiKey,
            model: 'gpt-3.5-turbo',
        };
        const aiProvider = aiProviderService_1.AIProviderFactory.createProvider(testConfig);
        await aiProvider.generateResponse('Hello, this is a test message. Please respond with "Test successful".');
        const encryptedKey = encryption_1.EncryptionService.encrypt(apiKey);
        if (!user.aiSettings.apiKeys) {
            user.aiSettings.apiKeys = {};
        }
        user.aiSettings.apiKeys[provider] = {
            key: encryptedKey,
            encrypted: true,
        };
        if (!user.aiSettings.provider || user.aiSettings.provider === 'openai') {
            user.aiSettings.provider = provider;
        }
        await user.save();
        logger_1.logger.info(`AI API key set for provider ${provider}: ${user.email || user.phoneNumber}`);
        res.status(200).json({
            success: true,
            message: `${provider.toUpperCase()} API key saved successfully`,
            data: {
                provider,
                hasApiKey: true,
            },
        });
    }
    catch (error) {
        logger_1.logger.error(`Failed to validate API key for ${provider}:`, error);
        res.status(400).json({
            success: false,
            message: 'Invalid API key or provider service unavailable',
        });
    }
}));
router.delete('/ai-settings/api-key/:provider', (0, errorHandler_1.catchAsync)(async (req, res) => {
    const user = req.user;
    const { provider } = req.params;
    if (!['openai', 'gemini', 'claude'].includes(provider)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid AI provider',
        });
    }
    if (user.aiSettings.apiKeys && user.aiSettings.apiKeys[provider]) {
        delete user.aiSettings.apiKeys[provider];
        await user.save();
        logger_1.logger.info(`AI API key removed for provider ${provider}: ${user.email || user.phoneNumber}`);
    }
    res.status(200).json({
        success: true,
        message: `${provider.toUpperCase()} API key removed successfully`,
    });
}));
router.get('/storage', (0, errorHandler_1.catchAsync)(async (req, res) => {
    const user = req.user;
    res.status(200).json({
        success: true,
        data: {
            used: user.storage.used,
            limit: user.storage.limit,
            usagePercentage: user.getStorageUsagePercentage(),
            canUpload: (fileSize) => user.canUpload(fileSize),
        },
    });
}));
router.put('/change-password', [
    (0, express_validator_1.body)('currentPassword').notEmpty().withMessage('Current password is required'),
    (0, express_validator_1.body)('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
], (0, errorHandler_1.catchAsync)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    const user = req.user;
    const { currentPassword, newPassword } = req.body;
    const userWithPassword = await user.constructor.findById(user._id).select('+password');
    if (!userWithPassword || !userWithPassword.password) {
        return res.status(400).json({
            success: false,
            message: 'User has no password set',
        });
    }
    const isValidPassword = await userWithPassword.comparePassword(currentPassword);
    if (!isValidPassword) {
        return res.status(400).json({
            success: false,
            message: 'Current password is incorrect',
        });
    }
    userWithPassword.password = newPassword;
    await userWithPassword.save();
    logger_1.logger.info(`Password changed for user: ${user.email || user.phoneNumber}`);
    res.status(200).json({
        success: true,
        message: 'Password changed successfully',
    });
}));
exports.default = router;
//# sourceMappingURL=user.js.map