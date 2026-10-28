import env from '../config/env.js';
import { Booking } from '../models/Booking.js';
import { Payment } from '../models/Payment.js';
import { RoomNight } from '../models/RoomNight.js';
import { AppError, ERROR_CODES } from '../utils/errors.js';

import { enqueueConfirmationEmail } from './email.js';
import { getPaymentProvider } from './payment/index.js';

export async function createPaymentOrder(bookingId, userId) {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Booking not found');
  }

  if (userId && booking.user.toString() !== userId.toString()) {
    throw new AppError(ERROR_CODES.FORBIDDEN, 'Not authorized to pay for this booking');
  }

  // Check if already paid or confirmed
  if (booking.paymentStatus === 'paid' || booking.status === 'confirmed') {
    throw new AppError(ERROR_CODES.CONFLICT, 'Booking is already paid or confirmed');
  }

  // Lazy check: has the hold expired?
  if (booking.holdExpiresAt && new Date() > new Date(booking.holdExpiresAt)) {
    await expireBookingHold(booking._id);
    throw new AppError(ERROR_CODES.ROOM_UNAVAILABLE, 'Booking hold has expired. Please select dates and book again.');
  }

  const provider = getPaymentProvider();
  const amountInMinorUnits = Math.round(booking.totalPrice * 100);

  // Check if an existing pending payment order exists
  let payment = await Payment.findOne({ booking: booking._id, status: 'pending' });

  if (!payment || payment.provider !== provider.name) {
    const order = await provider.createOrder({
      amount: amountInMinorUnits,
      currency: env.currency,
      receipt: booking.reference,
      notes: {
        bookingId: booking._id.toString(),
        reference: booking.reference,
      },
    });

    if (payment) {
      payment.provider = provider.name;
      payment.providerOrderId = order.orderId;
      payment.amount = amountInMinorUnits;
      payment.currency = env.currency;
      await payment.save();
    } else {
      payment = await Payment.create({
        booking: booking._id,
        user: booking.user,
        amount: amountInMinorUnits,
        currency: env.currency,
        method: 'online',
        provider: provider.name,
        providerOrderId: order.orderId,
        status: 'pending',
      });
    }

    return {
      provider: provider.name,
      orderId: order.orderId,
      amount: amountInMinorUnits,
      currency: env.currency,
      keyId: order.keyId,
      holdExpiresAt: booking.holdExpiresAt,
    };
  }

  return {
    provider: provider.name,
    orderId: payment.providerOrderId,
    amount: payment.amount,
    currency: payment.currency,
    keyId: provider.name === 'razorpay' ? env.razorpayKeyId : 'mock_key_test',
    holdExpiresAt: booking.holdExpiresAt,
  };
}

export async function verifyPayment({
  bookingId,
  userId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  mockSuccess = true,
}) {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Booking not found');
  }

  if (userId && booking.user.toString() !== userId.toString()) {
    throw new AppError(ERROR_CODES.FORBIDDEN, 'Not authorized');
  }

  // Idempotency: if already paid, return immediately
  if (booking.status === 'confirmed' && booking.paymentStatus === 'paid') {
    const existingPayment = await Payment.findOne({ booking: booking._id });
    const { getBookingById } = await import('./bookings.js');
    const formattedBooking = await getBookingById(booking._id, userId, 'admin');
    return { booking: formattedBooking, payment: existingPayment };
  }

  // Check hold expiry
  if (booking.holdExpiresAt && new Date() > new Date(booking.holdExpiresAt)) {
    // Attempt re-claim if hold expired
    const nights = await generateBookingNights(booking);
    const reClaimSuccess = await attemptReclaimNights(booking.room, nights, booking._id);

    if (!reClaimSuccess) {
      await expireBookingHold(booking._id);
      // If payment was captured, issue automatic refund
      if (razorpayPaymentId) {
        const provider = getPaymentProvider();
        provider.refund({ paymentId: razorpayPaymentId, amount: booking.totalPrice * 100 })
          .catch((err) => console.error('Refund after expired hold failed:', err));
      }
      throw new AppError(
        ERROR_CODES.ROOM_UNAVAILABLE,
        'Booking hold expired and nights are no longer available. Any payment made will be refunded.'
      );
    }
  }

  const provider = getPaymentProvider();
  const payment = await Payment.findOne({
    booking: booking._id,
    status: { $in: ['pending', 'failed'] },
  });

  if (!payment) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Payment record not found for this booking');
  }

  // Verify signature with provider
  const verification = await provider.verifyPayment({
    orderId: razorpayOrderId || payment.providerOrderId,
    paymentId: razorpayPaymentId || payment.providerPaymentId,
    signature: razorpaySignature,
    mockSuccess,
  });

  if (!verification.valid) {
    payment.status = 'failed';
    payment.failureReason = verification.error || 'Payment signature verification failed';
    await payment.save();
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, verification.error || 'Invalid payment signature');
  }

  // Confirm amount matches server computed booking total (never trust client amounts)
  const expectedMinorUnits = Math.round(booking.totalPrice * 100);
  if (payment.amount !== expectedMinorUnits) {
    payment.status = 'failed';
    payment.failureReason = 'Amount mismatch between payment and booking total';
    await payment.save();
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Payment amount mismatch');
  }

  // Mark Payment paid
  payment.status = 'paid';
  payment.providerPaymentId = verification.paymentId;
  if (razorpayOrderId) payment.providerOrderId = razorpayOrderId;
  payment.paidAt = new Date();
  payment.failureReason = null;
  await payment.save();

  // Mark Booking confirmed
  booking.status = 'confirmed';
  booking.paymentStatus = 'paid';
  booking.holdExpiresAt = null;
  await booking.save();

  // Enqueue confirmation email
  enqueueConfirmationEmail(booking).catch((err) =>
    console.error('Failed to enqueue confirmation email on payment verify:', err)
  );

  const { getBookingById } = await import('./bookings.js');
  const formattedBooking = await getBookingById(booking._id, userId, 'admin');

  return {
    booking: formattedBooking,
    payment,
  };
}

export async function handleWebhook({ rawBody, signature }) {
  const provider = getPaymentProvider();
  const result = await provider.verifyWebhook({
    payload: rawBody,
    signature,
  });

  if (!result.valid) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Invalid webhook signature');
  }

  const { event, data } = result;

  if (event === 'payment.captured') {
    const paymentEntity = data.payment?.entity || data;
    const orderId = paymentEntity.order_id || paymentEntity.orderId;
    const paymentId = paymentEntity.id || paymentEntity.paymentId;

    if (orderId) {
      const payment = await Payment.findOne({ providerOrderId: orderId });
      if (payment && payment.status === 'pending') {
        payment.status = 'paid';
        payment.providerPaymentId = paymentId;
        payment.paidAt = new Date();
        await payment.save();

        const booking = await Booking.findById(payment.booking);
        if (booking && booking.status === 'pending_payment') {
          booking.status = 'confirmed';
          booking.paymentStatus = 'paid';
          booking.holdExpiresAt = null;
          await booking.save();

          enqueueConfirmationEmail(booking).catch((err) =>
            console.error('Failed to enqueue email from webhook:', err)
          );
        }
      }
    }
  } else if (event === 'payment.failed') {
    const paymentEntity = data.payment?.entity || data;
    const orderId = paymentEntity.order_id;
    if (orderId) {
      const payment = await Payment.findOne({ providerOrderId: orderId });
      if (payment && payment.status === 'pending') {
        payment.status = 'failed';
        payment.failureReason = paymentEntity.error_description || 'Payment failed';
        await payment.save();
      }
    }
  } else if (event === 'refund.processed') {
    const refundEntity = data.refund?.entity || data;
    const paymentId = refundEntity.payment_id;
    if (paymentId) {
      const payment = await Payment.findOne({ providerPaymentId: paymentId });
      if (payment && payment.status !== 'refunded') {
        payment.refundedAmount = (payment.refundedAmount || 0) + (refundEntity.amount || 0);
        if (payment.refundedAmount >= payment.amount) {
          payment.status = 'refunded';
        } else {
          payment.status = 'partially_refunded';
        }
        payment.refunds.push({
          providerRefundId: refundEntity.id || `rfnd_${Date.now()}`,
          amount: refundEntity.amount,
          createdAt: new Date(),
        });
        await payment.save();
      }
    }
  }

  return { received: true };
}

export async function getPaymentByBooking(bookingId, userId, isAdmin) {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Booking not found');
  }

  if (!isAdmin && booking.user.toString() !== userId.toString()) {
    throw new AppError(ERROR_CODES.FORBIDDEN, 'Not authorized');
  }

  // Lazy check: if hold expired, release
  if (booking.status === 'pending_payment' && booking.holdExpiresAt && new Date() > new Date(booking.holdExpiresAt)) {
    await expireBookingHold(booking._id);
  }

  const payment = await Payment.findOne({ booking: bookingId }).lean();
  return payment;
}

export async function expireBookingHold(bookingId) {
  const booking = await Booking.findById(bookingId);
  if (!booking || booking.status !== 'pending_payment') {
    return;
  }

  booking.status = 'expired';
  booking.paymentStatus = 'failed';
  await booking.save();

  // Release RoomNights
  await RoomNight.deleteMany({ booking: bookingId });

  // Update Payment record
  await Payment.updateMany(
    { booking: bookingId, status: 'pending' },
    { $set: { status: 'failed', failureReason: 'Hold expired' } }
  );
}

export async function expirePendingHolds() {
  const now = new Date();
  const expiredBookings = await Booking.find({
    status: 'pending_payment',
    holdExpiresAt: { $lt: now },
  });

  for (const booking of expiredBookings) {
    try {
      await expireBookingHold(booking._id);
    } catch (err) {
      console.error(`Failed to expire hold for booking ${booking._id}:`, err);
    }
  }

  return expiredBookings.length;
}

export async function refundBookingPayment(bookingId, refundAmountInMinorUnits, reason = 'Booking cancelled') {
  const payment = await Payment.findOne({
    booking: bookingId,
    status: { $in: ['paid', 'partially_refunded'] },
  });

  if (!payment) {
    return { success: false, reason: 'No paid payment found' };
  }

  const provider = getPaymentProvider();
  const amountToRefund = refundAmountInMinorUnits || (payment.amount - payment.refundedAmount);

  if (amountToRefund <= 0) {
    return { success: true, amount: 0 };
  }

  try {
    const refundResult = await provider.refund({
      paymentId: payment.providerPaymentId,
      amount: amountToRefund,
      notes: { reason, bookingId: bookingId.toString() },
    });

    payment.refundedAmount = (payment.refundedAmount || 0) + amountToRefund;
    payment.status = payment.refundedAmount >= payment.amount ? 'refunded' : 'partially_refunded';
    payment.refunds.push({
      providerRefundId: refundResult.refundId,
      amount: amountToRefund,
      createdAt: new Date(),
    });
    await payment.save();

    return {
      success: true,
      refundId: refundResult.refundId,
      amount: amountToRefund,
    };
  } catch (err) {
    console.error(`Provider refund failed for booking ${bookingId}:`, err);
    payment.failureReason = `Refund failed: ${err.message}`;
    await payment.save();
    return {
      success: false,
      reason: err.message,
    };
  }
}

export async function adminMarkBookingPaid(bookingId) {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Booking not found');
  }

  if (booking.paymentMethod !== 'pay_at_hotel') {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Only pay-at-hotel bookings can be manually marked as paid');
  }

  booking.paymentStatus = 'paid';
  await booking.save();

  let payment = await Payment.findOne({ booking: bookingId });
  if (payment) {
    payment.status = 'paid';
    payment.paidAt = new Date();
    await payment.save();
  } else {
    payment = await Payment.create({
      booking: booking._id,
      user: booking.user,
      amount: Math.round(booking.totalPrice * 100),
      currency: env.currency,
      method: 'pay_at_hotel',
      provider: null,
      status: 'paid',
      paidAt: new Date(),
    });
  }

  const { getBookingById } = await import('./bookings.js');
  const formattedBooking = await getBookingById(bookingId, null, 'admin');

  return { booking: formattedBooking, payment };
}

export async function listPayments(params = {}) {
  const { status, from, to, page = 1, limit = 10 } = params;
  const filter = {};

  if (status) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const skip = (page - 1) * limit;
  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('user', 'name email')
      .populate('booking', 'reference checkIn checkOut totalPrice status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Payment.countDocuments(filter),
  ]);

  return {
    data: payments.map((p) => ({
      id: p._id.toString(),
      bookingId: p.booking?._id?.toString() || p.booking?.toString(),
      bookingReference: p.booking?.reference,
      user: p.user ? { id: p.user._id?.toString(), name: p.user.name, email: p.user.email } : null,
      amount: p.amount,
      currency: p.currency,
      method: p.method,
      provider: p.provider,
      providerOrderId: p.providerOrderId,
      providerPaymentId: p.providerPaymentId,
      status: p.status,
      refundedAmount: p.refundedAmount,
      failureReason: p.failureReason,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    })),
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function adminRefundPayment(paymentId, amount, reason = 'Admin initiated refund') {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Payment not found');
  }

  if (!['paid', 'partially_refunded'].includes(payment.status)) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Only paid payments can be refunded');
  }

  const remainingPaid = payment.amount - (payment.refundedAmount || 0);
  const refundAmount = amount ? Math.min(amount, remainingPaid) : remainingPaid;

  if (refundAmount <= 0) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'No remaining refundable amount on this payment');
  }

  const provider = getPaymentProvider();
  const refundResult = await provider.refund({
    paymentId: payment.providerPaymentId || `mock_pay_${payment._id}`,
    amount: refundAmount,
    notes: { reason, paymentId: paymentId.toString() },
  });

  payment.refundedAmount = (payment.refundedAmount || 0) + refundAmount;
  payment.status = payment.refundedAmount >= payment.amount ? 'refunded' : 'partially_refunded';
  payment.refunds.push({
    providerRefundId: refundResult.refundId,
    amount: refundAmount,
    createdAt: new Date(),
  });
  await payment.save();

  return {
    payment,
    refund: refundResult,
  };
}

// Helpers
async function generateBookingNights(booking) {
  const { dateRange } = await import('../utils/dates.js');
  return dateRange(booking.checkIn, booking.checkOut);
}

async function attemptReclaimNights(roomId, nights, bookingId) {
  try {
    const docs = nights.map((date) => ({ room: roomId, date, booking: bookingId }));
    await RoomNight.insertMany(docs, { ordered: true });
    return true;
  } catch (err) {
    return false;
  }
}
