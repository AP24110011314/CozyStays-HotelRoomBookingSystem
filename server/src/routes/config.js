import express from 'express';

import env from '../config/env.js';

const router = express.Router();

router.get('/public', (req, res) => {
  res.json({
    data: {
      cancellationWindowHours: env.cancellationWindowHours,
      currency: env.currency,
      checkInTime: env.checkInTime,
      checkOutTime: env.checkOutTime,
      paymentMethods: ['online', 'pay_at_hotel'],
      paymentHoldMinutes: env.paymentHoldMinutes,
    },
  });
});

export { router as configRoutes };
