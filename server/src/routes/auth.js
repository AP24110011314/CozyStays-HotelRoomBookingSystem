import express from 'express';
import { z } from 'zod';

import { validateBody } from '../middleware/validate.js';
import { authController } from '../controllers/auth.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', validateBody(registerSchema), authController.register);
router.post('/login', validateBody(loginSchema), authController.login);
router.get('/me', authenticate, authController.me);

export { router as authRoutes };