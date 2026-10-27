import mongoose from 'mongoose';

import env from '../config/env.js';
import { Booking, Room, RoomNight } from '../models/index.js';
import { AppError, ERROR_CODES } from '../utils/errors.js';
import { toUTCDateOnly, dateRange } from '../utils/dates.js';
import { generateReference } from '../utils/reference.js';

import { enqueueConfirmationEmail, enqueueModificationEmail, enqueueCancellationEmail } from './email.js';

export async function createBooking(userId, data) {
  const { roomId, checkIn, checkOut, guests } = data;

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
  const roomNightDocs = nights.map(d => ({ room: roomId, date: d, booking: tempBookingId }));

  try {
    const inserted = await RoomNight.insertMany(roomNightDocs, { ordered: false });
    if (inserted.length !== nights.length) {
      // Only delete the RoomNights we tried to insert (by tempBookingId)
      await RoomNight.deleteMany({ booking: tempBookingId });
      throw new AppError(ERROR_CODES.ROOM_UNAVAILABLE, 'Room is not available for the selected dates');
    }
  } catch (error) {
    if (error.code === 11000) {
      // Only delete the RoomNights we tried to insert (by tempBookingId)
      await RoomNight.deleteMany({ booking: tempBookingId });
      throw new AppError(ERROR_CODES.ROOM_UNAVAILABLE, 'Room is not available for the selected dates');
    }
    throw error;
  }

  const reference = generateReference();
  const totalPrice = room.basePrice * nights.length;

  const booking = await Booking.create({
    reference,
    user: userId,
    room: roomId,
    checkIn: checkInDate,
    checkOut: checkOutDate,
    guests,
    totalPrice,
    status: 'upcoming',
  });

  // Update RoomNight with real booking ID
  await RoomNight.updateMany(
    { room: roomId, date: { $in: nights } },
    { $set: { booking: booking._id } }
  );

  // Enqueue confirmation email (non-blocking)
  enqueueConfirmationEmail(booking).catch(err => console.error('Failed to enqueue confirmation email:', err));

  return getBookingWithRoom(booking._id);
}

export async function listBookings(userId, role, params) {
  const { status, page = 1, limit = 10 } = params;
  const query = role === 'admin' ? {} : { user: userId };

  if (status) {
    const now = new Date();
    if (status === 'upcoming') {
      query.checkIn = { $gt: now };
      query.status = { $ne: 'cancelled' };
    } else if (status === 'active') {
      query.checkIn = { $lte: now };
      query.checkOut = { $gt: now };
      query.status = { $ne: 'cancelled' };
    } else if (status === 'past') {
      query.checkOut = { $lte: now };
      query.status = { $ne: 'cancelled' };
    } else if (status === 'cancelled') {
      query.status = 'cancelled';
    }
  }

  const total = await Booking.countDocuments(query);
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;

  const bookings = await Booking.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('room', '_id name type description basePrice maxGuests amenities photos')
    .lean();

  const data = bookings.map(booking => ({
    id: booking._id.toString(),
    reference: booking.reference,
    room: {
      id: booking.room._id.toString(),
      name: booking.room.name,
      type: booking.room.type,
      description: booking.room.description,
      basePrice: booking.room.basePrice,
      maxGuests: booking.room.maxGuests,
      amenities: booking.room.amenities,
      photos: booking.room.photos,
    },
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    guests: booking.guests,
    totalPrice: booking.totalPrice,
    nights: dateRange(booking.checkIn, booking.checkOut).length,
    status: getDerivedStatus(booking),
    canCancel: canCancel(booking, role === 'admin'),
    createdAt: booking.createdAt,
  }));

  return { data, meta: { page, limit, total, totalPages } };
}

export async function getBookingById(bookingId, userId, role) {
  const booking = await Booking.findById(bookingId)
    .populate('room', '_id name type description basePrice maxGuests amenities photos')
    .lean();

  if (!booking) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Booking not found');
  }

  if (role !== 'admin' && booking.user.toString() !== userId) {
    throw new AppError(ERROR_CODES.FORBIDDEN, 'Not authorized to view this booking');
  }

  return {
    id: booking._id.toString(),
    reference: booking.reference,
    room: {
      id: booking.room._id.toString(),
      name: booking.room.name,
      type: booking.room.type,
      description: booking.room.description,
      basePrice: booking.room.basePrice,
      maxGuests: booking.room.maxGuests,
      amenities: booking.room.amenities,
      photos: booking.room.photos,
    },
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    guests: booking.guests,
    totalPrice: booking.totalPrice,
    nights: dateRange(booking.checkIn, booking.checkOut).length,
    status: getDerivedStatus(booking),
    canCancel: canCancel(booking, role === 'admin'),
    createdAt: booking.createdAt,
  };
}

export async function modifyBooking(bookingId, userId, role, data) {
  const { checkIn, checkOut, guests } = data;

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Booking not found');
  }

  if (role !== 'admin' && booking.user.toString() !== userId) {
    throw new AppError(ERROR_CODES.FORBIDDEN, 'Not authorized to modify this booking');
  }

  if (booking.status === 'cancelled') {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Cannot modify a cancelled booking');
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

  // Nights to ADD (new - old)
  const addedNights = newNights.filter(d => !oldNights.some(od => od.getTime() === d.getTime()));
  // Nights to REMOVE (old - new)
  const removedNights = oldNights.filter(d => !newNights.some(nd => nd.getTime() === d.getTime()));

  // 1. CLAIM NEW NIGHTS FIRST
  if (addedNights.length > 0) {
    const roomNightDocs = addedNights.map(d => ({ room: booking.room, date: d, booking: booking._id }));
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

  // 3. Update booking
  const oldCheckIn = booking.checkIn;
  const oldCheckOut = booking.checkOut;
  const oldGuests = booking.guests;

  booking.checkIn = newCheckIn;
  booking.checkOut = newCheckOut;
  booking.guests = newGuests;
  booking.totalPrice = room.basePrice * newNights.length;
  await booking.save();

  // Enqueue modification email (non-blocking) - use raw booking for email
  enqueueModificationEmail(booking, { checkIn: oldCheckIn, checkOut: oldCheckOut, guests: oldGuests }).catch(err => console.error('Failed to enqueue modification email:', err));

  // Return formatted booking for response
  return getBookingWithRoom(booking._id);
}

export async function cancelBooking(bookingId, userId, isAdmin) {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Booking not found');
  }

  if (!isAdmin && booking.user.toString() !== userId) {
    throw new AppError(ERROR_CODES.FORBIDDEN, 'Not authorized to cancel this booking');
  }

  if (booking.status === 'cancelled') {
    return getBookingWithRoom(booking._id); // idempotent
  }

  // Cancellation window: checkIn - now > cancellationWindowHours (admin bypass)
  if (!isAdmin) {
    const hoursUntilCheckIn = (booking.checkIn - new Date()) / (1000 * 60 * 60);
    if (hoursUntilCheckIn <= env.cancellationWindowHours) {
      throw new AppError(ERROR_CODES.CANCEL_WINDOW_EXPIRED, `Cancellation window expired (${env.cancellationWindowHours} hours before check-in)`);
    }
  }

  // Release RoomNights
  await RoomNight.deleteMany({ booking: bookingId });

  // Update booking
  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  await booking.save();

  // Enqueue cancellation email (non-blocking) - use raw booking for email
  enqueueCancellationEmail(booking).catch(err => console.error('Failed to enqueue cancellation email:', err));

  // Return formatted booking for response
  return getBookingWithRoom(booking._id);
}

export function getDerivedStatus(booking) {
  if (booking.status === 'cancelled') return 'cancelled';
  const now = new Date();
  if (now >= booking.checkOut) return 'completed';
  if (now >= booking.checkIn) return 'active';
  return 'upcoming';
}

export function canCancel(booking, isAdmin) {
  if (booking.status === 'cancelled') return false;
  if (isAdmin) return true;
  const hoursUntilCheckIn = (booking.checkIn - new Date()) / (1000 * 60 * 60);
  return hoursUntilCheckIn > env.cancellationWindowHours;
}

async function getBookingWithRoom(bookingId) {
  const booking = await Booking.findById(bookingId)
    .populate('room', '_id name type description basePrice maxGuests amenities photos')
    .lean();

  return {
    id: booking._id.toString(),
    reference: booking.reference,
    room: {
      id: booking.room._id.toString(),
      name: booking.room.name,
      type: booking.room.type,
      description: booking.room.description,
      basePrice: booking.room.basePrice,
      maxGuests: booking.room.maxGuests,
      amenities: booking.room.amenities,
      photos: booking.room.photos,
    },
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    guests: booking.guests,
    totalPrice: booking.totalPrice,
    nights: dateRange(booking.checkIn, booking.checkOut).length,
    status: getDerivedStatus(booking),
    canCancel: canCancel(booking, false), // will be overridden by controller based on role
    createdAt: booking.createdAt,
  };
}