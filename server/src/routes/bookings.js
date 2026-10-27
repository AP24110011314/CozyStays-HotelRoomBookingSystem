import express from 'express';
import { z } from 'zod';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { bookingController } from '../controllers/bookings.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/auth.js';

const router = express.Router();

const createSchema = z.object({
  body: z.object({
    roomId: z.string(),
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    guests: z.number().int().positive(),
  }),
});

const listSchema = z.object({
  query: z.object({
    status: z.enum(['upcoming', 'active', 'past', 'cancelled']).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(10),
  }),
});

const modifySchema = z.object({
  body: z.object({
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    guests: z.number().int().positive().optional(),
  }).refine(data => data.checkIn || data.checkOut || data.guests, {
    message: 'At least one field required',
  }),
});

const idSchema = z.object({
  params: z.object({ id: z.string() }),
});

router.use(authenticate);

router.post('/', validateBody(createSchema), bookingController.create);
router.get('/', validateQuery(listSchema), bookingController.list);
router.get('/:id', validateParams(idSchema), bookingController.getById);
router.patch('/:id', validateParams(idSchema), validateBody(modifySchema), bookingController.modify);
router.delete('/:id', validateParams(idSchema), bookingController.cancel);

export { router as bookingRoutes };