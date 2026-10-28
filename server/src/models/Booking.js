import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  reference: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  checkIn: {
    type: Date,
    required: true,
  },
  checkOut: {
    type: Date,
    required: true,
  },
  guests: {
    type: Number,
    required: true,
    min: 1,
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['pending_payment', 'confirmed', 'cancelled', 'expired', 'upcoming', 'active', 'completed'],
    default: 'confirmed',
  },
  paymentMethod: {
    type: String,
    enum: ['online', 'pay_at_hotel'],
    default: 'pay_at_hotel',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded', 'pay_at_hotel'],
    default: 'pay_at_hotel',
  },
  holdExpiresAt: {
    type: Date,
    default: null,
  },
  cancelledAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ room: 1, checkIn: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ holdExpiresAt: 1 }, { sparse: true });

export const Booking = mongoose.model('Booking', bookingSchema);