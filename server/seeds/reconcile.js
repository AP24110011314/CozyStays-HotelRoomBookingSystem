import 'dotenv/config';
import mongoose from 'mongoose';

import env from '../src/config/env.js';
import { Booking, RoomNight } from '../src/models/index.js';
import { dateRange } from '../src/utils/dates.js';

async function reconcile() {
  await mongoose.connect(env.mongodbUri);
  console.log('Connected to MongoDB');

  // Find all RoomNight entries
  const roomNights = await RoomNight.find({}).lean();
  console.log(`Found ${roomNights.length} RoomNight entries`);

  // Check each RoomNight's booking reference
  let orphaned = 0;
  let fixed = 0;

  for (const rn of roomNights) {
    const booking = await Booking.findById(rn.booking).lean();
    if (!booking) {
      // Booking doesn't exist - this is an orphaned RoomNight
      console.log(`Orphaned RoomNight found: room=${rn.room}, date=${rn.date}, booking=${rn.booking}`);
      await RoomNight.deleteOne({ _id: rn._id });
      orphaned++;
      fixed++;
    } else if (booking.status === 'cancelled') {
      // Booking is cancelled but RoomNight still exists
      console.log(`RoomNight for cancelled booking: room=${rn.room}, date=${rn.date}, booking=${rn.booking}`);
      await RoomNight.deleteOne({ _id: rn._id });
      orphaned++;
      fixed++;
    }
  }

  // Also check for bookings that should have RoomNights but don't
  const bookings = await Booking.find({ status: { $ne: 'cancelled' } }).lean();
  let missingRoomNights = 0;

  for (const booking of bookings) {
    const nights = dateRange(booking.checkIn, booking.checkOut);

    for (const night of nights) {
      const rn = await RoomNight.findOne({ room: booking.room, date: night }).lean();
      if (!rn) {
        console.log(`Missing RoomNight for booking ${booking.reference}: room=${booking.room}, date=${night.toISOString().split('T')[0]}`);
        await RoomNight.create({
          room: booking.room,
          date: night,
          booking: booking._id,
        });
        missingRoomNights++;
        fixed++;
      } else if (!rn.booking.equals(booking._id)) {
        console.log(`RoomNight has wrong booking reference: expected=${booking._id}, actual=${rn.booking}`);
        await RoomNight.updateOne({ _id: rn._id }, { $set: { booking: booking._id } });
        fixed++;
      }
    }
  }

  console.log(`Reconciliation complete:`);
  console.log(`  Orphaned RoomNights removed: ${orphaned}`);
  console.log(`  Missing RoomNights created: ${missingRoomNights}`);
  console.log(`  Total fixes applied: ${fixed}`);

  await mongoose.disconnect();
  process.exit(0);
}

reconcile().catch(err => {
  console.error('Reconcile failed:', err);
  process.exit(1);
});