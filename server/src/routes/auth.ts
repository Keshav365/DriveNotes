import express from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { catchAsync, createError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import User from '../models/User';
import { defaultSMSService, SMSService } from '../services/smsService';
import { EncryptionService } from '../utils/encryption';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const router = express.Router();

// Utility function to generate JWT tokens
const generateTokens = (userId: string, email?: string) => {
  const payload = { userId, email };
  
  const accessToken = jwt.sign(
    payload,
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );
  
  const refreshToken = jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
  
  return { accessToken, refreshToken };
};

// EMAIL REGISTRATION
router.post('/register/email', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().trim().withMessage('First name is required'),
  body('lastName').notEmpty().trim().withMessage('Last name is required'),
], catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { email, password, firstName, lastName } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User with this email already exists',
    });
  }

  // Create verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Create new user
  const user = new User({
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

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.email);

  // Save refresh token
  user.refreshToken = refreshToken;
  await user.save();

  logger.info(`New user registered with email: ${email}`);

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

// PHONE REGISTRATION
router.post('/register/phone', [
  body('phoneNumber').isMobilePhone().withMessage('Valid phone number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().trim().withMessage('First name is required'),
  body('lastName').notEmpty().trim().withMessage('Last name is required'),
], catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { phoneNumber, password, firstName, lastName } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ phoneNumber });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User with this phone number already exists',
    });
  }

  // Generate OTP
  const otp = SMSService.generateOTP();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Create new user
  const user = new User({
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

  // Send OTP via SMS
  const smsSent = await defaultSMSService.sendOTP(phoneNumber, otp);
  if (!smsSent) {
    logger.error(`Failed to send OTP to ${phoneNumber}`);
    // Don't fail registration, but log the error
  }

  logger.info(`New user registered with phone: ${phoneNumber}`);

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

// EMAIL LOGIN
router.post('/login/email', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').exists().withMessage('Password is required'),
], catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { email, password } = req.body;

  // Find user with password field
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password',
    });
  }

  // Check password
  const isValidPassword = await user.comparePassword(password);
  if (!isValidPassword) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password',
    });
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.email);

  // Save refresh token
  user.refreshToken = refreshToken;
  user.lastActiveAt = new Date();
  await user.save();

  logger.info(`User logged in with email: ${email}`);

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

// PHONE LOGIN
router.post('/login/phone', [
  body('phoneNumber').isMobilePhone().withMessage('Valid phone number is required'),
  body('password').exists().withMessage('Password is required'),
], catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { phoneNumber, password } = req.body;

  // Find user with password field
  const user = await User.findOne({ phoneNumber }).select('+password');
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid phone number or password',
    });
  }

  // Check password
  const isValidPassword = await user.comparePassword(password);
  if (!isValidPassword) {
    return res.status(401).json({
      success: false,
      message: 'Invalid phone number or password',
    });
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.phoneNumber);

  // Save refresh token
  user.refreshToken = refreshToken;
  user.lastActiveAt = new Date();
  await user.save();

  logger.info(`User logged in with phone: ${phoneNumber}`);

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

// VERIFY EMAIL
router.post('/verify/email', [
  body('token').notEmpty().withMessage('Verification token is required'),
], catchAsync(async (req, res) => {
  const { token } = req.body;

  const user = await User.findOne({
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

  logger.info(`Email verified for user: ${user.email}`);

  res.status(200).json({
    success: true,
    message: 'Email verified successfully',
  });
}));

// VERIFY PHONE
router.post('/verify/phone', [
  body('phoneNumber').isMobilePhone().withMessage('Valid phone number is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('Valid OTP is required'),
], catchAsync(async (req, res) => {
  const { phoneNumber, otp } = req.body;

  const user = await User.findOne({
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

  // Generate tokens after verification
  const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.phoneNumber);

  user.refreshToken = refreshToken;
  await user.save();

  logger.info(`Phone verified for user: ${phoneNumber}`);

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

// RESEND OTP
router.post('/resend/otp', [
  body('phoneNumber').isMobilePhone().withMessage('Valid phone number is required'),
], catchAsync(async (req, res) => {
  const { phoneNumber } = req.body;

  const user = await User.findOne({ phoneNumber });
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

  // Generate new OTP
  const otp = SMSService.generateOTP();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  user.verification.phone.otp = otp;
  user.verification.phone.otpExpires = otpExpires;
  await user.save();

  // Send OTP via SMS
  const smsSent = await defaultSMSService.sendOTP(phoneNumber, otp);
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

// REFRESH TOKEN
router.post('/refresh', [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
], catchAsync(async (req, res) => {
  const { refreshToken } = req.body;

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
    
    const user = await User.findById(decoded.userId).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      user._id.toString(), 
      user.email || user.phoneNumber
    );

    user.refreshToken = newRefreshToken;
    user.lastActiveAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
    });
  }
}));

// LOGOUT
router.post('/logout', authenticateToken, catchAsync(async (req, res) => {
  const user = req.user!;
  
  user.refreshToken = undefined;
  await user.save();

  logger.info(`User logged out: ${user.email || user.phoneNumber}`);

  res.status(200).json({
    success: true,
    message: 'Logout successful',
  });
}));

// Google OAuth endpoints (to be implemented)
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

export default router;
