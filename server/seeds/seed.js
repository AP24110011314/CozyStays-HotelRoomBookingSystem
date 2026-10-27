import 'dotenv/config';
import readline from 'readline';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import env from '../src/config/env.js';
import { syncAllIndexes } from '../src/config/db.js';
import { User, Room, Booking, RoomNight, EmailOutbox } from '../src/models/index.js';
import { generateReference } from '../src/utils/reference.js';
import { toUTCDateOnly, dateRange } from '../src/utils/dates.js';
import { searchRooms } from '../src/services/rooms.js';

const BCRYPT_COST = 12;

function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

export async function runSeed() {
  if (env.nodeEnv === 'production') {
    console.error('ERROR: Seed script refused to run in production environment (NODE_ENV=production).');
    process.exit(1);
  }

  if (!env.mongodbUri) {
    console.error('ERROR: MONGODB_URI is missing. Please set your MongoDB connection string in .env');
    process.exit(1);
  }

  console.log('Connecting to database...');
  await mongoose.connect(env.mongodbUri, {
    serverSelectionTimeoutMS: 10000,
  });

  const dbName = mongoose.connection.name;
  console.log(`\n========================================`);
  console.log(`Database connected: "${dbName}"`);
  console.log(`========================================\n`);

  // Count existing documents in this app's collections only
  const existingCounts = {
    users: await User.countDocuments(),
    rooms: await Room.countDocuments(),
    bookings: await Booking.countDocuments(),
    roomNights: await RoomNight.countDocuments(),
    emailOutbox: await EmailOutbox.countDocuments(),
  };

  const totalExisting = Object.values(existingCounts).reduce((a, b) => a + b, 0);

  console.log('Current document counts in application collections:');
  console.log(` - users:        ${existingCounts.users}`);
  console.log(` - rooms:        ${existingCounts.rooms}`);
  console.log(` - bookings:     ${existingCounts.bookings}`);
  console.log(` - room_nights:  ${existingCounts.roomNights}`);
  console.log(` - email_outbox: ${existingCounts.emailOutbox}`);
  console.log(` Total to delete: ${totalExisting} documents\n`);

  console.log('Planned additions:');
  console.log(' - 3 users (1 admin, 2 guests)');
  console.log(' - 20 rooms across 4 types (single, double, deluxe, suite)');
  console.log(' - 8 bookings (2 past, 2 active, 3 upcoming, 1 cancelled) with matching RoomNights\n');

  // Safety confirmation check
  const hasYesFlag = process.argv.includes('--yes') || process.argv.includes('-y');
  if (!hasYesFlag) {
    const answer = await askConfirmation(`WARNING: You are about to wipe ${totalExisting} documents from cloud database "${dbName}". Continue? (y/N): `);
    if (answer !== 'y' && answer !== 'yes') {
      console.log('Seed cancelled. No changes made.');
      await mongoose.disconnect();
      process.exit(0);
    }
  } else {
    console.log('Proceeding automatically (--yes flag provided)...');
  }

  console.log('\n1. Wiping only application collections...');
  await Promise.all([
    User.deleteMany({}),
    Room.deleteMany({}),
    Booking.deleteMany({}),
    RoomNight.deleteMany({}),
    EmailOutbox.deleteMany({}),
  ]);
  console.log('   Application collections cleared.');

  console.log('2. Syncing and verifying indexes...');
  await syncAllIndexes();
  console.log('   All indexes verified (including unique RoomNight {room, date} and Booking {reference}).');

  console.log('3. Seeding users...');
  const guestPasswordHash = await bcrypt.hash('Guest@12345', BCRYPT_COST);
  const adminPasswordHash = await bcrypt.hash('Admin@12345', BCRYPT_COST);

  const admin = await User.create({
    email: 'admin@hotel.test',
    passwordHash: adminPasswordHash,
    name: 'Admin User',
    role: 'admin',
  });

  const guest1 = await User.create({
    email: 'guest1@test.com',
    passwordHash: guestPasswordHash,
    name: 'Guest One',
    role: 'guest',
  });

  const guest2 = await User.create({
    email: 'guest2@test.com',
    passwordHash: guestPasswordHash,
    name: 'Guest Two',
    role: 'guest',
  });

  console.log('   Created admin: admin@hotel.test');
  console.log('   Created guest1: guest1@test.com');
  console.log('   Created guest2: guest2@test.com');

  console.log('4. Seeding 20 rooms (4 types with varied amenities and working image URLs)...');
  const roomDefinitions = [
    // 5 Single Rooms ($85 - $115)
    { type: 'single', name: 'Cozy Single Studio 101', basePrice: 8500, maxGuests: 1, amenities: ['wifi', 'tv', 'ac', 'desk'] },
    { type: 'single', name: 'Executive Single 102', basePrice: 9500, maxGuests: 1, amenities: ['wifi', 'tv', 'ac', 'minibar', 'desk'] },
    { type: 'single', name: 'Standard Single 103', basePrice: 9000, maxGuests: 1, amenities: ['wifi', 'tv', 'ac', 'safe'] },
    { type: 'single', name: 'Garden Single 104', basePrice: 10500, maxGuests: 1, amenities: ['wifi', 'tv', 'ac', 'balcony', 'coffee-maker'] },
    { type: 'single', name: 'City View Single 105', basePrice: 11500, maxGuests: 1, amenities: ['wifi', 'tv', 'ac', 'safe', 'desk', 'balcony'] },

    // 6 Double Rooms ($130 - $175)
    { type: 'double', name: 'Classic Double 201', basePrice: 13000, maxGuests: 2, amenities: ['wifi', 'tv', 'ac', 'safe', 'coffee-maker'] },
    { type: 'double', name: 'Superior Double 202', basePrice: 14500, maxGuests: 2, amenities: ['wifi', 'tv', 'ac', 'minibar', 'safe'] },
    { type: 'double', name: 'Deluxe Double 203', basePrice: 15500, maxGuests: 2, amenities: ['wifi', 'tv', 'ac', 'minibar', 'balcony'] },
    { type: 'double', name: 'Balcony Double 204', basePrice: 16000, maxGuests: 2, amenities: ['wifi', 'tv', 'ac', 'balcony', 'bathtub'] },
    { type: 'double', name: 'Panoramic Double 205', basePrice: 17000, maxGuests: 2, amenities: ['wifi', 'tv', 'ac', 'minibar', 'safe', 'balcony'] },
    { type: 'double', name: 'Courtyard Double 206', basePrice: 14000, maxGuests: 2, amenities: ['wifi', 'tv', 'ac', 'coffee-maker', 'desk'] },

    // 5 Deluxe Rooms ($210 - $270)
    { type: 'deluxe', name: 'Deluxe King 301', basePrice: 21000, maxGuests: 3, amenities: ['wifi', 'tv', 'ac', 'minibar', 'safe', 'bathtub', 'coffee-maker'] },
    { type: 'deluxe', name: 'Deluxe Ocean View 302', basePrice: 24500, maxGuests: 3, amenities: ['wifi', 'tv', 'ac', 'minibar', 'balcony', 'ocean-view', 'bathtub'] },
    { type: 'deluxe', name: 'Deluxe Grand Corner 303', basePrice: 23500, maxGuests: 3, amenities: ['wifi', 'tv', 'ac', 'minibar', 'safe', 'balcony', 'bathtub'] },
    { type: 'deluxe', name: 'Deluxe Sky Terrace 304', basePrice: 26000, maxGuests: 3, amenities: ['wifi', 'tv', 'ac', 'minibar', 'balcony', 'ocean-view', 'safe'] },
    { type: 'deluxe', name: 'Deluxe Family Room 305', basePrice: 27000, maxGuests: 4, amenities: ['wifi', 'tv', 'ac', 'minibar', 'safe', 'bathtub', 'coffee-maker'] },

    // 4 Suites ($350 - $480)
    { type: 'suite', name: 'Executive Suite 401', basePrice: 35000, maxGuests: 4, amenities: ['wifi', 'tv', 'ac', 'minibar', 'safe', 'balcony', 'bathtub', 'coffee-maker', 'ocean-view'] },
    { type: 'suite', name: 'Penthouse Suite 402', basePrice: 42000, maxGuests: 4, amenities: ['wifi', 'tv', 'ac', 'minibar', 'safe', 'balcony', 'bathtub', 'coffee-maker', 'ocean-view', 'desk'] },
    { type: 'suite', name: 'Royal Garden Suite 403', basePrice: 39000, maxGuests: 4, amenities: ['wifi', 'tv', 'ac', 'minibar', 'safe', 'balcony', 'bathtub', 'coffee-maker'] },
    { type: 'suite', name: 'Presidential Suite 404', basePrice: 48000, maxGuests: 6, amenities: ['wifi', 'tv', 'ac', 'minibar', 'safe', 'balcony', 'bathtub', 'coffee-maker', 'ocean-view', 'desk'] },
  ];

  // Working high-res room images
  const roomImages = {
    single: [
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&auto=format&fit=crop&q=80',
    ],
    double: [
      'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1591088398332-8a77919401e3?w=800&auto=format&fit=crop&q=80',
    ],
    deluxe: [
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',
    ],
    suite: [
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&auto=format&fit=crop&q=80',
    ],
  };

  const createdRooms = [];
  for (let i = 0; i < roomDefinitions.length; i++) {
    const def = roomDefinitions[i];
    const typeImages = roomImages[def.type] || roomImages.single;
    const photos = [
      typeImages[i % typeImages.length],
      typeImages[(i + 1) % typeImages.length],
    ];

    const room = await Room.create({
      name: def.name,
      type: def.type,
      description: `Luxurious ${def.type} accommodation featuring premium bedding, soundproofing, and contemporary furnishings for maximum comfort.`,
      basePrice: def.basePrice,
      maxGuests: def.maxGuests,
      amenities: def.amenities,
      photos,
      active: true,
    });
    createdRooms.push(room);
  }
  console.log(`   Created ${createdRooms.length} rooms.`);

  console.log('5. Seeding 8 sample bookings (past, current, future, one cancelled)...');
  const now = new Date();
  const todayMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const bookingConfigs = [
    // 2 Past bookings
    { guest: guest1, room: createdRooms[0], offsetDays: -12, nightsCount: 3, guests: 1, status: 'upcoming' },
    { guest: guest2, room: createdRooms[1], offsetDays: -6, nightsCount: 3, guests: 2, status: 'upcoming' },
    // 2 Current active bookings (checkIn <= today < checkOut)
    { guest: guest1, room: createdRooms[2], offsetDays: -1, nightsCount: 3, guests: 1, status: 'upcoming' },
    { guest: guest2, room: createdRooms[6], offsetDays: -2, nightsCount: 5, guests: 2, status: 'upcoming' },
    // 3 Future upcoming bookings
    { guest: guest1, room: createdRooms[11], offsetDays: 4, nightsCount: 3, guests: 3, status: 'upcoming' },
    { guest: guest2, room: createdRooms[12], offsetDays: 10, nightsCount: 4, guests: 2, status: 'upcoming' },
    { guest: guest1, room: createdRooms[16], offsetDays: 18, nightsCount: 3, guests: 4, status: 'upcoming' },
    // 1 Cancelled booking
    { guest: guest2, room: createdRooms[17], offsetDays: 8, nightsCount: 3, guests: 2, status: 'cancelled' },
  ];

  let totalRoomNightsCreated = 0;
  for (const cfg of bookingConfigs) {
    const checkIn = new Date(todayMidnight.getTime() + cfg.offsetDays * 24 * 60 * 60 * 1000);
    const checkOut = new Date(checkIn.getTime() + cfg.nightsCount * 24 * 60 * 60 * 1000);
    const nights = dateRange(checkIn, checkOut);
    const reference = generateReference();
    const totalPrice = cfg.room.basePrice * nights.length;

    const booking = await Booking.create({
      reference,
      user: cfg.guest._id,
      room: cfg.room._id,
      checkIn,
      checkOut,
      guests: cfg.guests,
      totalPrice,
      status: cfg.status,
      cancelledAt: cfg.status === 'cancelled' ? new Date() : undefined,
    });

    // Only active, past, and upcoming bookings hold RoomNights (cancelled bookings release nights)
    if (cfg.status !== 'cancelled') {
      const roomNightDocs = nights.map((d) => ({
        room: cfg.room._id,
        date: d,
        booking: booking._id,
      }));
      await RoomNight.insertMany(roomNightDocs);
      totalRoomNightsCreated += roomNightDocs.length;
    }

    console.log(`   Booking ${reference} (${cfg.status}): ${cfg.guest.name} in ${cfg.room.name}`);
  }

  console.log(`\n========================================`);
  console.log(`SEEDING VERIFICATION (Database: "${dbName}")`);
  console.log(`========================================`);
  const finalCounts = {
    users: await User.countDocuments(),
    rooms: await Room.countDocuments(),
    bookings: await Booking.countDocuments(),
    roomNights: await RoomNight.countDocuments(),
    emailOutbox: await EmailOutbox.countDocuments(),
  };

  console.log(`Final Collection Counts:`);
  console.log(` - users:        ${finalCounts.users} (expected: 3)`);
  console.log(` - rooms:        ${finalCounts.rooms} (expected: 20)`);
  console.log(` - bookings:     ${finalCounts.bookings} (expected: 8)`);
  console.log(` - room_nights:  ${finalCounts.roomNights} (expected: ${totalRoomNightsCreated})`);
  console.log(` - email_outbox: ${finalCounts.emailOutbox}`);

  // Test sample search
  console.log('\nRunning sample availability search...');
  const searchCheckIn = new Date(todayMidnight.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const searchCheckOut = new Date(todayMidnight.getTime() + 33 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const searchResults = await searchRooms({
    checkIn: searchCheckIn,
    checkOut: searchCheckOut,
    guests: 2,
    page: 1,
    limit: 10,
  });

  console.log(`Sample search for ${searchCheckIn} to ${searchCheckOut} (guests: 2): found ${searchResults.meta.total} available rooms.`);
  if (searchResults.data.length > 0) {
    console.log(`First available room: "${searchResults.data[0].name}" ($${(searchResults.data[0].totalPrice / 100).toFixed(2)} total for ${searchResults.data[0].nights} nights)`);
  }

  console.log('\nSeed completed successfully!');
  await mongoose.disconnect();
}

import { fileURLToPath } from 'url';
import path from 'path';

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\nSeed error:', err.message || err);
      process.exit(1);
    });
}