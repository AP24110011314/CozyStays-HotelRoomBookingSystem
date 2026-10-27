import express from 'express';
import { z } from 'zod';

import { validateQuery, validateParams } from '../middleware/validate.js';
import { roomController } from '../controllers/rooms.js';

const router = express.Router();

const searchSchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.coerce.number().int().positive().optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  type: z.enum(['single', 'double', 'suite']).optional(),
  amenities: z.string().optional(),
  sort: z.enum(['priceAsc', 'priceDesc', 'name', 'type']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

const unavailableDatesParamsSchema = z.object({
  id: z.string(),
});

const unavailableDatesQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const idSchema = z.object({
  id: z.string(),
});

// Public routes only
router.get('/', validateQuery(searchSchema), roomController.search);
router.get('/:id', validateParams(idSchema), roomController.getById);
router.get('/:id/unavailable-dates', validateParams(unavailableDatesParamsSchema), validateQuery(unavailableDatesQuerySchema), roomController.getUnavailableDates);

export { router as roomRoutes };