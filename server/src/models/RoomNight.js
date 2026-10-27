import mongoose from 'mongoose';

const roomNightSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
  },
}, {
  timestamps: true,
});

roomNightSchema.index({ room: 1, date: 1 }, { unique: true });

export const RoomNight = mongoose.model('RoomNight', roomNightSchema);