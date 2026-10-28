import express from 'express';
import { z } from 'zod';

import { authenticate } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import {
  verifyPayment,
  handleWebhook,
  getPaymentByBooking,
} from '../services/payment.service.js';

const router = express.Router();

const verifyPaymentSchema = z.object({
  bookingId: z.string().min(1),
  razorpayOrderId: z.string().optional(),
  razorpayPaymentId: z.string().optional(),
  razorpaySignature: z.string().optional(),
  mockSuccess: z.boolean().optional(),
});

const bookingIdParamSchema = z.object({
  bookingId: z.string().min(1),
});

// POST /api/payments/verify
router.post('/verify', authenticate, validateBody(verifyPaymentSchema), async (req, res, next) => {
  try {
    const result = await verifyPayment({
      bookingId: req.validatedBody.bookingId,
      userId: req.user.id,
      razorpayOrderId: req.validatedBody.razorpayOrderId,
      razorpayPaymentId: req.validatedBody.razorpayPaymentId,
      razorpaySignature: req.validatedBody.razorpaySignature,
      mockSuccess: req.validatedBody.mockSuccess,
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/webhook
router.post('/webhook', async (req, res, next) => {
  try {
    const rawBody = req.rawBody || req.body;
    const signature = req.headers['x-razorpay-signature'] || req.headers['x-signature'];
    const result = await handleWebhook({ rawBody, signature });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/payments/booking/:bookingId
router.get('/booking/:bookingId', authenticate, validateParams(bookingIdParamSchema), async (req, res, next) => {
  try {
    const payment = await getPaymentByBooking(
      req.validatedParams.bookingId,
      req.user.id,
      req.user.role === 'admin'
    );
    res.json({ data: payment });
  } catch (err) {
    next(err);
  }
});

export { router as paymentRoutes };
