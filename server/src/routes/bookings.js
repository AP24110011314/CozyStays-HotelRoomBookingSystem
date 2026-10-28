import express from 'express';
import { z } from 'zod';

import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { bookingController } from '../controllers/bookings.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const createSchema = z.object({
  roomId: z.string(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().positive(),
  paymentMethod: z.enum(['online', 'pay_at_hotel']).default('pay_at_hotel'),
});

const listSchema = z.object({
  status: z.enum(['all', 'upcoming', 'active', 'completed', 'cancelled', 'pending_payment', 'expired', 'past']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

const modifySchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  guests: z.number().int().positive().optional(),
}).refine(data => data.checkIn || data.checkOut || data.guests, {
  message: 'At least one field required',
});

const idSchema = z.object({
  id: z.string(),
});

router.use(authenticate);

router.post('/', validateBody(createSchema), bookingController.create);
router.post('/:id/pay', validateParams(idSchema), bookingController.pay);
router.get('/', validateQuery(listSchema), bookingController.list);
router.get('/:id', validateParams(idSchema), bookingController.getById);
router.patch('/:id', validateParams(idSchema), validateBody(modifySchema), bookingController.modify);
router.delete('/:id', validateParams(idSchema), bookingController.cancel);

export { router as bookingRoutes };