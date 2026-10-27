import express from 'express';
import { z } from 'zod';

import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { adminController } from '../controllers/admin.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, authorize('admin'));

const bookingsListSchema = z.object({
  status: z.enum(['upcoming', 'active', 'completed', 'cancelled']).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  guestEmail: z.string().email().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

const occupancySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  roomId: z.string().optional(),
});

const failedEmailsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

const retrySchema = z.object({
  id: z.string(),
});

const idSchema = z.object({
  id: z.string(),
});

const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['single', 'double', 'suite']),
  description: z.string().min(1).max(2000),
  basePrice: z.number().int().positive(),
  maxGuests: z.number().int().positive(),
  amenities: z.array(z.string()).default([]),
  photos: z.array(z.string().url()).default([]),
});

const updateRoomSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['single', 'double', 'suite']).optional(),
  description: z.string().min(1).max(2000).optional(),
  basePrice: z.number().int().positive().optional(),
  maxGuests: z.number().int().positive().optional(),
  amenities: z.array(z.string()).optional(),
  photos: z.array(z.string().url()).optional(),
  active: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'At least one field required' });

router.get('/stats', adminController.getStats);
router.get('/occupancy', validateQuery(occupancySchema), adminController.getOccupancy);
router.get('/bookings', validateQuery(bookingsListSchema), adminController.listBookings);
router.delete('/bookings/:id', validateParams(retrySchema), adminController.cancelBooking);
router.get('/failed-emails', validateQuery(failedEmailsSchema), adminController.listFailedEmails);
router.post('/failed-emails/:id/retry', validateParams(retrySchema), adminController.retryEmail);

// Admin room management
router.post('/rooms', validateBody(createRoomSchema), adminController.createRoom);
router.patch('/rooms/:id', validateParams(idSchema), validateBody(updateRoomSchema), adminController.updateRoom);
router.patch('/rooms/:id/toggle', validateParams(idSchema), adminController.toggleRoom);
router.delete('/rooms/:id', validateParams(idSchema), adminController.deleteRoom);

export { router as adminRoutes };