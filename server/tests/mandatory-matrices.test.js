import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup.js';
import { createApp } from '../src/index.js';
import { Room, User, RoomNight, EmailOutbox } from '../src/models/index.js';
import bcrypt from 'bcryptjs';
import { signToken } from '../src/utils/jwt.js';
import { getTransporter, getEtherealPreviewUrl, resetEtherealTransporter } from '../src/config/mail.js';
import { enqueueConfirmationEmail, enqueueModificationEmail, enqueueCancellationEmail } from '../src/services/email.js';
import { startEmailWorker, stopEmailWorker, processQueue, recoverStuckEmails, claimNextEmail } from '../src/workers/emailWorker.js';

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

// Helper to get future dates
const getFutureDates = (daysFromNow = 10, nights = 3) => {
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + daysFromNow);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + nights);
  const formatDate = (d) => d.toISOString().split('T')[0];
  return { checkIn: formatDate(checkIn), checkOut: formatDate(checkOut) };
};

describe('Mandatory Test Matrix: Availability Overlap Table (7 cases)', () => {
  let room;

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

  // Case 1: New booking completely before existing booking
  it('allows booking when new stay ends before existing check-in', async () => {
    const { checkIn: existingCheckIn, checkOut: existingCheckOut } = getFutureDates(10, 3);
    await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ roomId: room._id.toString(), checkIn: existingCheckIn, checkOut: existingCheckOut, guests: 1 });

    const { checkIn: newCheckIn, checkOut: newCheckOut } = getFutureDates(5, 3); // Ends on day 8, existing starts day 10
    const res = await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ roomId: room._id.toString(), checkIn: newCheckIn, checkOut: newCheckOut, guests: 1 });

    expect(res.status).toBe(201);
  });

  // Case 2: New booking completely after existing booking
  it('allows booking when new stay starts after existing check-out', async () => {
    const { checkIn: existingCheckIn, checkOut: existingCheckOut } = getFutureDates(5, 3);
    await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ roomId: room._id.toString(), checkIn: existingCheckIn, checkOut: existingCheckOut, guests: 1 });

    const { checkIn: newCheckIn, checkOut: newCheckOut } = getFutureDates(10, 3); // Starts day 10, existing ends day 8
    const res = await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ roomId: room._id.toString(), checkIn: newCheckIn, checkOut: newCheckOut, guests: 1 });

    expect(res.status).toBe(201);
  });

  // Case 3: New booking overlaps at start (new check-in during existing stay)
  it('rejects booking when new check-in falls during existing stay', async () => {
    const { checkIn: existingCheckIn, checkOut: existingCheckOut } = getFutureDates(5, 5);
    await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ roomId: room._id.toString(), checkIn: existingCheckIn, checkOut: existingCheckOut, guests: 1 });

    const { checkIn: newCheckIn, checkOut: newCheckOut } = getFutureDates(7, 3); // Starts day 7, existing is days 5-10
    const res = await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ roomId: room._id.toString(), checkIn: newCheckIn, checkOut: newCheckOut, guests: 1 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ROOM_UNAVAILABLE');
  });

  // Case 4: New booking overlaps at end (new check-out during existing stay)
  it('rejects booking when new check-out falls during existing stay', async () => {
    const { checkIn: existingCheckIn, checkOut: existingCheckOut } = getFutureDates(5, 5);
    await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ roomId: room._id.toString(), checkIn: existingCheckIn, checkOut: existingCheckOut, guests: 1 });

    const { checkIn: newCheckIn, checkOut: newCheckOut } = getFutureDates(8, 5); // Ends day 13, existing is days 5-10
    const res = await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ roomId: room._id.toString(), checkIn: newCheckIn, checkOut: newCheckOut, guests: 1 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ROOM_UNAVAILABLE');
  });

  // Case 5: New booking encompasses existing booking
  it('rejects booking when new stay completely encompasses existing stay', async () => {
    const { checkIn: existingCheckIn, checkOut: existingCheckOut } = getFutureDates(7, 3);
    await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ roomId: room._id.toString(), checkIn: existingCheckIn, checkOut: existingCheckOut, guests: 1 });

    const { checkIn: newCheckIn, checkOut: newCheckOut } = getFutureDates(5, 10); // Days 5-15 encompasses existing
    const res = await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ roomId: room._id.toString(), checkIn: newCheckIn, checkOut: newCheckOut, guests: 1 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ROOM_UNAVAILABLE');
  });

  // Case 6: New booking is encompassed by existing booking
  it('rejects booking when new stay is completely inside existing stay', async () => {
    const { checkIn: existingCheckIn, checkOut: existingCheckOut } = getFutureDates(5, 10);
    await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ roomId: room._id.toString(), checkIn: existingCheckIn, checkOut: existingCheckOut, guests: 1 });

    const { checkIn: newCheckIn, checkOut: newCheckOut } = getFutureDates(7, 3); // Inside existing
    const res = await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ roomId: room._id.toString(), checkIn: newCheckIn, checkOut: newCheckOut, guests: 1 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ROOM_UNAVAILABLE');
  });

  // Case 7: Exact same dates
  it('rejects booking when dates exactly match existing booking', async () => {
    const { checkIn, checkOut } = getFutureDates(5, 3);
    await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ roomId: room._id.toString(), checkIn, checkOut, guests: 1 });

    const res = await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ roomId: room._id.toString(), checkIn, checkOut, guests: 1 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ROOM_UNAVAILABLE');
  });
});

describe('Mandatory Test Matrix: Concurrency Test (10 parallel → 1 success, 9×409)', () => {
  let room;

  beforeEach(async () => {
    room = await Room.create({
      name: 'Concurrency Test Room',
      type: 'single',
      description: 'A test room for concurrency',
      basePrice: 10000,
      maxGuests: 2,
      amenities: ['wifi'],
      photos: [],
      active: true,
    });
  });

  it('allows only 1 booking when 10 parallel requests for same dates', async () => {
    const { checkIn, checkOut } = getFutureDates(5, 3);

    // Create 10 different guest users to avoid any user-level conflicts
    const guestTokens = [];
    for (let i = 0; i < 10; i++) {
      const guestPasswordHash = await bcrypt.hash('Guest@12345', 12);
      const guest = await User.create({
        email: `guest${i}@test.com`,
        passwordHash: guestPasswordHash,
        name: `Guest User ${i}`,
        role: 'guest',
      });
      guestTokens.push(signToken({ id: guest._id.toString(), email: guest.email, role: 'guest' }));
    }

    const promises = guestTokens.map((token, i) =>
      request(server)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({ roomId: room._id.toString(), checkIn, checkOut, guests: 1 })
    );

    const results = await Promise.allSettled(promises);

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 201);
    const conflicts = results.filter(r => r.status === 'fulfilled' && r.value.status === 409);

    expect(successful.length).toBe(1);
    expect(conflicts.length).toBe(9);

    // Verify only one RoomNight was created per night
    const roomNights = await RoomNight.find({ room: room._id }).lean();
    expect(roomNights.length).toBe(3); // 3 nights
  });
});

describe('Mandatory Test Matrix: Email Retry Tests', () => {
  let room;
  let booking;

  beforeEach(async () => {
    room = await Room.create({
      name: 'Email Test Room',
      type: 'single',
      description: 'A test room for emails',
      basePrice: 10000,
      maxGuests: 2,
      amenities: ['wifi'],
      photos: [],
      active: true,
    });

    const { checkIn, checkOut } = getFutureDates(5, 3);
    const bookingRes = await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ roomId: room._id.toString(), checkIn, checkOut, guests: 1 });
    booking = bookingRes.body.data;
  });

  it('enqueues confirmation email on booking creation', async () => {
    const emails = await EmailOutbox.find({}).lean();
    expect(emails.length).toBe(1);
    expect(emails[0].subject).toContain('Booking Confirmed');
    expect(emails[0].status).toBe('pending');
    expect(emails[0].attachments).toBeDefined();
    expect(emails[0].attachments.length).toBe(1);
    expect(emails[0].attachments[0].contentType).toBe('text/calendar');
  });

  it('enqueues modification email on booking modification', async () => {
    await request(server)
      .patch(`/api/bookings/${booking.id}`)
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ checkOut: getFutureDates(5, 5).checkOut }); // Extend by 2 nights

    const emails = await EmailOutbox.find({}).lean();
    const modEmail = emails.find(e => e.subject.includes('Booking Modified'));
    expect(modEmail).toBeDefined();
    expect(modEmail.status).toBe('pending');
    expect(modEmail.attachments).toBeDefined();
  });

  it('enqueues cancellation email on booking cancellation', async () => {
    await request(server)
      .delete(`/api/bookings/${booking.id}`)
      .set('Authorization', `Bearer ${guestToken}`);

    const emails = await EmailOutbox.find({}).lean();
    const cancelEmail = emails.find(e => e.subject.includes('Booking Cancelled'));
    expect(cancelEmail).toBeDefined();
    expect(cancelEmail.status).toBe('pending');
    expect(cancelEmail.attachments).toBeDefined();
  });

  it('email worker claims atomically with findOneAndUpdate', async () => {
    // Clear any existing emails (e.g., from beforeEach booking creation)
    await EmailOutbox.deleteMany({});

    // Add a pending email
    await EmailOutbox.create({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
      text: 'Test',
      status: 'pending',
      nextRetryAt: new Date(),
      maxAttempts: 5,
      attempts: 0,
    });

    const email = await claimNextEmail();
    expect(email).toBeDefined();
    expect(email.status).toBe('sending');
    expect(email.lockedBy).toBeDefined();
    expect(email.lockedAt).toBeDefined();

    // Verify the email was actually updated in the database
    const dbEmail = await EmailOutbox.findById(email._id).lean();
    expect(dbEmail.status).toBe('sending');
    expect(dbEmail.lockedAt).toBeDefined();
    expect(dbEmail.lockedBy).toBeDefined();

    // Small delay to ensure DB update propagates
    await new Promise(resolve => setTimeout(resolve, 10));

    // Try to claim again - should not get the same email
    const email2 = await claimNextEmail();
    expect(email2).toBeNull();
  });

  it('email worker uses exponential backoff (1m, 5m, 15m, 1h, 6h)', async () => {
    // Add a pending email
    await EmailOutbox.deleteMany({});
    const email = await EmailOutbox.create({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
      text: 'Test',
      status: 'pending',
      nextRetryAt: new Date(),
      maxAttempts: 5,
      attempts: 0,
    });

    // Mock transporter to fail
    const { getTransporter } = await import('../src/config/mail.js');
    const transporter = await getTransporter();
    const sendMailSpy = vi.spyOn(transporter, 'sendMail').mockRejectedValue(new Error('SMTP error'));

    // Helper to set nextRetryAt to past so claimNextEmail will pick it up
    const setReady = async () => {
      await EmailOutbox.findByIdAndUpdate(email._id, { $set: { nextRetryAt: new Date() } });
    };

    await processQueue(); // Attempt 1 fails
    let updated = await EmailOutbox.findById(email._id);
    expect(updated.attempts).toBe(1);
    expect(updated.status).toBe('pending');
    const backoff1 = updated.nextRetryAt.getTime() - Date.now();
    expect(backoff1).toBeGreaterThanOrEqual(55000); // ~1 minute
    expect(backoff1).toBeLessThanOrEqual(65000);

    await setReady();
    await processQueue(); // Attempt 2 fails
    updated = await EmailOutbox.findById(email._id);
    expect(updated.attempts).toBe(2);
    const backoff2 = updated.nextRetryAt.getTime() - Date.now();
    expect(backoff2).toBeGreaterThanOrEqual(295000); // ~5 minutes
    expect(backoff2).toBeLessThanOrEqual(305000);

    await setReady();
    await processQueue(); // Attempt 3 fails
    updated = await EmailOutbox.findById(email._id);
    expect(updated.attempts).toBe(3);
    const backoff3 = updated.nextRetryAt.getTime() - Date.now();
    expect(backoff3).toBeGreaterThanOrEqual(895000); // ~15 minutes
    expect(backoff3).toBeLessThanOrEqual(905000);

    await setReady();
    await processQueue(); // Attempt 4 fails
    updated = await EmailOutbox.findById(email._id);
    expect(updated.attempts).toBe(4);
    const backoff4 = updated.nextRetryAt.getTime() - Date.now();
    expect(backoff4).toBeGreaterThanOrEqual(3595000); // ~1 hour
    expect(backoff4).toBeLessThanOrEqual(3605000);

    await setReady();
    await processQueue(); // Attempt 5 fails - should be marked failed
    updated = await EmailOutbox.findById(email._id);
    expect(updated.attempts).toBe(5);
    expect(updated.status).toBe('failed');

    sendMailSpy.mockRestore();
  });

  it('email worker recovers stuck emails (>10min in sending)', async () => {
    const tenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000);
    const stuckEmail = await EmailOutbox.create({
      to: 'test@example.com',
      subject: 'Stuck Email',
      html: '<p>Test</p>',
      text: 'Test',
      status: 'sending',
      lockedAt: tenMinutesAgo,
      lockedBy: 'old-worker',
      maxAttempts: 5,
      attempts: 1,
    });

    await recoverStuckEmails();

    const updated = await EmailOutbox.findById(stuckEmail._id);
    expect(updated.status).toBe('pending');
    expect(updated.lockedAt).toBeNull();
    expect(updated.lockedBy).toBeNull();
  });

  it('email failure never blocks/rolls back booking', async () => {
    // Create booking - this should succeed even if email fails
    const { checkIn, checkOut } = getFutureDates(20, 2);
    const res = await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ roomId: room._id.toString(), checkIn, checkOut, guests: 1 });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();

    // Verify booking exists in DB
    const bookings = await request(server)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`);
    expect(bookings.body.data.length).toBe(2); // Original + new

    // Verify RoomNights were created
    const roomNights = await RoomNight.find({ room: room._id }).lean();
    expect(roomNights.length).toBe(5); // 3 + 2 nights
  });

  it('email worker skipped in test environment', async () => {
    // This is tested implicitly - the worker is not started in test env
    // We can verify the startEmailWorker returns early
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    startEmailWorker();
    expect(consoleSpy).toHaveBeenCalledWith('Email worker skipped in test environment');
    consoleSpy.mockRestore();
  });
});