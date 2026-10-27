import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['single', 'double', 'deluxe', 'suite'],
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  basePrice: {
    type: Number,
    required: true,
    min: 0,
  },
  maxGuests: {
    type: Number,
    required: true,
    min: 1,
  },
  amenities: {
    type: [String],
    default: [],
  },
  photos: {
    type: [String],
    default: [],
  },
  active: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

roomSchema.index({ active: 1 });
roomSchema.index({ type: 1 });

export const Room = mongoose.model('Room', roomSchema);