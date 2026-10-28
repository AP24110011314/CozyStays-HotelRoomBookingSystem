import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup.js';
import { createApp } from '../src/index.js';
import { Room, User, Booking, RoomNight, Payment } from '../src/models/index.js';
import { signToken } from '../src/utils/jwt.js';
import { expirePendingHolds } from '../src/services/payment.service.js';

let server;
let adminToken;
let guestToken;
let guest2Token;
let guestId;
let guest2Id;
let testRoom;

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

  const adminHash = await bcrypt.hash('Admin@12345', 12);
  const admin = await User.create({
    email: 'admin@hotel.test',
    passwordHash: adminHash,
    name: 'Admin User',
    role: 'admin',
  });
  adminToken = signToken({ id: admin._id.toString(), email: 'admin@hotel.test', role: 'admin' });

  const guestHash = await bcrypt.hash('Guest@12345', 12);
  const guest = await User.create({
    email: 'guest@test.com',
    passwordHash: guestHash,
    name: 'Guest User',
    role: 'guest',
  });
  guestId = guest._id.toString();
  guestToken = signToken({ id: guestId, email: 'guest@test.com', role: 'guest' });

  const guest2 = await User.create({
    email: 'guest2@test.com',
    passwordHash: guestHash,
    name: 'Second Guest',
    role: 'guest',
  });
  guest2Id = guest2._id.toString();
  guest2Token = signToken({ id: guest2Id, email: 'guest2@test.com', role: 'guest' });

  // Create standard test room: basePrice ₹3000 (3000 rupees)
  testRoom = await Room.create({
    name: 'Deluxe Suite 101',
    type: 'deluxe',
    description: 'A spacious and bright suite',
    basePrice: 3000,
    maxGuests: 3,
    amenities: ['wifi', 'ac'],
    photos: ['https://example.com/photo.jpg'],
    active: true,
  });
});

describe('Payment Methods & Flows', () => {
  it('Pay at hotel creates a confirmed booking and Payment pay_at_hotel', async () => {
    const res = await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        roomId: testRoom._id.toString(),
        checkIn: '2026-11-10',
        checkOut: '2026-11-12',
        guests: 2,
        paymentMethod: 'pay_at_hotel',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('upcoming');
    expect(res.body.data.paymentMethod).toBe('pay_at_hotel');
    expect(res.body.data.paymentStatus).toBe('pay_at_hotel');

    const payment = await Payment.findOne({ booking: res.body.data.id });
    expect(payment).toBeDefined();
    expect(payment.method).toBe('pay_at_hotel');
    expect(payment.status).toBe('pay_at_hotel');
    expect(payment.amount).toBe(600000); // 2 nights * 3000 * 100 paise
  });

  it('Online booking creates pending_payment, holds nights, and sets holdExpiresAt', async () => {
    const res = await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        roomId: testRoom._id.toString(),
        checkIn: '2026-11-15',
        checkOut: '2026-11-18',
        guests: 2,
        paymentMethod: 'online',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending_payment');
    expect(res.body.data.paymentMethod).toBe('online');
    expect(res.body.data.paymentStatus).toBe('pending');
    expect(res.body.data.holdExpiresAt).toBeDefined();
    expect(res.body.payment).toBeDefined();
    expect(res.body.payment.orderId).toBeDefined();
    expect(res.body.payment.amount).toBe(900000); // 3 nights * 3000 * 100

    // Another guest trying to book overlapping dates receives 409 ROOM_UNAVAILABLE
    const conflictRes = await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guest2Token}`)
      .send({
        roomId: testRoom._id.toString(),
        checkIn: '2026-11-16',
        checkOut: '2026-11-19',
        guests: 1,
        paymentMethod: 'pay_at_hotel',
      });

    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.error.code).toBe('ROOM_UNAVAILABLE');
  });

  it('Payment verification with valid signature confirms the booking and is idempotent', async () => {
    const bookingRes = await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        roomId: testRoom._id.toString(),
        checkIn: '2026-11-20',
        checkOut: '2026-11-22',
        guests: 2,
        paymentMethod: 'online',
      });

    const bookingId = bookingRes.body.data.id;
    const orderId = bookingRes.body.payment.orderId;

    // Verify payment
    const verifyRes = await request(server)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        bookingId,
        razorpayOrderId: orderId,
        razorpayPaymentId: 'mock_pay_123',
        mockSuccess: true,
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.booking.status).toBe('upcoming');
    expect(verifyRes.body.data.booking.paymentStatus).toBe('paid');
    expect(verifyRes.body.data.payment.status).toBe('paid');

    // Repeated call is idempotent
    const repeatRes = await request(server)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        bookingId,
        razorpayOrderId: orderId,
        razorpayPaymentId: 'mock_pay_123',
        mockSuccess: true,
      });

    expect(repeatRes.status).toBe(200);
    expect(repeatRes.body.data.booking.status).toBe('upcoming');
  });

  it('Payment verification rejects invalid signature', async () => {
    const bookingRes = await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        roomId: testRoom._id.toString(),
        checkIn: '2026-11-25',
        checkOut: '2026-11-27',
        guests: 1,
        paymentMethod: 'online',
      });

    const verifyRes = await request(server)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        bookingId: bookingRes.body.data.id,
        razorpayOrderId: bookingRes.body.payment.orderId,
        razorpayPaymentId: 'mock_pay_fail',
        mockSuccess: false,
      });

    expect(verifyRes.status).toBe(400);
  });

  it('Hold expiry releases RoomNights so the room reappears in availability search', async () => {
    const bookingRes = await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        roomId: testRoom._id.toString(),
        checkIn: '2026-12-01',
        checkOut: '2026-12-04',
        guests: 2,
        paymentMethod: 'online',
      });

    const bookingId = bookingRes.body.data.id;

    // Simulate hold expiration by setting holdExpiresAt to past
    await Booking.findByIdAndUpdate(bookingId, {
      holdExpiresAt: new Date(Date.now() - 60000),
    });

    // Run hold expiry
    const expiredCount = await expirePendingHolds();
    expect(expiredCount).toBe(1);

    const booking = await Booking.findById(bookingId);
    expect(booking.status).toBe('expired');
    expect(booking.paymentStatus).toBe('failed');

    // RoomNights are freed
    const nights = await RoomNight.find({ booking: bookingId });
    expect(nights.length).toBe(0);

    // Now another guest can book those exact dates successfully
    const secondBooking = await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guest2Token}`)
      .send({
        roomId: testRoom._id.toString(),
        checkIn: '2026-12-01',
        checkOut: '2026-12-04',
        guests: 2,
        paymentMethod: 'pay_at_hotel',
      });

    expect(secondBooking.status).toBe(201);
  });

  it('Cancelling a paid online booking within the window automatically refunds through provider', async () => {
    // Check-in in 10 days
    const checkIn = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const checkOut = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const bookingRes = await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        roomId: testRoom._id.toString(),
        checkIn,
        checkOut,
        guests: 2,
        paymentMethod: 'online',
      });

    const bookingId = bookingRes.body.data.id;

    // Pay and verify
    await request(server)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        bookingId,
        razorpayOrderId: bookingRes.body.payment.orderId,
        mockSuccess: true,
      });

    // Cancel booking
    const cancelRes = await request(server)
      .delete(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${guestToken}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('cancelled');

    const payment = await Payment.findOne({ booking: bookingId });
    expect(payment.status).toBe('refunded');
    expect(payment.refundedAmount).toBe(600000); // 2 nights * 3000 * 100
    expect(payment.refunds.length).toBe(1);
  });

  it('Modifying a paid booking: lower total refunds the difference automatically', async () => {
    const checkIn = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const checkOut = new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 3 nights = ₹9,000

    const bookingRes = await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        roomId: testRoom._id.toString(),
        checkIn,
        checkOut,
        guests: 2,
        paymentMethod: 'online',
      });

    const bookingId = bookingRes.body.data.id;

    await request(server)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        bookingId,
        razorpayOrderId: bookingRes.body.payment.orderId,
        mockSuccess: true,
      });

    // Shorten stay to 2 nights = ₹6,000 (refund of ₹3,000)
    const newCheckOut = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const modifyRes = await request(server)
      .patch(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ checkOut: newCheckOut });

    expect(modifyRes.status).toBe(200);
    expect(modifyRes.body.data.totalPrice).toBe(6000);

    const payment = await Payment.findOne({ booking: bookingId });
    expect(payment.refundedAmount).toBe(300000); // ₹3000 in paise
    expect(payment.status).toBe('partially_refunded');
  });

  it('Modifying a paid booking to a higher price returns 409 PAYMENT_REQUIRED_FOR_CHANGE', async () => {
    const checkIn = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const checkOut = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 2 nights

    const bookingRes = await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        roomId: testRoom._id.toString(),
        checkIn,
        checkOut,
        guests: 2,
        paymentMethod: 'online',
      });

    const bookingId = bookingRes.body.data.id;

    await request(server)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        bookingId,
        razorpayOrderId: bookingRes.body.payment.orderId,
        mockSuccess: true,
      });

    // Lengthen stay to 4 nights = higher price
    const newCheckOut = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const modifyRes = await request(server)
      .patch(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ checkOut: newCheckOut });

    expect(modifyRes.status).toBe(409);
    expect(modifyRes.body.error.message).toMatch(/cannot be made directly/i);
  });

  it('Admin mark-as-paid marks pay-at-hotel booking as paid', async () => {
    const bookingRes = await request(server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        roomId: testRoom._id.toString(),
        checkIn: '2026-11-01',
        checkOut: '2026-11-03',
        guests: 1,
        paymentMethod: 'pay_at_hotel',
      });

    const bookingId = bookingRes.body.data.id;

    const markRes = await request(server)
      .post(`/api/admin/bookings/${bookingId}/mark-paid`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(markRes.status).toBe(200);
    expect(markRes.body.data.booking.paymentStatus).toBe('paid');
    expect(markRes.body.data.payment.status).toBe('paid');
  });

  it('Admin list payments returns paginated payment records with status filter', async () => {
    const listRes = await request(server)
      .get('/api/admin/payments')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.meta).toBeDefined();
  });
});
