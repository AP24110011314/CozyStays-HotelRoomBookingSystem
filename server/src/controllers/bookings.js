import {
  createBooking,
  listBookings,
  getBookingById,
  modifyBooking,
  cancelBooking,
} from '../services/bookings.js';

export const bookingController = {
  async create(req, res, next) {
    try {
      const booking = await createBooking(req.user.id, req.validatedBody);
      if (booking.payment) {
        const { payment, ...bookingData } = booking;
        res.status(201).json({ data: bookingData, payment });
      } else {
        res.status(201).json({ data: booking });
      }
    } catch (error) {
      next(error);
    }
  },

  async pay(req, res, next) {
    try {
      const { createPaymentOrder } = await import('../services/payment.service.js');
      const order = await createPaymentOrder(req.validatedParams.id, req.user.id);
      res.json({ data: order });
    } catch (error) {
      next(error);
    }
  },

  async list(req, res, next) {
    try {
      const result = await listBookings(req.user.id, req.user.role, req.validatedQuery);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const booking = await getBookingById(req.validatedParams.id, req.user.id, req.user.role);
      res.json({ data: booking });
    } catch (error) {
      next(error);
    }
  },

  async modify(req, res, next) {
    try {
      const booking = await modifyBooking(
        req.validatedParams.id,
        req.user.id,
        req.user.role,
        req.validatedBody
      );
      res.json({ data: booking });
    } catch (error) {
      next(error);
    }
  },

  async cancel(req, res, next) {
    try {
      const booking = await cancelBooking(req.validatedParams.id, req.user.id, req.user.role === 'admin');
      res.json({ data: booking });
    } catch (error) {
      next(error);
    }
  },
};