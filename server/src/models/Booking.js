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
    enum: ['upcoming', 'active', 'completed', 'cancelled'],
    default: 'upcoming',
  },
  cancelledAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ room: 1, checkIn: 1 });
bookingSchema.index({ reference: 1 }, { unique: true });
bookingSchema.index({ status: 1 });

export const Booking = mongoose.model('Booking', bookingSchema);