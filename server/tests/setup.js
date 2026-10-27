import { config } from 'dotenv';

// Configure test environment variables BEFORE importing application code
process.env.NODE_ENV = 'test';
config({ path: '.env' });
// Crucial: Delete MONGODB_URI so tests never touch Atlas
delete process.env.MONGODB_URI;
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-key-at-least-32-chars-long';
}

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { syncAllIndexes } from '../src/config/db.js';

let mongoServer;

export async function setupTestDB() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  await syncAllIndexes();
}

export async function teardownTestDB() {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
}

export async function clearTestDB() {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}