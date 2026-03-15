import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

export class ApiError extends Error {
  statusCode: number;
  code: string;
  constructor(statusCode: number, message: string, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'ApiError';
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message, 'NOT_FOUND');
  }

  static badRequest(message = 'Bad request') {
    return new ApiError(400, message, 'BAD_REQUEST');
  }

  static conflict(message = 'Conflict') {
    return new ApiError(409, message, 'CONFLICT');
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error(err.message, { stack: err.stack });

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: { message: err.message, code: err.code },
    });
    return;
  }

  // Mongoose CastError / ValidationError — avoid leaking raw error details
  if (err.name === 'CastError') {
    res.status(400).json({ error: { message: 'Invalid ID format', code: 'BAD_REQUEST' } });
    return;
  }
  if (err.name === 'ValidationError') {
    res.status(400).json({ error: { message: 'Validation failed', code: 'VALIDATION_ERROR' } });
    return;
  }

  const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: {
      message,
      code: 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
}
