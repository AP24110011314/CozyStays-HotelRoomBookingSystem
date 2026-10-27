import bcrypt from 'bcryptjs';

import { User } from '../models/index.js';
import { signToken } from '../utils/jwt.js';
import { AppError, ERROR_CODES } from '../utils/errors.js';

const BCRYPT_COST = 12;

export async function register(email, password, name) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new AppError(ERROR_CODES.CONFLICT, 'Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash,
    name,
    role: 'guest',
  });

  const token = signToken({ id: user._id.toString(), email: user.email, role: user.role });
  return { user: { id: user._id.toString(), email: user.email, name: user.name, role: user.role }, token };
}

export async function login(email, password) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Invalid credentials');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Invalid credentials');
  }

  const token = signToken({ id: user._id.toString(), email: user.email, role: user.role });
  return { user: { id: user._id.toString(), email: user.email, name: user.name, role: user.role }, token };
}

export async function me(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'User not found');
  }
  return { id: user._id.toString(), email: user.email, name: user.name, role: user.role };
}