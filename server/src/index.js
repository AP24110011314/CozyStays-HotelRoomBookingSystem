import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

import env from './config/env.js';
import { connectDB } from './config/db.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authRoutes } from './routes/auth.js';
import { roomRoutes } from './routes/rooms.js';
import { bookingRoutes } from './routes/bookings.js';
import { adminRoutes } from './routes/admin.js';
import { healthRoutes } from './routes/health.js';
import { startEmailWorker } from './workers/emailWorker.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: env.clientUrl,
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    await connectDB();
    startEmailWorker();
    app.listen(env.port, () => {
      console.log(`Server running on port ${env.port} (${env.nodeEnv})`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();