import express from 'express';
import { body, validationResult } from 'express-validator';
import { catchAsync } from '../middleware/errorHandler';
import { EncryptionService } from '../utils/encryption';
import { AIProviderFactory } from '../services/aiProviderService';
import { logger } from '../utils/logger';
import User from '../models/User';

const router = express.Router();

// Get user profile
router.get('/profile', catchAsync(async (req, res) => {
  const user = req.user!;
  
  // Debug logging
  console.log('🔍 Profile endpoint - User ID:', user._id);
  console.log('🔍 Profile endpoint - User storage field:', user.storage);
  console.log('🔍 Profile endpoint - User object keys:', Object.keys(user.toObject ? user.toObject() : user));
  
  // Refresh user from database to ensure we have latest data
  const freshUser = await User.findById(user._id);
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
    storage: freshUser?.storage || user.storage, // Use fresh data if available
    aiSettings: {
      provider: user.aiSettings.provider,
      preferences: user.aiSettings.preferences,
      // Don't return actual API keys
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

// Update user profile
router.put('/profile', [
  body('firstName').optional().trim().isLength({ min: 1 }).withMessage('First name cannot be empty'),
  body('lastName').optional().trim().isLength({ min: 1 }).withMessage('Last name cannot be empty'),
  body('avatar').optional().isURL().withMessage('Avatar must be a valid URL'),
], catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const user = req.user!;
  const { firstName, lastName, avatar } = req.body;

  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (avatar !== undefined) user.avatar = avatar;

  await user.save();

  logger.info(`User profile updated: ${user.email || user.phoneNumber}`);

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

// Update user preferences
router.put('/preferences', [
  body('theme').optional().isIn(['light', 'dark', 'system']).withMessage('Invalid theme'),
  body('language').optional().isLength({ min: 2, max: 5 }).withMessage('Invalid language code'),
  body('timezone').optional().isLength({ min: 1 }).withMessage('Timezone is required'),
  body('notifications.email').optional().isBoolean(),
  body('notifications.push').optional().isBoolean(),
  body('notifications.reminders').optional().isBoolean(),
  body('notifications.sms').optional().isBoolean(),
], catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const user = req.user!;
  const { theme, language, timezone, notifications } = req.body;

  if (theme !== undefined) user.preferences.theme = theme;
  if (language !== undefined) user.preferences.language = language;
  if (timezone !== undefined) user.preferences.timezone = timezone;
  
  if (notifications) {
    if (notifications.email !== undefined) user.preferences.notifications.email = notifications.email;
    if (notifications.push !== undefined) user.preferences.notifications.push = notifications.push;
    if (notifications.reminders !== undefined) user.preferences.notifications.reminders = notifications.reminders;
    if (notifications.sms !== undefined) user.preferences.notifications.sms = notifications.sms;
  }

  await user.save();

  logger.info(`User preferences updated: ${user.email || user.phoneNumber}`);

  res.status(200).json({
    success: true,
    message: 'Preferences updated successfully',
    data: user.preferences,
  });
}));

// Get available AI providers
router.get('/ai-providers', catchAsync(async (req, res) => {
  const providers = AIProviderFactory.getAvailableProviders();
  
  res.status(200).json({
    success: true,
    data: providers,
  });
}));

// Update AI provider settings
router.put('/ai-settings', [
  body('provider').optional().isIn(['openai', 'gemini', 'claude']).withMessage('Invalid AI provider'),
  body('preferences.defaultModel').optional().isString().withMessage('Default model must be a string'),
  body('preferences.maxTokens').optional().isInt({ min: 1, max: 32000 }).withMessage('Max tokens must be between 1 and 32000'),
  body('preferences.temperature').optional().isFloat({ min: 0, max: 2 }).withMessage('Temperature must be between 0 and 2'),
], catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const user = req.user!;
  const { provider, preferences } = req.body;

  if (provider !== undefined) user.aiSettings.provider = provider;
  
  if (preferences) {
    if (preferences.defaultModel !== undefined) user.aiSettings.preferences.defaultModel = preferences.defaultModel;
    if (preferences.maxTokens !== undefined) user.aiSettings.preferences.maxTokens = preferences.maxTokens;
    if (preferences.temperature !== undefined) user.aiSettings.preferences.temperature = preferences.temperature;
  }

  await user.save();

  logger.info(`AI settings updated for user: ${user.email || user.phoneNumber}`);

  res.status(200).json({
    success: true,
    message: 'AI settings updated successfully',
    data: {
      provider: user.aiSettings.provider,
      preferences: user.aiSettings.preferences,
    },
  });
}));

// Set AI provider API key
router.post('/ai-settings/api-key', [
  body('provider').isIn(['openai', 'gemini', 'claude']).withMessage('Invalid AI provider'),
  body('apiKey').isLength({ min: 1 }).withMessage('API key is required'),
], catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const user = req.user!;
  const { provider, apiKey } = req.body;

  try {
    // Test the API key by making a simple request
    const testConfig = {
      provider,
      apiKey,
      model: 'gpt-3.5-turbo', // default for testing
    };
    
    const aiProvider = AIProviderFactory.createProvider(testConfig);
    await aiProvider.generateResponse('Hello, this is a test message. Please respond with "Test successful".');
    
    // If test passes, encrypt and save the API key
    const encryptedKey = EncryptionService.encrypt(apiKey);
    
    if (!user.aiSettings.apiKeys) {
      user.aiSettings.apiKeys = {};
    }
    
    user.aiSettings.apiKeys[provider] = {
      key: encryptedKey,
      encrypted: true,
    };
    
    // Set this as the default provider if it's the first one
    if (!user.aiSettings.provider || user.aiSettings.provider === 'openai') {
      user.aiSettings.provider = provider;
    }
    
    await user.save();

    logger.info(`AI API key set for provider ${provider}: ${user.email || user.phoneNumber}`);

    res.status(200).json({
      success: true,
      message: `${provider.toUpperCase()} API key saved successfully`,
      data: {
        provider,
        hasApiKey: true,
      },
    });
  } catch (error) {
    logger.error(`Failed to validate API key for ${provider}:`, error);
    res.status(400).json({
      success: false,
      message: 'Invalid API key or provider service unavailable',
    });
  }
}));

// Remove AI provider API key
router.delete('/ai-settings/api-key/:provider', catchAsync(async (req, res) => {
  const user = req.user!;
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

    logger.info(`AI API key removed for provider ${provider}: ${user.email || user.phoneNumber}`);
  }

  res.status(200).json({
    success: true,
    message: `${provider.toUpperCase()} API key removed successfully`,
  });
}));

// Get storage usage
router.get('/storage', catchAsync(async (req, res) => {
  const user = req.user!;
  
  res.status(200).json({
    success: true,
    data: {
      used: user.storage.used,
      limit: user.storage.limit,
      usagePercentage: user.getStorageUsagePercentage(),
      canUpload: (fileSize: number) => user.canUpload(fileSize),
    },
  });
}));

// Change password
router.put('/change-password', [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
], catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const user = req.user!;
  const { currentPassword, newPassword } = req.body;

  // Get user with password field
  const userWithPassword = await user.constructor.findById(user._id).select('+password');
  if (!userWithPassword || !userWithPassword.password) {
    return res.status(400).json({
      success: false,
      message: 'User has no password set',
    });
  }

  // Verify current password
  const isValidPassword = await userWithPassword.comparePassword(currentPassword);
  if (!isValidPassword) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect',
    });
  }

  // Update password
  userWithPassword.password = newPassword;
  await userWithPassword.save();

  logger.info(`Password changed for user: ${user.email || user.phoneNumber}`);

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
  });
}));

export default router;
