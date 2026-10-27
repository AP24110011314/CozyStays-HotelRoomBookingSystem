import { verifyToken } from '../utils/jwt.js';
import { AppError, ERROR_CODES } from '../utils/errors.js';
import { User } from '../models/index.js';

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      throw new AppError(ERROR_CODES.UNAUTHORIZED, 'User not found');
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    };
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new AppError(ERROR_CODES.UNAUTHORIZED, 'Invalid or expired token'));
    }
    next(error);
  }
}

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(ERROR_CODES.UNAUTHORIZED, 'Not authenticated'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(ERROR_CODES.FORBIDDEN, 'Insufficient permissions'));
    }
    next();
  };
}

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id).select('-passwordHash');
      if (user) {
        req.user = {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      }
    }
    next();
  } catch {
    next();
  }
};