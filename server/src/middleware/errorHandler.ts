import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string | number;
  path?: string;
  value?: string;
  errors?: { [key: string]: { message: string } };
}

// Handle MongoDB cast errors
const handleCastErrorDB = (err: AppError) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return {
    statusCode: 400,
    message,
    isOperational: true,
  };
};

// Handle MongoDB duplicate key errors
const handleDuplicateFieldsDB = (err: AppError & { keyValue?: Record<string, unknown> }) => {
  const value = err.keyValue ? Object.values(err.keyValue)[0] : 'unknown';
  const field = err.keyValue ? Object.keys(err.keyValue)[0] : 'field';
  const message = `Duplicate field value: ${field} = "${value}". Please use another value.`;
  
  return {
    statusCode: 400,
    message,
    isOperational: true,
  };
};

// Handle MongoDB validation errors
const handleValidationErrorDB = (err: AppError) => {
  const errors = err.errors ? Object.values(err.errors).map(el => el.message) : [];
  const message = `Invalid input data. ${errors.join('. ')}`;
  
  return {
    statusCode: 400,
    message,
    isOperational: true,
  };
};

// Handle JWT errors
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

// Send error in development
const sendErrorDev = (err: AppError, res: Response) => {
  res.status(err.statusCode || 500).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

// Send error in production
const sendErrorProd = (err: AppError, res: Response) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR:', err);
    
    res.status(500).json({
      success: false,
      message: 'Something went wrong!',
    });
  }
};

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  err.statusCode = err.statusCode || 500;
  
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err, message: err.message };
    
    // Handle specific error types
    if (err.name === 'CastError') error = handleCastErrorDB(error);
    if (err.code === 11000) error = handleDuplicateFieldsDB(error as AppError & { keyValue?: Record<string, unknown> });
    if (err.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();
    
    sendErrorProd(error, res);
  }
};

// Catch async errors
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

// Create operational error
export const createError = (message: string, statusCode: number = 500) => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};
