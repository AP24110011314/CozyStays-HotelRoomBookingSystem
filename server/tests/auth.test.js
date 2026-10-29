import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup.js';
import { createApp } from '../src/index.js';

let server;

beforeAll(async () => {
  await setupTestDB();

  const app = createApp();
  server = app.listen(0);
});

afterAll(async () => {
  if (server) {
    server.close();
  }
  await teardownTestDB();
});

beforeEach(async () => {
  await clearTestDB();
});

describe('Health Endpoint', () => {
  it('GET / returns api status ok', async () => {
    const res = await request(server).get('/');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.message).toContain('CozyStays API is running');
  });

  it('GET /api/health returns ok', async () => {
    const res = await request(server).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('Public Config Endpoint', () => {
  it('GET /api/config/public returns server public configuration', async () => {
    const res = await request(server).get('/api/config/public');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.appName).toBe('CozyStays');
    expect(res.body.data.cancellationWindowHours).toBeDefined();
    expect(res.body.data.currency).toBe('INR');
    expect(res.body.data.checkInTime).toBe('2:00 PM');
    expect(res.body.data.checkOutTime).toBe('11:00 AM');
    expect(res.body.data.paymentMethods).toContain('online');
    expect(res.body.data.paymentMethods).toContain('pay_at_hotel');
  });
});

describe('Auth Endpoints', () => {
  it('POST /api/auth/register creates user and returns token', async () => {
    const res = await request(server)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password123', name: 'Test User' });

    expect(res.status).toBe(201);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe('test@example.com');
    expect(res.body.data.user.name).toBe('Test User');
    expect(res.body.data.user.role).toBe('guest');
    expect(res.body.data.token).toBeDefined();
  });

  it('POST /api/auth/register fails with duplicate email', async () => {
    await request(server)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password123', name: 'Test User' });

    const res = await request(server)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password123', name: 'Test User' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('POST /api/auth/login returns token for valid credentials', async () => {
    await request(server)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password123', name: 'Test User' });

    const res = await request(server)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Password123' });

    expect(res.status).toBe(200);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.token).toBeDefined();
  });

  it('POST /api/auth/login fails with invalid credentials', async () => {
    const res = await request(server)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'WrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/auth/me returns user with valid token', async () => {
    const registerRes = await request(server)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password123', name: 'Test User' });

    const token = registerRes.body.data.token;

    const res = await request(server)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe('test@example.com');
  });

  it('GET /api/auth/me fails without token', async () => {
    const res = await request(server)
      .get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});