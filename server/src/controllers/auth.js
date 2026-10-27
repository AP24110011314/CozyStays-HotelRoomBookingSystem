import { register, login, me } from '../services/auth.js';

export const authController = {
  async register(req, res, next) {
    try {
      const { email, password, name } = req.validatedBody;
      const result = await register(email, password, name);
      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.validatedBody;
      const result = await login(email, password);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  },

  async me(req, res, next) {
    try {
      const user = await me(req.user.id);
      res.json({ data: { user } });
    } catch (error) {
      next(error);
    }
  },
};