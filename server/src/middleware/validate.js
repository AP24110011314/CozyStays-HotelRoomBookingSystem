import { ZodError } from 'zod';
import { AppError, ERROR_CODES } from '../utils/errors.js';

export function validate(schema) {
  return (req, res, next) => {
    try {
      const result = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      if (!result.success) {
        const details = result.error.flatten();
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Validation failed', details);
      }
      req.validated = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.validatedBody = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.flatten();
        return next(new AppError(ERROR_CODES.VALIDATION_ERROR, 'Validation failed', details));
      }
      next(error);
    }
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.validatedQuery = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.flatten();
        return next(new AppError(ERROR_CODES.VALIDATION_ERROR, 'Validation failed', details));
      }
      next(error);
    }
  };
}

export function validateParams(schema) {
  return (req, res, next) => {
    try {
      req.validatedParams = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.flatten();
        return next(new AppError(ERROR_CODES.VALIDATION_ERROR, 'Validation failed', details));
      }
      next(error);
    }
  };
}