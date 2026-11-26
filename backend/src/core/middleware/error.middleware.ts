import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '@core/errors/app-error';
import { logger } from '@core/utils/logger';
import { RequestContextManager } from '@core/context/request-context';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const context = RequestContextManager.getContext();

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request payload validation failed.',
        details: err.flatten().fieldErrors,
        correlationId: context?.correlationId,
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.errorCode,
        message: err.message,
        details: err.details || null,
        correlationId: context?.correlationId,
      },
    });
    return;
  }

  // Handle SyntaxError for malformed JSON bodies
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MALFORMED_JSON',
        message: 'Malformed JSON payload in request body.',
        details: null,
        correlationId: context?.correlationId,
      },
    });
    return;
  }

  // Unhandled / Internal Server Error
  logger.error('Unhandled internal server error', {
    error: err.message,
    stack: err.stack,
    correlationId: context?.correlationId,
    path: req.originalUrl,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred.',
      details: null,
      correlationId: context?.correlationId,
    },
  });
};
