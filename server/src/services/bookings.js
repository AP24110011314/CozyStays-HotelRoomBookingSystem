import mongoose from 'mongoose';

import env from '../config/env.js';
import { Booking, Room, RoomNight } from '../models/index.js';
import { AppError, ERROR_CODES } from '../utils/errors.js';
import { toUTCDateOnly, dateRange } from '../utils/dates.js';
import { generateReference } from '../utils/reference.js';

import { enqueueConfirmationEmail, enqueueModificationEmail, enqueueCancellationEmail } from './email.js';

export async function createBooking(userId, data) {
  const { roomId, checkIn, checkOut, guests, paymentMethod = 'pay_at_hotel' } = data;

  const checkInDate = toUTCDateOnly(checkIn);
  const checkOutDate = toUTCDateOnly(checkOut);

  if (checkInDate >= checkOutDate) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'checkIn must be before checkOut');
  }

  const room = await Room.findById(roomId);
  if (!room) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Room not found');
  }
  if (!room.active) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Room is not available');
  }
  if (guests > room.maxGuests) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, `Room accommodates maximum ${room.maxGuests} guests`);
  }

  const nights = dateRange(checkInDate, checkOutDate);
  if (nights.length === 0) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Stay must be at least 1 night');
  }
  if (nights.length > env.maxStayNights) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, `Stay cannot exceed ${env.maxStayNights} nights`);
  }

  // Atomic claim via unique index on RoomNight { room, date }
  const tempBookingId = new mongoose.Types.ObjectId();
  const roomNightDocs = nights.map((d) => ({ room: roomId, date: d, booking: tempBookingId }));

  try {
    const inserted = await RoomNight.insertMany(roomNightDocs, { ordered: false });
    if (inserted.length !== nights.length) {
      await RoomNight.deleteMany({ booking: tempBookingId });
      throw new AppError(ERROR_CODES.ROOM_UNAVAILABLE, 'Room is not available for the selected dates');
    }
  } catch (error) {
    if (error.code === 11000) {
      await RoomNight.deleteMany({ booking: tempBookingId });
      throw new AppError(ERROR_CODES.ROOM_UNAVAILABLE, 'Room is not available for the selected dates');
    }
    throw error;
  }

  const reference = generateReference();
  const totalPrice = room.basePrice * nights.length;

  const isOnline = paymentMethod === 'online';
  const status = isOnline ? 'pending_payment' : 'confirmed';
  const paymentStatus = isOnline ? 'pending' : 'pay_at_hotel';
  const holdExpiresAt = isOnline
    ? new Date(Date.now() + env.paymentHoldMinutes * 60 * 1000)
    : null;

  const booking = await Booking.create({
    reference,
    user: userId,
    room: roomId,
    checkIn: checkInDate,
    checkOut: checkOutDate,
    guests,
    totalPrice,
    status,
    paymentMethod: isOnline ? 'online' : 'pay_at_hotel',
    paymentStatus,
    holdExpiresAt,
  });

  // Update RoomNight with real booking ID
  await RoomNight.updateMany(
    { booking: tempBookingId },
    { $set: { booking: booking._id } }
  );

  let paymentData = null;

  if (isOnline) {
    const { createPaymentOrder } = await import('./payment.service.js');
    paymentData = await createPaymentOrder(booking._id, userId);
  } else {
    // Pay at hotel: create Payment record and enqueue confirmation email immediately
    const { Payment } = await import('../models/Payment.js');
    await Payment.create({
      booking: booking._id,
      user: userId,
      amount: Math.round(totalPrice * 100),
      currency: env.currency,
      method: 'pay_at_hotel',
      provider: null,
      status: 'pay_at_hotel',
    });

    enqueueConfirmationEmail(booking).catch((err) =>
      console.error('Failed to enqueue confirmation email:', err)
    );
  }

  const formattedBooking = await getBookingWithRoom(booking._id);
  if (paymentData) {
    return { ...formattedBooking, payment: paymentData };
  }
  return formattedBooking;
}

export async function listBookings(userId, role, params) {
  const { status, page = 1, limit = 10 } = params;
  const query = role === 'admin' ? {} : { user: userId };

  if (status && status !== 'all') {
    const now = new Date();
    if (status === 'upcoming') {
      query.checkIn = { $gt: now };
      query.status = { $in: ['upcoming', 'confirmed'] };
    } else if (status === 'active') {
      query.checkIn = { $lte: now };
      query.checkOut = { $gt: now };
      query.status = { $in: ['active', 'confirmed'] };
    } else if (status === 'past' || status === 'completed') {
      query.checkOut = { $lte: now };
      query.status = { $in: ['completed', 'confirmed'] };
    } else if (status === 'cancelled') {
      query.status = 'cancelled';
    } else if (status === 'pending_payment') {
      query.status = 'pending_payment';
    } else if (status === 'expired') {
      query.status = 'expired';
    }
  }

  const total = await Booking.countDocuments(query);
  const totalPages = Math.ceil(total / limit) || 1;
  const skip = (page - 1) * limit;

  const bookings = await Booking.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('room', '_id name type description basePrice maxGuests amenities photos')
    .lean();

  const data = bookings.map((booking) => ({
    id: booking._id.toString(),
    reference: booking.reference,
    room: {
      id: booking.room?._id?.toString() || booking.room?.toString(),
      name: booking.room?.name,
      type: booking.room?.type,
      description: booking.room?.description,
      basePrice: booking.room?.basePrice,
      maxGuests: booking.room?.maxGuests,
      amenities: booking.room?.amenities || [],
      photos: booking.room?.photos || [],
    },
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    guests: booking.guests,
    totalPrice: booking.totalPrice,
    paymentMethod: booking.paymentMethod || 'pay_at_hotel',
    paymentStatus: booking.paymentStatus || 'pay_at_hotel',
    holdExpiresAt: booking.holdExpiresAt || null,
    nights: dateRange(booking.checkIn, booking.checkOut).length,
    status: getDerivedStatus(booking),
    canCancel: canCancel(booking, role === 'admin'),
    createdAt: booking.createdAt,
    cancelledAt: booking.cancelledAt || null,
  }));

  return { data, meta: { page: Number(page), limit: Number(limit), total, totalPages } };
}

export async function getBookingById(bookingId, userId, role) {
  let booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Booking not found');
  }

  if (role !== 'admin' && booking.user.toString() !== userId?.toString()) {
    throw new AppError(ERROR_CODES.FORBIDDEN, 'Not authorized to view this booking');
  }

  // Lazy check: if hold expired, release immediately
  if (booking.status === 'pending_payment' && booking.holdExpiresAt && new Date() > new Date(booking.holdExpiresAt)) {
    const { expireBookingHold } = await import('./payment.service.js');
    await expireBookingHold(booking._id);
    booking = await Booking.findById(bookingId);
  }

  const populated = await Booking.findById(bookingId)
    .populate('room', '_id name type description basePrice maxGuests amenities photos')
    .lean();

  return {
    id: populated._id.toString(),
    reference: populated.reference,
    room: {
      id: populated.room?._id?.toString() || populated.room?.toString(),
      name: populated.room?.name,
      type: populated.room?.type,
      description: populated.room?.description,
      basePrice: populated.room?.basePrice,
      maxGuests: populated.room?.maxGuests,
      amenities: populated.room?.amenities || [],
      photos: populated.room?.photos || [],
    },
    checkIn: populated.checkIn,
    checkOut: populated.checkOut,
    guests: populated.guests,
    totalPrice: populated.totalPrice,
    paymentMethod: populated.paymentMethod || 'pay_at_hotel',
    paymentStatus: populated.paymentStatus || 'pay_at_hotel',
    holdExpiresAt: populated.holdExpiresAt || null,
    nights: dateRange(populated.checkIn, populated.checkOut).length,
    status: getDerivedStatus(populated),
    canCancel: canCancel(populated, role === 'admin'),
    createdAt: populated.createdAt,
    cancelledAt: populated.cancelledAt || null,
  };
}

export async function modifyBooking(bookingId, userId, role, data) {
  const { checkIn, checkOut, guests } = data;

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Booking not found');
  }

  if (role !== 'admin' && booking.user.toString() !== userId?.toString()) {
    throw new AppError(ERROR_CODES.FORBIDDEN, 'Not authorized to modify this booking');
  }

  if (booking.status === 'cancelled') {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Cannot modify a cancelled booking');
  }

  if (booking.status === 'expired') {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Cannot modify an expired booking');
  }

  const currentStatus = getDerivedStatus(booking);
  if (currentStatus === 'completed') {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Cannot modify a completed booking');
  }

  const room = await Room.findById(booking.room);
  if (!room) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Room not found');
  }

  const newCheckIn = checkIn ? toUTCDateOnly(checkIn) : booking.checkIn;
  const newCheckOut = checkOut ? toUTCDateOnly(checkOut) : booking.checkOut;
  const newGuests = guests || booking.guests;

  if (newCheckIn >= newCheckOut) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'checkIn must be before checkOut');
  }

  if (newGuests > room.maxGuests) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, `Room accommodates maximum ${room.maxGuests} guests`);
  }

  const newNights = dateRange(newCheckIn, newCheckOut);
  if (newNights.length > env.maxStayNights) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, `Stay cannot exceed ${env.maxStayNights} nights`);
  }
  const oldNights = dateRange(booking.checkIn, booking.checkOut);
  const newTotalPrice = room.basePrice * newNights.length;

  // Paid online bookings modification check
  const isPaidOnline = booking.paymentMethod === 'online' && booking.paymentStatus === 'paid';
  if (isPaidOnline) {
    if (newTotalPrice > booking.totalPrice) {
      throw new AppError(
        ERROR_CODES.CONFLICT,
        'Changes that increase total price cannot be made directly. Please cancel this reservation and make a new booking.',
        { code: 'PAYMENT_REQUIRED_FOR_CHANGE' }
      );
    }
  }

  // Nights to ADD (new - old)
  const addedNights = newNights.filter(
    (d) => !oldNights.some((od) => od.getTime() === d.getTime())
  );
  // Nights to REMOVE (old - new)
  const removedNights = oldNights.filter(
    (d) => !newNights.some((nd) => nd.getTime() === d.getTime())
  );

  // 1. CLAIM NEW NIGHTS FIRST
  if (addedNights.length > 0) {
    const roomNightDocs = addedNights.map((d) => ({
      room: booking.room,
      date: d,
      booking: booking._id,
    }));
    try {
      await RoomNight.insertMany(roomNightDocs, { ordered: false });
    } catch (error) {
      if (error.code === 11000) {
        await RoomNight.deleteMany({ room: booking.room, date: { $in: addedNights } });
        throw new AppError(ERROR_CODES.ROOM_UNAVAILABLE, 'Room is not available for the new dates');
      }
      throw error;
    }
  }

  // 2. RELEASE OLD NIGHTS LAST
  if (removedNights.length > 0) {
    await RoomNight.deleteMany({ room: booking.room, date: { $in: removedNights } });
  }

  // 3. Process differential refund if price decreased on paid online booking
  if (isPaidOnline && newTotalPrice < booking.totalPrice) {
    const refundDifferenceMinorUnits = Math.round((booking.totalPrice - newTotalPrice) * 100);
    const { refundBookingPayment } = await import('./payment.service.js');
    await refundBookingPayment(
      booking._id,
      refundDifferenceMinorUnits,
      'Stay dates shortened modification refund'
    );
  }

  // 4. Update booking
  const oldCheckIn = booking.checkIn;
  const oldCheckOut = booking.checkOut;
  const oldGuests = booking.guests;

  booking.checkIn = newCheckIn;
  booking.checkOut = newCheckOut;
  booking.guests = newGuests;
  booking.totalPrice = newTotalPrice;
  await booking.save();

  // Enqueue modification email (non-blocking)
  enqueueModificationEmail(booking, {
    checkIn: oldCheckIn,
    checkOut: oldCheckOut,
    guests: oldGuests,
  }).catch((err) => console.error('Failed to enqueue modification email:', err));

  return getBookingWithRoom(booking._id);
}

export async function cancelBooking(bookingId, userId, isAdmin) {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Booking not found');
  }

  if (!isAdmin && booking.user.toString() !== userId?.toString()) {
    throw new AppError(ERROR_CODES.FORBIDDEN, 'Not authorized to cancel this booking');
  }

  if (booking.status === 'cancelled') {
    return getBookingWithRoom(booking._id); // idempotent
  }

  // Cancellation window check (admin bypass or 24h grace period for guests)
  if (!isAdmin) {
    const now = new Date();
    if (now >= new Date(booking.checkOut)) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Cannot cancel a completed booking');
    }
    const hoursUntilCheckIn = (new Date(booking.checkIn) - now) / (1000 * 60 * 60);
    const hoursSinceCreated = booking.createdAt
      ? (now - new Date(booking.createdAt)) / (1000 * 60 * 60)
      : Infinity;
    const withinGracePeriod = hoursSinceCreated <= 24 && now < new Date(booking.checkIn);
    if (hoursUntilCheckIn <= env.cancellationWindowHours && !withinGracePeriod) {
      throw new AppError(
        ERROR_CODES.CANCEL_WINDOW_EXPIRED,
        `Cancellation window expired (${env.cancellationWindowHours} hours before check-in)`
      );
    }
  }

  // Refund if paid online
  if (
    booking.paymentMethod === 'online' &&
    ['paid', 'partially_refunded'].includes(booking.paymentStatus)
  ) {
    const { refundBookingPayment } = await import('./payment.service.js');
    await refundBookingPayment(booking._id, null, 'Booking cancelled');
    booking.paymentStatus = 'refunded';
  }

  // Release RoomNights
  await RoomNight.deleteMany({ booking: bookingId });

  // Update booking
  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  await booking.save();

  // Enqueue cancellation email (non-blocking)
  enqueueCancellationEmail(booking).catch((err) =>
    console.error('Failed to enqueue cancellation email:', err)
  );

  return getBookingWithRoom(booking._id);
}

export function getDerivedStatus(booking) {
  if (booking.status === 'cancelled') return 'cancelled';
  if (booking.status === 'expired') return 'expired';
  if (booking.status === 'pending_payment') {
    if (booking.holdExpiresAt && new Date() > new Date(booking.holdExpiresAt)) {
      return 'expired';
    }
    return 'pending_payment';
  }
  const now = new Date();
  if (now >= new Date(booking.checkOut)) return 'completed';
  if (now >= new Date(booking.checkIn)) return 'active';
  return 'upcoming';
}

export function canCancel(booking, isAdmin) {
  if (booking.status === 'cancelled' || booking.status === 'expired') return false;
  if (booking.status === 'pending_payment') return true;
  if (isAdmin) return true;
  const now = new Date();
  if (now >= new Date(booking.checkOut)) return false;
  const hoursUntilCheckIn = (new Date(booking.checkIn) - now) / (1000 * 60 * 60);
  const hoursSinceCreated = booking.createdAt
    ? (now - new Date(booking.createdAt)) / (1000 * 60 * 60)
    : Infinity;
  const withinGracePeriod = hoursSinceCreated <= 24 && now < new Date(booking.checkIn);
  return hoursUntilCheckIn > env.cancellationWindowHours || withinGracePeriod;
}

export async function getBookingWithRoom(bookingId) {
  const booking = await Booking.findById(bookingId)
    .populate('room', '_id name type description basePrice maxGuests amenities photos')
    .lean();

  if (!booking) return null;

  return {
    id: booking._id.toString(),
    reference: booking.reference,
    room: {
      id: booking.room?._id?.toString() || booking.room?.toString(),
      name: booking.room?.name,
      type: booking.room?.type,
      description: booking.room?.description,
      basePrice: booking.room?.basePrice,
      maxGuests: booking.room?.maxGuests,
      amenities: booking.room?.amenities || [],
      photos: booking.room?.photos || [],
    },
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    guests: booking.guests,
    totalPrice: booking.totalPrice,
    paymentMethod: booking.paymentMethod || 'pay_at_hotel',
    paymentStatus: booking.paymentStatus || 'pay_at_hotel',
    holdExpiresAt: booking.holdExpiresAt || null,
    nights: dateRange(booking.checkIn, booking.checkOut).length,
    status: getDerivedStatus(booking),
    canCancel: canCancel(booking, false),
    createdAt: booking.createdAt,
    cancelledAt: booking.cancelledAt || null,
  };
}