"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createError = exports.catchAsync = exports.errorHandler = void 0;
const logger_1 = require("../utils/logger");
const handleCastErrorDB = (err) => {
    const message = `Invalid ${err.path}: ${err.value}`;
    return {
        statusCode: 400,
        message,
        isOperational: true,
    };
};
const handleDuplicateFieldsDB = (err) => {
    const value = err.keyValue ? Object.values(err.keyValue)[0] : 'unknown';
    const field = err.keyValue ? Object.keys(err.keyValue)[0] : 'field';
    const message = `Duplicate field value: ${field} = "${value}". Please use another value.`;
    return {
        statusCode: 400,
        message,
        isOperational: true,
    };
};
const handleValidationErrorDB = (err) => {
    const errors = err.errors ? Object.values(err.errors).map(el => el.message) : [];
    const message = `Invalid input data. ${errors.join('. ')}`;
    return {
        statusCode: 400,
        message,
        isOperational: true,
    };
};
const handleJWTError = () => {
    return {
        statusCode: 401,
        message: 'Invalid token. Please log in again!',
        isOperational: true,
    };
};
const handleJWTExpiredError = () => {
    return {
        statusCode: 401,
        message: 'Your token has expired! Please log in again.',
        isOperational: true,
    };
};
const sendErrorDev = (err, res) => {
    res.status(err.statusCode || 500).json({
        success: false,
        error: err,
        message: err.message,
        stack: err.stack,
    });
};
const sendErrorProd = (err, res) => {
    if (err.isOperational) {
        res.status(err.statusCode || 500).json({
            success: false,
            message: err.message,
        });
    }
    else {
        logger_1.logger.error('ERROR:', err);
        res.status(500).json({
            success: false,
            message: 'Something went wrong!',
        });
    }
};
const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    }
    else {
        let error = { ...err, message: err.message };
        if (err.name === 'CastError')
            error = handleCastErrorDB(error);
        if (err.code === 11000)
            error = handleDuplicateFieldsDB(error);
        if (err.name === 'ValidationError')
            error = handleValidationErrorDB(error);
        if (err.name === 'JsonWebTokenError')
            error = handleJWTError();
        if (err.name === 'TokenExpiredError')
            error = handleJWTExpiredError();
        sendErrorProd(error, res);
    }
};
exports.errorHandler = errorHandler;
const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};
exports.catchAsync = catchAsync;
const createError = (message, statusCode = 500) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = true;
    return error;
};
exports.createError = createError;
//# sourceMappingURL=errorHandler.js.map