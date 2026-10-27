import express from 'express';
import { z } from 'zod';
import { validateQuery, validateParams, validateBody } from '../middleware/validate.js';
import { adminController } from '../controllers/admin.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, authorize('admin'));

const bookingsListSchema = z.object({
  query: z.object({
    status: z.enum(['upcoming', 'active', 'completed', 'cancelled']).optional(),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    guestEmail: z.string().email().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(10),
  }),
});

const occupancySchema = z.object({
  query: z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    roomId: z.string().optional(),
  }),
});

const failedEmailsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(10),
  }),
});

const retrySchema = z.object({
  params: z.object({ id: z.string() }),
});

router.get('/stats', adminController.getStats);
router.get('/occupancy', validateQuery(occupancySchema), adminController.getOccupancy);
router.get('/bookings', validateQuery(bookingsListSchema), adminController.listBookings);
router.delete('/bookings/:id', validateParams(retrySchema), adminController.cancelBooking);
router.get('/failed-emails', validateQuery(failedEmailsSchema), adminController.listFailedEmails);
router.post('/failed-emails/:id/retry', validateParams(retrySchema), adminController.retryEmail);

export { router as adminRoutes };