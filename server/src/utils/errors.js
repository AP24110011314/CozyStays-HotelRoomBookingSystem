export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  ROOM_UNAVAILABLE: 'ROOM_UNAVAILABLE',
  CANCEL_WINDOW_EXPIRED: 'CANCEL_WINDOW_EXPIRED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

export const HTTP_STATUS = {
  [ERROR_CODES.VALIDATION_ERROR]: 400,
  [ERROR_CODES.UNAUTHORIZED]: 401,
  [ERROR_CODES.FORBIDDEN]: 403,
  [ERROR_CODES.NOT_FOUND]: 404,
  [ERROR_CODES.CONFLICT]: 409,
  [ERROR_CODES.ROOM_UNAVAILABLE]: 409,
  [ERROR_CODES.CANCEL_WINDOW_EXPIRED]: 409,
  [ERROR_CODES.INTERNAL_ERROR]: 500,
};

export class AppError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.statusCode = HTTP_STATUS[code] || 500;
  }
}

export function isAppError(error) {
  return error instanceof AppError;
}