import { isAppError, AppError, ERROR_CODES } from '../utils/errors.js';
import env from '../config/env.js';

export function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  if (isAppError(err)) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation failed',
        details,
      },
    });
  }

  if (err.name === 'MongoServerError' && err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      error: {
        code: ERROR_CODES.CONFLICT,
        message: `${field} already exists`,
        details: { field },
      },
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Invalid ID format',
        details: { path: err.path },
      },
    });
  }

  const statusCode = 500;
  const message = env.nodeEnv === 'production' ? 'Internal server error' : err.message;

  res.status(statusCode).json({
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message,
      details: env.nodeEnv === 'production' ? null : err.stack,
    },
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}