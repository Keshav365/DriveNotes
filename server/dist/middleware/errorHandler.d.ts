import { Request, Response, NextFunction } from 'express';
interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
    code?: string | number;
    path?: string;
    value?: string;
    errors?: {
        [key: string]: {
            message: string;
        };
    };
}
export declare const errorHandler: (err: AppError, req: Request, res: Response, next: NextFunction) => void;
export declare const catchAsync: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
export declare const createError: (message: string, statusCode?: number) => AppError;
export {};
//# sourceMappingURL=errorHandler.d.ts.map