import mongoose from 'mongoose';
import env from './env.js';

let isConnected = false;

export async function connectDB() {
  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(env.mongodbUri);
    isConnected = true;
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
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