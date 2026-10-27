import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup.js';
import { createApp } from '../src/index.js';
import { Room, User } from '../src/models/index.js';
import bcrypt from 'bcryptjs';
import { signToken } from '../src/utils/jwt.js';

let server;
let adminToken;
let guestToken;
let adminId;
let guestId;

beforeAll(async () => {
  await setupTestDB();

  const app = createApp();
  server = app.listen(0);

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('Admin@12345', 12);
  const admin = await User.create({
    email: 'admin@hotel.test',
    passwordHash: adminPasswordHash,
    name: 'Admin User',
    role: 'admin',
  });
  adminId = admin._id.toString();
  adminToken = signToken({ id: adminId, email: 'admin@hotel.test', role: 'admin' });

  // Create guest user
  const guestPasswordHash = await bcrypt.hash('Guest@12345', 12);
  const guest = await User.create({
    email: 'guest@test.com',
    passwordHash: guestPasswordHash,
    name: 'Guest User',
    role: 'guest',
  });
  guestId = guest._id.toString();
  guestToken = signToken({ id: guestId, email: 'guest@test.com', role: 'guest' });
});

afterAll(async () => {
  if (server) {
    server.close();
  }
  await teardownTestDB();
});

beforeEach(async () => {
  await clearTestDB();

  // Re-create users
  const adminPasswordHash = await bcrypt.hash('Admin@12345', 12);
  const admin = await User.create({
    email: 'admin@hotel.test',
    passwordHash: adminPasswordHash,
    name: 'Admin User',
    role: 'admin',
  });
  adminId = admin._id.toString();
  adminToken = signToken({ id: adminId, email: 'admin@hotel.test', role: 'admin' });

  const guestPasswordHash = await bcrypt.hash('Guest@12345', 12);
  const guest = await User.create({
    email: 'guest@test.com',
    passwordHash: guestPasswordHash,
    name: 'Guest User',
    role: 'guest',
  });
  guestId = guest._id.toString();
  guestToken = signToken({ id: guestId, email: 'guest@test.com', role: 'guest' });
});

describe('Rooms Endpoints', () => {
  // Helper to get future dates
  const getFutureDates = (daysFromNow = 10, nights = 3) => {
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + daysFromNow);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + nights);
    const formatDate = (d) => d.toISOString().split('T')[0];
    return { checkIn: formatDate(checkIn), checkOut: formatDate(checkOut) };
  };

  it('GET /api/rooms returns empty array when no rooms', async () => {
    const { checkIn, checkOut } = getFutureDates();
    const res = await request(server)
      .get('/api/rooms')
      .query({ checkIn, checkOut });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
  });

  it('POST /api/admin/rooms creates room (admin)', async () => {
    const res = await request(server)
      .post('/api/admin/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Room',
        type: 'single',
        description: 'A test room',
        basePrice: 10000,
        maxGuests: 2,
        amenities: ['wifi', 'tv'],
        photos: [],
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.name).toBe('Test Room');
    expect(res.body.data.type).toBe('single');
    expect(res.body.data.basePrice).toBe(10000);
  });

  it('POST /api/admin/rooms fails for guest', async () => {
    const res = await request(server)
      .post('/api/admin/rooms')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        name: 'Test Room',
        type: 'single',
        description: 'A test room',
        basePrice: 10000,
        maxGuests: 2,
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('GET /api/rooms/:id returns room', async () => {
    const room = await Room.create({
      name: 'Test Room',
      type: 'single',
      description: 'A test room',
      basePrice: 10000,
      maxGuests: 2,
      amenities: ['wifi'],
      photos: [],
      active: true,
    });

    const res = await request(server)
      .get(`/api/rooms/${room._id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Test Room');
  });

  it('GET /api/rooms/:id/unavailable-dates returns dates', async () => {
    const room = await Room.create({
      name: 'Test Room',
      type: 'single',
      description: 'A test room',
      basePrice: 10000,
      maxGuests: 2,
      amenities: ['wifi'],
      photos: [],
      active: true,
    });

    const { checkIn, checkOut } = getFutureDates(1, 30); // 1 day from now, 30 days range

    const res = await request(server)
      .get(`/api/rooms/${room._id}/unavailable-dates`)
      .query({ from: checkIn, to: checkOut });

    expect(res.status).toBe(200);
    expect(res.body.data.unavailableDates).toEqual([]);
  });
});

describe('Booking Endpoints', () => {
  let room;

  const getFutureDates = (daysFromNow = 10, nights = 3) => {
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + daysFromNow);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + nights);
    const formatDate = (d) => d.toISOString().split('T')[0];
    return { checkIn: formatDate(checkIn), checkOut: formatDate(checkOut) };
  };

  beforeEach(async () => {
    room = await Room.create({
      name: 'Test Room',
      type: 'single',
      description: 'A test room',
      basePrice: 10000,
      maxGuests: 2,
      amenities: ['wifi'],
      photos: [],
      active: true,
    });
  });

  it('POST /api/bookings creates booking', async () => {
    const { checkIn, checkOut } = getFutureDates();
    const res = await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        roomId: room._id.toString(),
        checkIn,
        checkOut,
        guests: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.reference).toMatch(/^HB-[A-Z0-9]{6}$/);
    expect(res.body.data.room.id).toBe(room._id.toString());
    expect(res.body.data.totalPrice).toBe(30000); // 3 nights * 10000
    expect(res.body.data.nights).toBe(3);
  });

  it('POST /api/bookings fails with overlapping dates', async () => {
    const { checkIn, checkOut } = getFutureDates();
    // First booking
    await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        roomId: room._id.toString(),
        checkIn,
        checkOut,
        guests: 1,
      });

    // Second booking with overlapping dates
    const { checkIn: checkIn2, checkOut: checkOut2 } = getFutureDates(12, 3); // Overlaps by 1 day
    const res = await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        roomId: room._id.toString(),
        checkIn: checkIn2,
        checkOut: checkOut2,
        guests: 1,
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ROOM_UNAVAILABLE');
  });

  it('GET /api/bookings returns user bookings', async () => {
    const { checkIn, checkOut } = getFutureDates();
    await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        roomId: room._id.toString(),
        checkIn,
        checkOut,
        guests: 1,
      });

    const res = await request(server)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.meta.total).toBe(1);
  });

  it('DELETE /api/bookings/:id cancels booking', async () => {
    const { checkIn, checkOut } = getFutureDates();

    const createRes = await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        roomId: room._id.toString(),
        checkIn,
        checkOut,
        guests: 1,
      });

    const bookingId = createRes.body.data.id;

    const res = await request(server)
      .delete(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${guestToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });
});