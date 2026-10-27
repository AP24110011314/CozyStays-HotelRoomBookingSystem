# Database Schema

## Collections

### users
```javascript
{
  _id: ObjectId,
  email: String,           // unique, lowercase, required
  passwordHash: String,    // bcrypt, cost 12, never returned
  name: String,            // required
  role: String,            // 'guest' | 'admin', default 'guest'
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes**: `{ email: 1 }` unique

### rooms
```javascript
{
  _id: ObjectId,
  name: String,            // required
  type: String,            // 'single' | 'double' | 'suite', required
  description: String,     // required
  basePrice: Number,       // required, positive, cents (integer)
  maxGuests: Number,       // required, positive integer
  amenities: [String],     // array of strings, e.g. ['wifi', 'tv', 'ac', 'minibar']
  photos: [String],        // array of URLs
  active: Boolean,         // default true
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes**: `{ active: 1 }`, `{ type: 1 }`

### bookings
```javascript
{
  _id: ObjectId,
  reference: String,       // unique, 'HB-XXXXXX' format
  user: ObjectId,          // ref users, required
  room: ObjectId,          // ref rooms, required
  checkIn: Date,           // UTC date-only (00:00:00.000Z), required
  checkOut: Date,          // UTC date-only, required
  guests: Number,          // required, 1..room.maxGuests
  totalPrice: Number,      // required, cents, server-computed
  status: String,          // derived: 'upcoming' | 'active' | 'completed' | 'cancelled'
  createdAt: Date,
  updatedAt: Date,
  cancelledAt: Date        // set when cancelled
}
```
**Indexes**: `{ user: 1, createdAt: -1 }`, `{ room: 1, checkIn: 1 }`, `{ reference: 1 }` unique, `{ status: 1 }`

**Derived Status Logic** (computed on read, not stored):
- `upcoming`: `now < checkIn`
- `active`: `checkIn <= now < checkOut`
- `completed`: `now >= checkOut` AND `status !== 'cancelled'`
- `cancelled`: explicit cancellation

### room_nights
```javascript
{
  _id: ObjectId,
  room: ObjectId,          // ref rooms, required
  date: Date,              // UTC date-only (00:00:00.000Z), required
  booking: ObjectId        // ref bookings, required
}
```
**Indexes**: `{ room: 1, date: 1 }` **UNIQUE** — this is the concurrency lock

### email_outbox
```javascript
{
  _id: ObjectId,
  to: String,              // required
  subject: String,         // required
  html: String,            // required
  text: String,            // required
  attachments: [{          // optional
    filename: String,
    content: Buffer | String,
    contentType: String
  }],
  status: String,          // 'pending' | 'sending' | 'sent' | 'failed', default 'pending'
  attempts: Number,        // default 0
  maxAttempts: Number,     // default 5
  lastError: String,       // error message from last attempt
  nextRetryAt: Date,       // when to retry next
  lockedAt: Date,          // when claimed by worker
  lockedBy: String,        // worker identifier
  createdAt: Date,
  updatedAt: Date,
  sentAt: Date             // set when sent
}
```
**Indexes**: `{ status: 1, nextRetryAt: 1 }`, `{ lockedAt: 1 }` (for stuck recovery)

## Key Design Decisions

1. **Prices in cents** (integers) — avoids floating-point issues
2. **UTC date-only** — all dates stored as `YYYY-MM-DDT00:00:00.000Z`
3. **RoomNight unique index** — prevents double-booking without transactions
4. **Booking status derived** — single source of truth (dates), no sync issues
5. **EmailOutbox** — decouples email from booking; failure never rolls back
6. **No embedded docs** — RoomNight separate for atomic unique index

## Seed Data Requirements
- 1 admin user
- 2 guest users
- 20 rooms (mix of single/double/suite)
- 8 bookings with corresponding RoomNight rows