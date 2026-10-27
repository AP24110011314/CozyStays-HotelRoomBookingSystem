import { Booking, Room, RoomNight, EmailOutbox, User } from '../models/index.js';
import { AppError, ERROR_CODES } from '../utils/errors.js';
import { toUTCDateOnly } from '../utils/dates.js';
import { retryEmail as workerRetryEmail } from '../workers/emailWorker.js';

import { toggleRoomActive, deleteRoom as roomDeleteRoom } from './rooms.js';

export async function getStats() {
  const totalRooms = await Room.countDocuments();
  const activeBookings = await Booking.countDocuments({
    status: { $ne: 'cancelled' },
    checkIn: { $lt: new Date() },
    checkOut: { $gt: new Date() },
  });

  // Occupancy % for next 30 days
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const totalRoomNights = await Room.countDocuments() * 30;
  const bookedRoomNights = await RoomNight.countDocuments({
    date: { $gte: new Date(), $lt: thirtyDaysFromNow },
  });
  const occupancyPct = totalRoomNights > 0 ? Math.round((bookedRoomNights / totalRoomNights) * 100) : 0;

  // Revenue last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const revenueResult = await Booking.aggregate([
    {
      $match: {
        createdAt: { $gte: thirtyDaysAgo },
        status: { $ne: 'cancelled' },
      },
    },
    {
      $group: { _id: null, total: { $sum: '$totalPrice' } },
    },
  ]);
  const revenue30d = revenueResult.length > 0 ? revenueResult[0].total : 0;

  return {
    totalRooms,
    activeBookings,
    occupancyPct,
    revenue30d,
  };
}

export async function getOccupancy(params) {
  const { month, roomId } = params;

  // Parse month (YYYY-MM) or default to current month
  let startOfMonth, endOfMonth;
  if (month) {
    const [year, monthNum] = month.split('-').map(Number);
    startOfMonth = new Date(Date.UTC(year, monthNum - 1, 1));
    endOfMonth = new Date(Date.UTC(year, monthNum, 1));
  } else {
    const now = new Date();
    startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  }

  // Get rooms to show
  const roomQuery = roomId ? { _id: roomId } : { active: true };
  const rooms = await Room.find(roomQuery).select('name').sort({ name: 1 }).lean();

  // Get all room nights in the month
  const roomNightQuery = {
    date: { $gte: startOfMonth, $lt: endOfMonth },
  };
  if (roomId) {
    roomNightQuery.room = roomId;
  }

  const roomNights = await RoomNight.find(roomNightQuery)
    .populate('booking', 'reference user')
    .populate({
      path: 'booking',
      populate: { path: 'user', select: 'name email' },
    })
    .lean();

  // Build occupancy map: roomId -> Map<date, booking info>
  const occupancyMap = new Map();
  for (const rn of roomNights) {
    const roomIdStr = rn.room.toString();
    const dateStr = rn.date.toISOString().split('T')[0];

    if (!occupancyMap.has(roomIdStr)) {
      occupancyMap.set(roomIdStr, new Map());
    }

    const bookingInfo = rn.booking ? {
      reference: rn.booking.reference,
      guestName: rn.booking.user?.name || 'Unknown',
    } : null;

    occupancyMap.get(roomIdStr).set(dateStr, bookingInfo);
  }

  // Build response
  const roomData = rooms.map(room => {
    const roomIdStr = room._id.toString();
    const nightsMap = occupancyMap.get(roomIdStr) || new Map();

    const nights = [];
    let current = new Date(startOfMonth);
    while (current < endOfMonth) {
      const dateStr = current.toISOString().split('T')[0];
      const booking = nightsMap.get(dateStr);
      nights.push({
        date: dateStr,
        booked: !!booking,
        booking: booking || null,
      });
      current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
    }

    return {
      id: roomIdStr,
      name: room.name,
      nights,
    };
  });

  return {
    month: startOfMonth.toISOString().split('T')[0].substring(0, 7), // YYYY-MM
    rooms: roomData,
  };
}

export async function listBookings(params) {
  const { status, from, to, guestEmail, page = 1, limit = 10 } = params;

  const query = {};

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

  if (from || to) {
    query.checkIn = {};
    if (from) query.checkIn.$gte = toUTCDateOnly(from);
    if (to) query.checkIn.$lte = toUTCDateOnly(to);
  }

  if (guestEmail) {
    const user = await User.findOne({ email: guestEmail.toLowerCase() });
    if (user) {
      query.user = user._id;
    } else {
      query.user = null; // No match
    }
  }

  const total = await Booking.countDocuments(query);
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;

  const bookings = await Booking.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('room', 'name type')
    .populate('user', 'name email')
    .lean();

  const data = bookings.map(booking => ({
    id: booking._id.toString(),
    reference: booking.reference,
    guest: booking.user ? { name: booking.user.name, email: booking.user.email } : null,
    room: booking.room,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    guests: booking.guests,
    totalPrice: booking.totalPrice,
    status: booking.status,
    createdAt: booking.createdAt,
  }));

  return { data, meta: { page, limit, total, totalPages } };
}

export async function cancelBooking(bookingId) {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Booking not found');
  }

  if (booking.status === 'cancelled') {
    // Idempotent - return already cancelled booking
    return booking;
  }

  // Admin bypasses 48h window
  await RoomNight.deleteMany({ booking: bookingId });

  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  await booking.save();

  // Enqueue cancellation email
  const { enqueueCancellationEmail } = await import('./email.js');
  enqueueCancellationEmail(booking).catch(err => console.error('Failed to enqueue cancellation email:', err));

  return booking;
}

export async function listFailedEmails(params) {
  const { page = 1, limit = 10 } = params;

  const query = { status: { $in: ['failed', 'pending'] } };

  const total = await EmailOutbox.countDocuments(query);
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;

  const emails = await EmailOutbox.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const data = emails.map(email => ({
    id: email._id.toString(),
    to: email.to,
    subject: email.subject,
    status: email.status,
    attempts: email.attempts,
    maxAttempts: email.maxAttempts,
    lastError: email.lastError,
    nextRetryAt: email.nextRetryAt,
    createdAt: email.createdAt,
  }));

  return { data, meta: { page, limit, total, totalPages } };
}

export async function retryEmail(emailId) {
  return workerRetryEmail(emailId);
}

export async function createRoom(data) {
  const { name, type, description, basePrice, maxGuests, amenities = [], photos = [] } = data;

  const room = await Room.create({
    name,
    type,
    description,
    basePrice,
    maxGuests,
    amenities,
    photos,
    active: true,
  });

  return room.toObject();
}

export async function updateRoom(roomId, data) {
  const { name, type, description, basePrice, maxGuests, amenities, photos, active } = data;

  const room = await Room.findByIdAndUpdate(
    roomId,
    { name, type, description, basePrice, maxGuests, amenities, photos, active },
    { new: true, runValidators: true }
  );

  if (!room) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Room not found');
  }

  return room.toObject();
}

export async function toggleRoom(roomId) {
  return toggleRoomActive(roomId);
}

export async function deleteRoom(roomId) {
  return roomDeleteRoom(roomId);
}