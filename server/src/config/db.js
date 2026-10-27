import mongoose from 'mongoose';

import { User, Room, Booking, RoomNight, EmailOutbox } from '../models/index.js';

import env from './env.js';

let isConnected = false;

export async function syncAllIndexes() {
  await Promise.all([
    User.syncIndexes(),
    Room.syncIndexes(),
    Booking.syncIndexes(),
    RoomNight.syncIndexes(),
    EmailOutbox.syncIndexes(),
  ]);

  const roomNightIndexes = await RoomNight.collection.indexes();
  const hasRoomDateUnique = roomNightIndexes.some(
    (idx) => idx.unique && idx.key && idx.key.room === 1 && idx.key.date === 1
  );

  const bookingIndexes = await Booking.collection.indexes();
  const hasReferenceUnique = bookingIndexes.some(
    (idx) => idx.unique && idx.key && idx.key.reference === 1
  );

  if (!hasRoomDateUnique) {
    throw new Error('Verification failed: RoomNight unique {room: 1, date: 1} index is missing');
  }
  if (!hasReferenceUnique) {
    throw new Error('Verification failed: Booking unique {reference: 1} index is missing');
  }
}

export async function connectDB() {
  if (isConnected) {
    return;
  }

  if (!env.mongodbUri) {
    console.error('Error: MONGODB_URI is not set. Please provide a valid MongoDB Atlas connection string in server/.env');
    process.exit(1);
  }

  try {
    await mongoose.connect(env.mongodbUri, {
      serverSelectionTimeoutMS: 10000,
    });
    isConnected = true;
    const dbName = mongoose.connection.name;
    console.log(`MongoDB connected: ${dbName}`);

    await syncAllIndexes();
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    console.error('\nPossible causes of connection failure:');
    console.error('1. Atlas Network Access IP allowlist: Ensure your current IP address (or 0.0.0.0/0 for dev) is added in Atlas Network Access.');
    console.error('2. Wrong username or password: Check database credentials in MONGODB_URI.');
    console.error('3. Special characters in password: If your password contains special characters (@, :, /, etc.), they must be URL-encoded.');
    console.error('4. Missing database name: Ensure the URI contains the database name (e.g., ...mongodb.net/hotel_booking?retryWrites=true...).');
    throw error;
  }
}

export async function disconnectDB() {
  if (!isConnected) {
    return;
  }
  await mongoose.disconnect();
  isConnected = false;
  console.log('MongoDB disconnected');
}

process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDB();
  process.exit(0);
});