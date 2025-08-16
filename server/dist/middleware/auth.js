"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSubscription = exports.requireEmailVerification = exports.optionalAuth = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const logger_1 = require("../utils/logger");
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required',
            });
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            logger_1.logger.error('JWT_SECRET not configured');
            return res.status(500).json({
                success: false,
                message: 'Server configuration error',
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        const user = await User_1.default.findById(decoded.userId).select('-password -refreshToken');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found',
            });
        }
        user.lastActiveAt = new Date();
        await user.save();
        req.user = user;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token',
            });
        }
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return res.status(401).json({
                success: false,
                message: 'Token expired',
            });
        }
        logger_1.logger.error('Authentication error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication failed',
        });
    }
};
exports.authenticateToken = authenticateToken;
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return next();
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return next();
        }
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        const user = await User_1.default.findById(decoded.userId).select('-password -refreshToken');
        if (user) {
            user.lastActiveAt = new Date();
            await user.save();
            req.user = user;
        }
        next();
    }
    catch (error) {
        next();
    }
};
exports.optionalAuth = optionalAuth;
const requireEmailVerification = (req, res, next) => {
    if (!req.user?.isEmailVerified) {
        return res.status(403).json({
            success: false,
            message: 'Email verification required',
            code: 'EMAIL_NOT_VERIFIED',
        });
    }
    next();
};
exports.requireEmailVerification = requireEmailVerification;
const requireSubscription = (plans) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }
        if (!plans.includes(req.user.subscription.plan)) {
            return res.status(403).json({
                success: false,
                message: 'Subscription upgrade required',
                required: plans,
                current: req.user.subscription.plan,
            });
        }
        next();
    };
};
exports.requireSubscription = requireSubscription;
//# sourceMappingURL=auth.js.map