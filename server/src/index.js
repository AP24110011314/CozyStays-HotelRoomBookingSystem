import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import env from './config/env.js';
import { connectDB } from './config/db.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authRoutes } from './routes/auth.js';
import { roomRoutes } from './routes/rooms.js';
import { bookingRoutes } from './routes/bookings.js';
import { adminRoutes } from './routes/admin.js';
import { healthRoutes } from './routes/health.js';
import { configRoutes } from './routes/config.js';
import { paymentRoutes } from './routes/payments.js';
import { startEmailWorker } from './workers/emailWorker.js';
import { startHoldExpiryWorker } from './workers/holdExpiryWorker.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || env.clientUrls.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    credentials: true,
  }));
  app.use(morgan('dev'));

  // Webhook raw body parser (must precede express.json)
  app.use('/api/payments/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
    req.rawBody = req.body;
    next();
  });

  app.use(express.json());

  // Public unthrottled endpoints
  app.get('/', (req, res) => {
    res.json({
      status: 'ok',
      message: `${env.appName} API is running`,
      health: '/api/health',
      timestamp: new Date().toISOString(),
    });
  });
  app.use('/health', healthRoutes);
  app.use('/api/health', healthRoutes);
  app.use('/api/config', configRoutes);

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: env.nodeEnv === 'production' ? 1000 : 10000,
    skip: (req) =>
      env.nodeEnv === 'development' ||
      env.nodeEnv === 'test' ||
      req.ip === '127.0.0.1' ||
      req.ip === '::1' ||
      req.ip === '::ffff:127.0.0.1' ||
      req.path.startsWith('/health') ||
      req.path.startsWith('/config'),
    message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  app.use('/api/auth', authRoutes);
  app.use('/api/rooms', roomRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

async function start() {
  try {
    await connectDB();
    startEmailWorker();
    startHoldExpiryWorker();
    const app = createApp();
    app.listen(env.port, () => {
      console.log(`Server running on port ${env.port} (${env.nodeEnv})`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Only start the server if this file is run directly (not imported)
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  start();
}

export { start };