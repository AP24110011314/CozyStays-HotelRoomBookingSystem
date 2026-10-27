import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import env from '../src/config/env.js';
import { User, Room, Booking, RoomNight } from '../src/models/index.js';
import { generateReference } from '../src/utils/reference.js';
import { toUTCDateOnly, dateRange } from '../src/utils/dates.js';

const BCRYPT_COST = 12;

async function seed() {
  if (env.nodeEnv === 'production') {
    console.error('Seed script refused to run in production environment');
    process.exit(1);
  }

  await mongoose.connect(env.mongodbUri);
  console.log('Connected to MongoDB');

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Room.deleteMany({}),
    Booking.deleteMany({}),
    RoomNight.deleteMany({}),
  ]);
  console.log('Cleared existing data');

  // Create users
  const passwordHash = await bcrypt.hash('Guest@12345', BCRYPT_COST);
  const adminPasswordHash = await bcrypt.hash('Admin@12345', BCRYPT_COST);

  const admin = await User.create({
    email: 'admin@hotel.test',
    passwordHash: adminPasswordHash,
    name: 'Admin User',
    role: 'admin',
  });
  console.log('Created admin user');

  const guest1 = await User.create({
    email: 'guest1@test.com',
    passwordHash,
    name: 'Guest One',
    role: 'guest',
  });

  const guest2 = await User.create({
    email: 'guest2@test.com',
    passwordHash,
    name: 'Guest Two',
    role: 'guest',
  });
  console.log('Created guest users');

  // Create 20 rooms (mix of types)
  const roomTypes = [
    { type: 'single', count: 8, basePrice: 10000, maxGuests: 1, namePrefix: 'Single Room' },
    { type: 'double', count: 8, basePrice: 15000, maxGuests: 2, namePrefix: 'Double Room' },
    { type: 'suite', count: 4, basePrice: 30000, maxGuests: 4, namePrefix: 'Suite' },
  ];

  const amenities = ['wifi', 'tv', 'ac', 'minibar', 'safe', 'balcony', 'bathtub', 'coffee-maker'];
  const rooms = [];

  for (const rt of roomTypes) {
    for (let i = 1; i <= rt.count; i++) {
      const roomAmenities = amenities.slice(0, 3 + (i % 4));
      const room = await Room.create({
        name: `${rt.namePrefix} ${i}`,
        type: rt.type,
        description: `Comfortable ${rt.type} room with modern amenities`,
        basePrice: rt.basePrice,
        maxGuests: rt.maxGuests,
        amenities: roomAmenities,
        photos: [],
        active: true,
      });
      rooms.push(room);
    }
  }
  console.log(`Created ${rooms.length} rooms`);

  // Create 8 sample bookings with matching RoomNight rows
  const now = new Date();
  const bookingsData = [
    { guest: guest1, room: rooms[0], daysFromNow: 5, nights: 3 },
    { guest: guest1, room: rooms[1], daysFromNow: 10, nights: 2 },
    { guest: guest2, room: rooms[2], daysFromNow: 15, nights: 4 },
    { guest: guest2, room: rooms[3], daysFromNow: 20, nights: 1 },
    { guest: guest1, room: rooms[4], daysFromNow: -10, nights: 3 }, // past
    { guest: guest2, room: rooms[5], daysFromNow: -5, nights: 2 },  // past
    { guest: guest1, room: rooms[6], daysFromNow: 2, nights: 5 },   // upcoming
    { guest: guest2, room: rooms[7], daysFromNow: 7, nights: 3 },   // upcoming
  ];

  for (const bd of bookingsData) {
    const checkIn = new Date(now);
    checkIn.setDate(checkIn.getDate() + bd.daysFromNow);
    checkIn.setHours(0, 0, 0, 0);

    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + bd.nights);

    const nights = dateRange(checkIn, checkOut);
    const reference = generateReference();
    const totalPrice = bd.room.basePrice * nights.length;

    const booking = await Booking.create({
      reference,
      user: bd.guest._id,
      room: bd.room._id,
      checkIn,
      checkOut,
      guests: Math.min(bd.nights, bd.room.maxGuests),
      totalPrice,
      status: 'upcoming',
    });

    // Create RoomNight entries
    const roomNightDocs = nights.map(d => ({
      room: bd.room._id,
      date: d,
      booking: booking._id,
    }));
    await RoomNight.insertMany(roomNightDocs);

    console.log(`Created booking ${reference} for ${bd.guest.name} in ${bd.room.name}`);
  }

  console.log('Seed completed successfully!');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});