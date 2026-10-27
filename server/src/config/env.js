import { z } from 'zod';

const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

const envSchema = z.object({
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
  SMTP_FROM: z.string().default('noreply@hotel-booking.test'),
  EMAIL_FROM: z.string().optional(),
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

const clientUrls = parsedEnv.CLIENT_URL
  ? parsedEnv.CLIENT_URL.split(',').map((url) => url.trim()).filter(Boolean)
  : ['http://localhost:5173'];

const env = {
  port: parsedEnv.PORT,
  nodeEnv: parsedEnv.NODE_ENV,
  mongodbUri: parsedEnv.MONGODB_URI,
  jwtSecret: parsedEnv.JWT_SECRET,
  jwtExpiresIn: parsedEnv.JWT_EXPIRES_IN,
  clientUrl: clientUrls[0],
  clientUrls,
  cancellationWindowHours: parsedEnv.CANCELLATION_WINDOW_HOURS,
  maxStayNights: parsedEnv.MAX_STAY_NIGHTS,
  smtp: {
    host: parsedEnv.SMTP_HOST,
    port: parsedEnv.SMTP_PORT,
    user: parsedEnv.SMTP_USER,
    pass: parsedEnv.SMTP_PASS,
    from: parsedEnv.EMAIL_FROM || parsedEnv.SMTP_FROM,
  },
};

export default env;