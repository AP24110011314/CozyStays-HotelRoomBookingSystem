import { z } from 'zod';

const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

const envSchema = z.object({
  APP_NAME: z.string().default('CozyStays'),
  PORT: z.coerce.number().int().positive().default(5001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default(isTest ? 'test' : 'development'),
  MONGODB_URI: isTest
    ? z.string().optional()
    : z.string({
        required_error: 'MONGODB_URI is required',
        invalid_type_error: 'MONGODB_URI must be a string',
      }).min(1, 'MONGODB_URI cannot be empty'),
  JWT_SECRET: isTest
    ? z.string().default('test-jwt-secret-key-at-least-32-chars-long')
    : z.string({
        required_error: 'JWT_SECRET is required',
      }).min(1, 'JWT_SECRET cannot be empty'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  CANCELLATION_WINDOW_HOURS: z.coerce.number().int().nonnegative().default(48),
  MAX_STAY_NIGHTS: z.coerce.number().int().positive().default(30),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(2525),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('CozyStays <no-reply@cozystays.test>'),
  EMAIL_FROM: z.string().optional(),
  CURRENCY: z.string().default('INR'),
  CHECK_IN_TIME: z.string().default('2:00 PM'),
  CHECK_OUT_TIME: z.string().default('11:00 AM'),
  PAYMENT_PROVIDER: z.enum(['mock', 'razorpay']).default('mock'),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  PAYMENT_HOLD_MINUTES: z.coerce.number().int().positive().default(15),
}).superRefine((data, ctx) => {
  if (data.PAYMENT_PROVIDER === 'razorpay') {
    if (!data.RAZORPAY_KEY_ID) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'RAZORPAY_KEY_ID is required when PAYMENT_PROVIDER=razorpay',
        path: ['RAZORPAY_KEY_ID'],
      });
    }
    if (!data.RAZORPAY_KEY_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'RAZORPAY_KEY_SECRET is required when PAYMENT_PROVIDER=razorpay',
        path: ['RAZORPAY_KEY_SECRET'],
      });
    }
    if (!data.RAZORPAY_WEBHOOK_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'RAZORPAY_WEBHOOK_SECRET is required when PAYMENT_PROVIDER=razorpay',
        path: ['RAZORPAY_WEBHOOK_SECRET'],
      });
    }
  }
});

let parsedEnv;
try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const missingKeys = error.issues.map((i) => i.path.join('.')).join(', ');
    console.error(`Environment validation error: Missing or invalid environment variable(s): ${missingKeys}`);
    const hasMongoIssue = error.issues.some((i) => i.path.includes('MONGODB_URI'));
    if (hasMongoIssue) {
      console.error('Error: MONGODB_URI is missing. Please set your MongoDB Atlas connection string in server/.env');
    }
  } else {
    console.error('Failed to validate environment variables');
  }
  if (!isTest) {
    process.exit(1);
  }
  throw error;
}

if (parsedEnv.NODE_ENV !== 'production' && parsedEnv.RAZORPAY_KEY_ID?.startsWith('rzp_live_')) {
  console.warn('WARNING: Live Razorpay key detected in non-production environment!');
}

const clientUrls = parsedEnv.CLIENT_URL
  ? parsedEnv.CLIENT_URL.split(',').map((url) => url.trim()).filter(Boolean)
  : ['http://localhost:5173'];

const env = {
  appName: parsedEnv.APP_NAME || 'CozyStays',
  port: parsedEnv.PORT,
  nodeEnv: parsedEnv.NODE_ENV,
  mongodbUri: parsedEnv.MONGODB_URI,
  jwtSecret: parsedEnv.JWT_SECRET,
  jwtExpiresIn: parsedEnv.JWT_EXPIRES_IN,
  clientUrl: clientUrls[0],
  clientUrls,
  cancellationWindowHours: parsedEnv.CANCELLATION_WINDOW_HOURS,
  maxStayNights: parsedEnv.MAX_STAY_NIGHTS,
  currency: parsedEnv.CURRENCY,
  checkInTime: parsedEnv.CHECK_IN_TIME,
  checkOutTime: parsedEnv.CHECK_OUT_TIME,
  paymentProvider: parsedEnv.PAYMENT_PROVIDER,
  razorpayKeyId: parsedEnv.RAZORPAY_KEY_ID,
  razorpayKeySecret: parsedEnv.RAZORPAY_KEY_SECRET,
  razorpayWebhookSecret: parsedEnv.RAZORPAY_WEBHOOK_SECRET,
  paymentHoldMinutes: parsedEnv.PAYMENT_HOLD_MINUTES,
  smtp: {
    host: parsedEnv.SMTP_HOST,
    port: parsedEnv.SMTP_PORT,
    user: parsedEnv.SMTP_USER,
    pass: parsedEnv.SMTP_PASS,
    from: parsedEnv.EMAIL_FROM || parsedEnv.SMTP_FROM,
  },
};

export default env;