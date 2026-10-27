import { Room, RoomNight } from '../models/index.js';
import { AppError, ERROR_CODES } from '../utils/errors.js';
import { toUTCDateOnly, dateRange } from '../utils/dates.js';

export async function createRoom(data) {
  const room = await Room.create(data);
  return room;
}

export async function getRoomById(id) {
  const room = await Room.findById(id);
  if (!room) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Room not found');
  }
  return room;
}

export async function updateRoom(id, data) {
  const room = await Room.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!room) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Room not found');
  }
  return room;
}

export async function toggleRoomActive(id) {
  const room = await Room.findById(id);
  if (!room) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Room not found');
  }
  room.active = !room.active;
  await room.save();
  return room;
}

export async function deleteRoom(id) {
  const room = await Room.findByIdAndDelete(id);
  if (!room) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Room not found');
  }
  return { success: true };
}

export async function searchRooms(params) {
  const {
    checkIn,
    checkOut,
    guests,
    minPrice,
    maxPrice,
    type,
    amenities,
    sort = 'priceAsc',
    page = 1,
    limit = 10,
  } = params;

  const checkInDate = toUTCDateOnly(checkIn);
  const checkOutDate = toUTCDateOnly(checkOut);
  const nights = dateRange(checkInDate, checkOutDate);

  const query = { active: true };

  if (guests) {
    query.maxGuests = { $gte: guests };
  }
  if (minPrice !== undefined || maxPrice !== undefined) {
    query.basePrice = {};
    if (minPrice !== undefined) query.basePrice.$gte = minPrice;
    if (maxPrice !== undefined) query.basePrice.$lte = maxPrice;
  }
  if (type) {
    query.type = type;
  }
  if (amenities) {
    const amenityList = amenities.split(',').map(a => a.trim()).filter(Boolean);
    if (amenityList.length > 0) {
      query.amenities = { $all: amenityList };
    }
  }

  const rooms = await Room.find(query).lean();

  const bookedRoomIds = await RoomNight.find({
    room: { $in: rooms.map(r => r._id) },
    date: { $gte: checkInDate, $lt: checkOutDate },
  }).distinct('room');

  const availableRooms = rooms.filter(r => !bookedRoomIds.some(id => id.equals(r._id)));

  const sortFn = getSortFunction(sort);
  availableRooms.sort(sortFn);

  const total = availableRooms.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginated = availableRooms.slice(start, start + limit);

  const data = paginated.map(room => ({
    id: room._id.toString(),
    name: room.name,
    type: room.type,
    description: room.description,
    basePrice: room.basePrice,
    maxGuests: room.maxGuests,
    amenities: room.amenities,
    photos: room.photos,
    nights: nights.length,
    totalPrice: room.basePrice * nights.length,
  }));

  return { data, meta: { page, limit, total, totalPages } };
}

export async function getUnavailableDates(roomId, from, to) {
  const fromDate = toUTCDateOnly(from);
  const toDate = toUTCDateOnly(to);

  const roomNights = await RoomNight.find({
    room: roomId,
    date: { $gte: fromDate, $lt: toDate },
  }).select('date').lean();

  const unavailableDates = roomNights.map(rn => rn.date.toISOString().split('T')[0]);
  return { unavailableDates };
}

function getSortFunction(sort) {
  switch (sort) {
    case 'priceAsc': return (a, b) => a.basePrice - b.basePrice;
    case 'priceDesc': return (a, b) => b.basePrice - a.basePrice;
    case 'name': return (a, b) => a.name.localeCompare(b.name);
    case 'type': return (a, b) => a.type.localeCompare(b.type);
    default: return (a, b) => a.basePrice - b.basePrice;
  }
}